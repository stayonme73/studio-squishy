import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { classifyCustomerLifeQuestion } from "@/lib/studio-customer-life/answer-question";
import { REFUND_VOICE_INPUT_REJECTED_PROMPT } from "@/lib/campaign-tasks/refund-request-routing";
import {
  COORDINATOR_SYSTEM_USER,
  coordinateClientEvent,
  createCoordinatorSession,
} from "@/studio-coordinator";
import type { CoordinatorExecutionState } from "@/studio-coordinator/types";

import {
  approvedComplaintSay,
  approvedRefundSay,
  unattachedComplaintSay,
  unattachedOwnerSay,
} from "./fallback";

export type StudioVoiceEscalationProof = {
  kind:
    | "none"
    | "refund_submitted"
    | "refund_voice_rejected"
    | "refund_intake_required"
    | "refund_unattached"
    | "complaint_recorded"
    | "complaint_unattached";
  written: boolean;
  /** When set, these words are spoken instead of a model reply. */
  say: string | null;
  interaction: {
    id: string;
    status: string;
    interactionKind: string;
    clientMessage: string;
    campaignId: string;
    jobId: string;
    requestedOutcome: string | null;
  } | null;
  exception: {
    id: string;
    status: string;
    kind: string;
    title: string;
    campaignId: string;
  } | null;
  determination: string | null;
  humanReviewRequired: boolean | null;
};

function emptyProof(
  kind: StudioVoiceEscalationProof["kind"],
  say: string | null,
): StudioVoiceEscalationProof {
  return {
    kind,
    written: false,
    say,
    interaction: null,
    exception: null,
    determination: null,
    humanReviewRequired: null,
  };
}

/** Reason and outcome must be the customer's own words. Nothing is invented. */
export function refundIntakeFromCustomerWords(question: string): {
  reason?: string;
  requestedOutcome?: string;
} {
  const reasonMatch = question.match(/\bthe reason is\s+(.+?)(?:\.\s*the outcome\b|$)/i);
  const outcomeMatch = question.match(/\bthe outcome i want is\s+(.+?)\.?\s*$/i);
  const reason = reasonMatch?.[1]?.trim().replace(/[.]+$/, "");
  const requestedOutcome = outcomeMatch?.[1]?.trim().replace(/[.]+$/, "");
  return {
    reason: reason || undefined,
    requestedOutcome: requestedOutcome || undefined,
  };
}

function assignmentsFor(campaignId: string): CampaignAssignmentsFile {
  return {
    staffByUserId: {
      [COORDINATOR_SYSTEM_USER.id]: [campaignId],
    },
    staffCapabilities: {
      [COORDINATOR_SYSTEM_USER.id]: ["producer_dispatcher"],
    },
  };
}

/**
 * Complaint and refund go through the existing coordinator.
 * Voice acknowledges. Voice does not decide. Spoken refunds are not submitted.
 * The public HTTP route never passes a project. Tests pass a synthetic one.
 */
export function escalateStudioVoiceRequest(input: {
  question: string;
  inputMode: "text" | "voice";
  state?: CoordinatorExecutionState;
  now?: string;
}): StudioVoiceEscalationProof {
  const intent = classifyCustomerLifeQuestion(input.question);
  if (intent !== "refund" && intent !== "complaint") return emptyProof("none", null);

  if (!input.state) {
    if (intent === "refund" && input.inputMode === "voice") {
      return emptyProof("refund_voice_rejected", REFUND_VOICE_INPUT_REJECTED_PROMPT);
    }
    return emptyProof(
      intent === "refund" ? "refund_unattached" : "complaint_unattached",
      intent === "refund" ? unattachedOwnerSay() : unattachedComplaintSay(),
    );
  }

  if (intent === "refund" && input.inputMode === "voice") {
    const occurredAt = input.now ?? new Date().toISOString();
    const result = coordinateClientEvent(
      {
        type: "refund_request",
        campaignId: input.state.campaign.campaignId,
        jobId: input.state.jobs[0]?.jobId,
        occurredAt,
        facts: { message: input.question, inputMode: "voice" },
      },
      input.state,
      createCoordinatorSession(),
      {
        user: COORDINATOR_SYSTEM_USER,
        assignments: assignmentsFor(input.state.campaign.campaignId),
      },
    );
    const wrote = result.state.envelope.ownerDecisionInteractions?.some(
      (entry) => entry.interactionKind === "refund_request" && entry.status === "waiting_owner",
    );
    return {
      ...emptyProof("refund_voice_rejected", REFUND_VOICE_INPUT_REJECTED_PROMPT),
      written: Boolean(wrote),
      determination: result.outcome.determination,
      humanReviewRequired: result.outcome.humanReviewRequired,
    };
  }

  const intake = refundIntakeFromCustomerWords(input.question);
  const occurredAt = input.now ?? new Date().toISOString();
  const jobId = input.state.jobs[0]?.jobId;
  const result = coordinateClientEvent(
    {
      type: intent === "refund" ? "refund_request" : "complaint",
      campaignId: input.state.campaign.campaignId,
      jobId,
      occurredAt,
      facts: {
        message: input.question,
        inputMode: input.inputMode,
        reason: intake.reason,
        requestedOutcome: intake.requestedOutcome,
      },
    },
    input.state,
    createCoordinatorSession(),
    {
      user: COORDINATOR_SYSTEM_USER,
      assignments: assignmentsFor(input.state.campaign.campaignId),
    },
  );

  const interaction = result.state.envelope.ownerDecisionInteractions?.find(
    (entry) => entry.interactionKind === "refund_request" && entry.status === "waiting_owner",
  );
  const exception = result.state.envelope.exceptionRecords?.find(
    (entry) => entry.kind === "client_request" && entry.status === "waiting_owner",
  );

  if (intent === "refund" && interaction) {
    return {
      kind: "refund_submitted",
      written: true,
      say: approvedRefundSay(),
      interaction: {
        id: interaction.id,
        status: interaction.status,
        interactionKind: interaction.interactionKind,
        clientMessage: interaction.clientMessage,
        campaignId: interaction.campaignId,
        jobId: interaction.jobId ?? "",
        requestedOutcome: interaction.refundSnapshot?.requestedOutcome ?? null,
      },
      exception: null,
      determination: result.outcome.determination,
      humanReviewRequired: result.outcome.humanReviewRequired,
    };
  }

  if (intent === "complaint" && exception) {
    return {
      kind: "complaint_recorded",
      written: true,
      say: approvedComplaintSay(),
      interaction: null,
      exception: {
        id: exception.id,
        status: exception.status,
        kind: exception.kind,
        title: exception.title,
        campaignId: exception.campaignId,
      },
      determination: result.outcome.determination,
      humanReviewRequired: result.outcome.humanReviewRequired,
    };
  }

  const intakeMessage =
    typeof result.outcome.payload?.squishyMessage === "string"
      ? result.outcome.payload.squishyMessage
      : intent === "refund"
        ? unattachedOwnerSay()
        : unattachedComplaintSay();

  return {
    kind: intent === "refund" ? "refund_intake_required" : "complaint_unattached",
    written: false,
    say: intakeMessage,
    interaction: null,
    exception: null,
    determination: result.outcome.determination,
    humanReviewRequired: result.outcome.humanReviewRequired,
  };
}
