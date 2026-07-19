import { beforeEach, describe, expect, it } from "vitest";

import { studioWorkingDraftV1 } from "@/config/studio-working-draft-v1";
import {
  clearWorkingDraft,
  createEmptyWorkingDraft,
  ensureWorkingDraft,
  patchWorkingDraftSlice,
  readWorkingDraft,
  writeWorkingDraft,
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

describe("working draft persist", () => {
  let storage: ReturnType<typeof memoryStorage>;

  beforeEach(() => {
    storage = memoryStorage();
  });

  it("creates and ensures a working draft", () => {
    const draft = ensureWorkingDraft(storage);
    expect(draft.status).toBe("working_draft");
    expect(draft.editable).toBe(true);
    expect(draft.revision).toBe(0);
    expect(readWorkingDraft(storage)?.revision).toBe(0);
  });

  it("rejects stale revisions", () => {
    const draft = ensureWorkingDraft(storage);
    const first = writeWorkingDraft(
      { ...draft, slices: { discoveryAnswers: { "your-focus": "Save time on marketing" } } },
      draft.revision,
      storage,
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const stale = writeWorkingDraft(
      { ...draft, slices: { discoveryAnswers: { "your-focus": "stale" } } },
      draft.revision,
      storage,
    );
    expect(stale.ok).toBe(false);
    if (stale.ok) return;
    expect(stale.reason).toBe("stale_revision");
  });

  it("records attribution on slice patches", () => {
    const draft = ensureWorkingDraft(storage);
    const result = patchWorkingDraftSlice(
      draft,
      "discoveryAnswers",
      { "your-situation": "Starting fresh" },
      {
        actor: "voice",
        summary: "Voice entered Your Situation: Starting fresh",
        actionCode: "discovery.your-situation",
      },
      storage,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.attribution).toHaveLength(1);
    expect(result.draft.attribution[0]?.actor).toBe("voice");
    expect(result.draft.slices.discoveryAnswers).toEqual({
      "your-situation": "Starting fresh",
    });
  });

  it("clears the draft store", () => {
    ensureWorkingDraft(storage);
    expect(storage.dump().has(studioWorkingDraftV1.storageKey)).toBe(true);
    clearWorkingDraft(storage);
    expect(readWorkingDraft(storage)).toBeNull();
  });

  it("createEmptyWorkingDraft starts at revision 0", () => {
    expect(createEmptyWorkingDraft().revision).toBe(0);
  });
});
