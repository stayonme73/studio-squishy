import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  INTAKE_ATTRIBUTION_ACTION,
  diffIntakeAnswers,
  intakeBusinessNameCarryForward,
  intakeSharedBusinessNameKey,
  recordIntakeAnswerChanges,
  recordIntakeSubmission,
} from "@/lib/conversation-room-draft/intake-attribution";
import {
  clearWorkingDraft,
  ensureWorkingDraft,
  readWorkingDraft,
  type WorkingDraftStorage,
} from "@/lib/studio-working-draft";

function memoryStorage(): WorkingDraftStorage & { dump: () => Map<string, string> } {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    dump: () => store,
  };
}

describe("Intake attribution (CR-3)", () => {
  let storage: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    storage = memoryStorage();
    vi.stubGlobal("localStorage", storage);
    clearWorkingDraft(storage);
  });

  it("diffs direct customer edits with previous and new values", () => {
    const changes = diffIntakeAnswers(
      { "shared:businessName": "Old Name" },
      { "shared:businessName": "New Name", "shared:email": "a@b.com" },
    );
    expect(changes).toEqual([
      {
        fieldKey: "shared:businessName",
        previousValue: "Old Name",
        newValue: "New Name",
        kind: "customer-edit",
      },
      {
        fieldKey: "shared:email",
        previousValue: "",
        newValue: "a@b.com",
        kind: "customer-edit",
      },
    ]);
  });

  it("does not emit changes for unchanged values", () => {
    expect(
      diffIntakeAnswers(
        { "shared:phone": "555" },
        { "shared:phone": "555" },
      ),
    ).toEqual([]);
  });

  it("marks opening business-name prefill as system carry-forward once", () => {
    const key = intakeSharedBusinessNameKey();
    const carry = intakeBusinessNameCarryForward("Home Chef");
    const changes = diffIntakeAnswers(null, { [key]: "Home Chef" }, carry);
    expect(changes).toEqual([
      {
        fieldKey: key,
        previousValue: "",
        newValue: "Home Chef",
        kind: "system-carry-forward",
      },
    ]);
    /* Later identical save is not a new change. */
    expect(
      diffIntakeAnswers({ [key]: "Home Chef" }, { [key]: "Home Chef" }, carry),
    ).toEqual([]);
  });

  it("records customer Intake edits into working-draft attribution", () => {
    ensureWorkingDraft(storage);
    const first = recordIntakeAnswerChanges({
      previous: null,
      next: { "shared:email": "owner@studio.test" },
      storage,
    });
    expect(first.ok).toBe(true);
    expect(first.changeCount).toBe(1);
    if (!first.ok) return;

    const event = first.draft.attribution[0];
    expect(event?.actor).toBe("customer");
    expect(event?.initiatedBy).toBe("customer");
    expect(event?.executedBy).toBe("customer");
    expect(event?.actionCode).toBe(
      `${INTAKE_ATTRIBUTION_ACTION.fieldPrefix}shared:email`,
    );
    expect(event?.summary).toContain("shared:email");
    expect(event?.summary).toContain("owner@studio.test");
  });

  it("repeated identical save does not duplicate attribution", () => {
    ensureWorkingDraft(storage);
    const answers = { "shared:materials": "Logo ready" };
    const first = recordIntakeAnswerChanges({
      previous: null,
      next: answers,
      storage,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = recordIntakeAnswerChanges({
      previous: answers,
      next: answers,
      storage,
    });
    expect(second.ok).toBe(true);
    expect(second.changeCount).toBe(0);
    expect(readWorkingDraft(storage)?.attribution).toHaveLength(1);
  });

  it("revising a field appends a meaningful new event", () => {
    ensureWorkingDraft(storage);
    const first = recordIntakeAnswerChanges({
      previous: null,
      next: { "v2-rtu-flyer:offer": "Spring sale" },
      storage,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = recordIntakeAnswerChanges({
      previous: { "v2-rtu-flyer:offer": "Spring sale" },
      next: { "v2-rtu-flyer:offer": "Summer sale" },
      storage,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.changeCount).toBe(1);
    expect(second.draft.attribution).toHaveLength(2);
    expect(second.draft.attribution[1]?.summary).toContain("Spring sale");
    expect(second.draft.attribution[1]?.summary).toContain("Summer sale");
  });

  it("records a distinct submission event with auth and handoff destination", () => {
    ensureWorkingDraft(storage);
    const result = recordIntakeSubmission({
      campaignId: "cmp-1",
      auth: "signed-in",
      destination: "/studio-board",
      requiredSatisfied: true,
      answers: { "shared:businessName": "Home Chef" },
      submittedAt: "2026-07-26T17:00:00.000Z",
      storage,
    });
    expect(result.ok).toBe(true);
    expect(result.duplicated).toBe(false);
    if (!result.ok) return;
    const event = result.draft.attribution.at(-1);
    expect(event?.actionCode).toBe(INTAKE_ATTRIBUTION_ACTION.submitted);
    expect(event?.actor).toBe("customer");
    expect(event?.summary).toContain("signed-in");
    expect(event?.summary).toContain("/studio-board");
    expect(event?.summary).toContain("not payment");
    expect(result.draft.cursor.flowStep).toBe("intake-submitted");
  });

  it("submission attribution is idempotent against double-click / rerender", () => {
    ensureWorkingDraft(storage);
    const input = {
      campaignId: "cmp-1",
      auth: "signed-out" as const,
      destination: "/account-handoff?from=%2Fstudio-board",
      requiredSatisfied: true,
      answers: { "shared:phone": "555" },
      submittedAt: "2026-07-26T17:05:00.000Z",
      storage,
    };
    const first = recordIntakeSubmission(input);
    const second = recordIntakeSubmission(input);
    expect(first.ok && !first.duplicated).toBe(true);
    expect(second.ok && second.duplicated).toBe(true);
    expect(readWorkingDraft(storage)?.attribution).toHaveLength(1);
  });

  it("survives storage re-read (refresh contract)", () => {
    ensureWorkingDraft(storage);
    recordIntakeAnswerChanges({
      previous: null,
      next: { "shared:webOrSocial": "@studio" },
      storage,
    });
    const restored = readWorkingDraft(storage);
    expect(restored?.attribution).toHaveLength(1);
    expect(restored?.attribution[0]?.actionCode).toBe(
      `${INTAKE_ATTRIBUTION_ACTION.fieldPrefix}shared:webOrSocial`,
    );
  });
});
