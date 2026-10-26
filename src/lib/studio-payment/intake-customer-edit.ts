/**
 * Customer-authorized edit to an already submitted Project Intake.
 * Answers change in place with a history row per field. This is not a second
 * submission: submittedAt, activation, and payment truth are untouched.
 */

import type {
  CampaignRecord,
  RouteMapIntakeCustomerEdit,
} from "@/config/studio-board";

export type IntakeCustomerEditInput = {
  answers: Readonly<Record<string, string>>;
  reason: string;
  editedAt?: string;
};

export type IntakeCustomerEditResult =
  | { ok: true; campaign: CampaignRecord; edits: readonly RouteMapIntakeCustomerEdit[] }
  | { ok: false; code: string; message: string };

function productionStarted(campaign: CampaignRecord): boolean {
  return (campaign.dispatchExecution?.designRendererObserver?.results ?? []).some(
    (result) => result.action === "invoked",
  );
}

export function applyIntakeCustomerEdit(
  campaign: CampaignRecord,
  input: IntakeCustomerEditInput,
): IntakeCustomerEditResult {
  const intake = campaign.routeMapIntake;
  if (!intake || !campaign.routeMapIntakeSubmittedAt) {
    return {
      ok: false,
      code: "INTAKE_NOT_SUBMITTED",
      message: "Only a submitted Project Intake can take a customer edit.",
    };
  }
  if (productionStarted(campaign)) {
    return {
      ok: false,
      code: "PRODUCTION_STARTED",
      message: "Production has started. Changes now go through a revision round.",
    };
  }
  if (!input.reason.trim()) {
    return { ok: false, code: "MISSING_REASON", message: "A customer edit needs a reason." };
  }

  const editedAt = input.editedAt ?? new Date().toISOString();
  const answers: Record<string, unknown> = { ...intake.answers };
  const edits: RouteMapIntakeCustomerEdit[] = [];
  for (const [answerKey, raw] of Object.entries(input.answers)) {
    const next = raw.trim();
    if (!answerKey.trim() || !next) {
      return {
        ok: false,
        code: "BLANK_EDIT",
        message: "A customer edit cannot blank an answer or use an empty key.",
      };
    }
    const prior = answers[answerKey];
    const previous = typeof prior === "string" && prior.trim() ? prior : null;
    if (previous === next) continue;
    answers[answerKey] = next;
    edits.push({
      answerKey,
      previous,
      next,
      editedAt,
      authorizedBy: "customer",
      reason: input.reason.trim(),
    });
  }

  if (edits.length === 0) {
    return { ok: true, campaign, edits };
  }

  return {
    ok: true,
    edits,
    campaign: {
      ...campaign,
      routeMapIntake: {
        answers: answers as typeof intake.answers,
        submittedAt: intake.submittedAt,
        customerEdits: [...(intake.customerEdits ?? []), ...edits],
      },
      updatedAt: editedAt,
    },
  };
}
