import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";

import { assembleCustomerLifeTruth } from "./assemble-truth";
import { summarizeCustomerLifeStatus } from "./summarize-status";
import type {
  CustomerLifeAnswer,
  CustomerLifeInput,
  CustomerLifeQuestionIntent,
} from "./types";

function matches(text: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

export function classifyCustomerLifeQuestion(question: string): CustomerLifeQuestionIntent {
  const text = question.trim().toLowerCase();
  if (!text) return "unknown";
  if (matches(text, ["payment", "paid", "pay go through", "charged", "money"])) {
    return "payment";
  }
  if (matches(text, ["receive my revision", "got my revision", "receive my change"])) {
    return "received_revision";
  }
  if (matches(text, ["did you make my", "made my change", "requested change", "make my requested"])) {
    return "revision_applied";
  }
  if (matches(text, ["need anything else", "need anything from me", "do you need"])) {
    return "need_anything";
  }
  if (matches(text, ["receive my upload", "receive my file", "get my file", "get my upload", "did you get my file"])) {
    return "received_upload";
  }
  if (matches(text, ["revision"])) {
    if (matches(text, ["receive", "got my", "did you get"])) return "received_revision";
    if (matches(text, ["left", "how many", "remaining"])) return "revisions_left";
    if (matches(text, ["ready", "new version"])) return "new_version_ready";
  }
  if (matches(text, ["work started", "anyone started", "has work started", "started working"])) {
    return "work_started";
  }
  if (matches(text, ["assigned", "who is working", "production team"])) {
    return "production_assigned";
  }
  if (matches(text, ["qa happen", "has qa", "quality check", "internal quality"])) {
    return "qa_status";
  }
  if (matches(text, ["holding", "stuck", "delay", "waiting on"])) {
    return "holding_up";
  }
  if (
    matches(text, [
      "when can i review",
      "when will i",
      "review it",
      "ready for me to review",
      "ready to review",
      "ready for review",
    ])
  ) {
    return "when_review";
  }
  if (matches(text, ["which version am i looking", "what version am i looking", "which version is this", "what version is this"])) {
    return "current_review_version";
  }
  if (matches(text, ["ask for change", "make change", "changes after", "revision round"])) {
    return "can_changes";
  }
  if (matches(text, ["how many change", "how many revision"])) {
    return "revisions_left";
  }
  if (matches(text, ["new version ready", "revised", "updated version"])) {
    return "new_version_ready";
  }
  if (text.includes("approval") || matches(text, ["which version", "what version did i approve", "approved"])) {
    return "which_version_approved";
  }
  if (matches(text, ["final file", "download", "finished file", "where are my"])) {
    return "final_files";
  }
  if (matches(text, ["flyer", "status", "what is happening", "what's happening"])) {
    return "flyer_status";
  }
  return "unknown";
}

export function answerCustomerLifeQuestion(
  question: string,
  input: CustomerLifeInput,
): CustomerLifeAnswer {
  const copy = studioCustomerLifeV1.customerCopy;
  const truth = assembleCustomerLifeTruth(input);
  const intent = classifyCustomerLifeQuestion(question);

  const known = (text: string): CustomerLifeAnswer => ({
    intent,
    text,
    known: true,
    phase: truth.phase,
    source: "machine_record",
  });

  if (!input.campaign) {
    return {
      intent,
      text: copy.noProjectYet,
      known: false,
      phase: "no_project",
      source: "none",
    };
  }

  switch (intent) {
    case "payment":
      return known(truth.paymentConfirmed ? copy.paymentConfirmed : copy.paymentNotConfirmed);
    case "need_anything":
      if (!truth.paymentConfirmed) return known(copy.paymentNotConfirmed);
      if (!truth.intakeComplete) return known(copy.intakeNeeded);
      if (truth.blockingMaterialsCount > 0) return known(copy.materialsNeeded);
      if (truth.unusableMaterialCount > 0) return known(copy.unusableMaterial);
      return known(copy.nothingNeededNow);
    case "received_upload":
      if (truth.unusableMaterialCount > 0 && truth.receivedMaterialCount > 0) {
        return known(copy.unusableMaterial);
      }
      if (truth.storedNotApprovedCount > 0) {
        return known(copy.uploadReceivedPendingUse);
      }
      if (truth.approvedForUseCount > 0) {
        return known(copy.uploadApprovedForUse);
      }
      return known(copy.uploadNotFound);
    case "work_started":
      if (
        truth.productionStarted ||
        truth.reviewEligible ||
        truth.revisionRequested ||
        truth.finalDeliveryReady ||
        truth.phase === "approved"
      ) {
        return known(copy.workStarted);
      }
      if (truth.activationPendingRetry) return known(copy.recovering);
      return known(copy.workNotStarted);
    case "holding_up":
      if (truth.finalDeliveryReady || truth.phase === "approved") {
        return known(copy.holdingReview);
      }
      if (truth.reviewEligible) return known(copy.holdingReview);
      if (truth.revisionRequested) return known(copy.holdingRevision);
      if (!truth.intakeComplete) return known(copy.holdingIntake);
      if (truth.blockingMaterialsCount > 0) return known(copy.holdingMaterials);
      if (truth.unusableMaterialCount > 0) return known(copy.unusableMaterial);
      if (truth.qaState === "failed" || truth.qaState === "blocked") {
        return known(copy.holdingQa);
      }
      if (truth.qaPassed && !truth.reviewEligible) return known(copy.holdingQa);
      if (truth.activationPendingRetry && !truth.productionStarted) {
        return known(copy.holdingRecovery);
      }
      if (truth.productionStarted) return known(copy.holdingProduction);
      return known(copy.unknownFromRecord);
    case "when_review":
      return known(truth.reviewEligible ? copy.reviewReady : copy.reviewNotReady);
    case "can_changes":
      return known(truth.reviewEligible ? copy.changesYes : copy.changesNotYet);
    case "revisions_left":
      return known(copy.revisionsLeft(truth.revisionAllowanceRemaining, truth.revisionAllowanceIncluded));
    case "received_revision":
      return known(
        truth.revisionRequested ||
          truth.revisionChangeApplied === true ||
          truth.revisionAllowanceRemaining < truth.revisionAllowanceIncluded
          ? copy.revisionReceived
          : copy.revisionNotReceived,
      );
    case "new_version_ready":
      return known(
        truth.reviewEligible && truth.revisionAllowanceIncluded >= 0 && truth.spineStatus === "ready_for_review"
          ? copy.newVersionReady
          : copy.newVersionNotReady,
      );
    case "which_version_approved":
      if (!truth.approvedContentSha256 && !truth.approvedVersionLabel) {
        return known(copy.approvedVersionUnknown);
      }
      return known(
        `${copy.approvedVersion} Recorded identity: ${truth.approvedVersionLabel ?? "pinned file"} (${truth.approvedContentSha256 ?? "hash on file"}).`,
      );
    case "current_review_version":
      if (!truth.currentReviewVersionLabel) {
        return known(copy.currentReviewVersionUnknown);
      }
      return known(copy.currentReviewVersion(truth.currentReviewVersionLabel));
    case "revision_applied":
      if (truth.revisionChangeApplied === true) {
        return known(copy.revisionApplied);
      }
      if (truth.revisionRequested) {
        return known(copy.revisionReceivedNotReady);
      }
      return known(copy.revisionChangeUnknown);
    case "final_files":
      return known(truth.finalDeliveryReady ? copy.finalReady : copy.finalNotReady);
    case "production_assigned":
      return known(truth.productionAssigned ? copy.productionAssigned : copy.productionNotAssigned);
    case "qa_status":
      if (truth.qaState === "passed") return known(copy.qaPassed);
      if (truth.qaState === "failed" || truth.qaState === "blocked") return known(copy.qaFailed);
      return known(copy.qaNotRecorded);
    case "flyer_status":
      return known(summarizeCustomerLifeStatus(truth));
    default:
      return {
        intent: "unknown",
        text: copy.unknownFromRecord,
        known: false,
        phase: truth.phase,
        source: "machine_record",
      };
  }
}
