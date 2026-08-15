import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";

import { assembleCustomerLifeTruth } from "./assemble-truth";
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
  if (matches(text, ["holding", "stuck", "delay", "waiting on"])) {
    return "holding_up";
  }
  if (matches(text, ["when can i review", "when will i", "review it"])) {
    return "when_review";
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
  if (matches(text, ["which version", "what version did i approve", "approved"])) {
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
      return known(copy.nothingNeededNow);
    case "received_upload":
      if (truth.unusableMaterialCount > 0 && truth.receivedMaterialCount > 0) {
        return known(copy.unusableMaterial);
      }
      return known(truth.receivedMaterialCount > 0 ? copy.uploadReceived : copy.uploadNotFound);
    case "work_started":
      if (truth.activationPendingRetry) return known(copy.recovering);
      return known(truth.productionStarted ? copy.workStarted : copy.workNotStarted);
    case "holding_up":
      if (truth.activationPendingRetry) return known(copy.holdingRecovery);
      if (!truth.intakeComplete) return known(copy.holdingIntake);
      if (truth.blockingMaterialsCount > 0) return known(copy.holdingMaterials);
      if (truth.revisionRequested) return known(copy.holdingRevision);
      if (truth.reviewEligible) return known(copy.holdingReview);
      if (truth.qaPassed && !truth.reviewEligible) return known(copy.holdingQa);
      if (truth.productionStarted) return known(copy.holdingProduction);
      return known(copy.unknownFromRecord);
    case "when_review":
      return known(truth.reviewEligible ? copy.reviewReady : copy.reviewNotReady);
    case "can_changes":
      return known(truth.reviewEligible ? copy.changesYes : copy.changesNotYet);
    case "revisions_left":
      return known(copy.revisionsLeft(truth.revisionAllowanceRemaining, truth.revisionAllowanceIncluded));
    case "received_revision":
      return known(truth.revisionRequested ? copy.revisionReceived : copy.revisionNotReceived);
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
    case "final_files":
      return known(truth.finalDeliveryReady ? copy.finalReady : copy.finalNotReady);
    case "flyer_status": {
      const bits = [
        truth.paymentConfirmed ? "Payment is confirmed." : "Payment is not confirmed.",
        truth.intakeComplete ? "Project Intake is on file." : "Project Intake is still needed.",
        truth.activationPendingRetry
          ? "The Studio is still getting the project ready after payment."
          : null,
        truth.productionStarted ? "Work has started." : "Work has not started.",
        truth.reviewEligible ? "Review is open." : "Review is not open yet.",
      ].filter(Boolean);
      return known(`${copy.flyerStatusPrefix}${bits.join(" ")}`);
    }
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
