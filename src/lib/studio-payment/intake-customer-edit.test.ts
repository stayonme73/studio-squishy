import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";

import { applyIntakeCustomerEdit } from "./intake-customer-edit";

const PURPOSE = "social_and_promo_graphics:purpose";
const RIGHTS = "social_and_promo_graphics:rights";
const MUST_KEEP = "social_and_promo_graphics:mustKeep";

function submitted(extra: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "edit-proof",
    routeMapIntakeSubmittedAt: "2026-10-10T08:49:04.923Z",
    routeMapIntake: {
      answers: { [PURPOSE]: "Placeholder theme.", [RIGHTS]: "I have permission." },
      submittedAt: "2026-10-10T08:49:04.923Z",
    },
    ...extra,
  } as unknown as CampaignRecord;
}

describe("applyIntakeCustomerEdit", () => {
  it("replaces answers in place, keeps the submission time, and records history", () => {
    const result = applyIntakeCustomerEdit(submitted(), {
      answers: { [PURPOSE]: "Real theme.", [MUST_KEEP]: "Core message." },
      reason: "Customer replaced the placeholder theme.",
      editedAt: "2026-10-10T10:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const intake = result.campaign.routeMapIntake!;
    expect(intake.submittedAt).toBe("2026-10-10T08:49:04.923Z");
    expect(result.campaign.routeMapIntakeSubmittedAt).toBe("2026-10-10T08:49:04.923Z");
    expect(intake.answers).toEqual({
      [PURPOSE]: "Real theme.",
      [RIGHTS]: "I have permission.",
      [MUST_KEEP]: "Core message.",
    });
    expect(intake.customerEdits).toEqual([
      expect.objectContaining({ answerKey: PURPOSE, previous: "Placeholder theme.", next: "Real theme.", authorizedBy: "customer" }),
      expect.objectContaining({ answerKey: MUST_KEEP, previous: null, next: "Core message." }),
    ]);
  });

  it("is a no-op when the answer already matches", () => {
    const campaign = submitted();
    const result = applyIntakeCustomerEdit(campaign, {
      answers: { [PURPOSE]: "Placeholder theme." },
      reason: "Same words.",
    });
    expect(result.ok && result.edits.length === 0 && result.campaign === campaign).toBe(true);
  });

  it("refuses an unsubmitted intake, a blank answer, and edits after production started", () => {
    const unsubmitted = { campaignId: "x" } as unknown as CampaignRecord;
    expect(applyIntakeCustomerEdit(unsubmitted, { answers: { [PURPOSE]: "A" }, reason: "r" })).toMatchObject({
      ok: false,
      code: "INTAKE_NOT_SUBMITTED",
    });
    expect(applyIntakeCustomerEdit(submitted(), { answers: { [PURPOSE]: "  " }, reason: "r" })).toMatchObject({
      ok: false,
      code: "BLANK_EDIT",
    });
    const started = submitted({
      dispatchExecution: {
        designRendererObserver: { results: [{ action: "invoked" }] },
      },
    } as unknown as Partial<CampaignRecord>);
    expect(applyIntakeCustomerEdit(started, { answers: { [PURPOSE]: "A" }, reason: "r" })).toMatchObject({
      ok: false,
      code: "PRODUCTION_STARTED",
    });
  });
});
