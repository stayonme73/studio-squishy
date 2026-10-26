import { SOURCE_AUDIO_CUSTOMER_NOTICE } from "@/config/studio-source-audio-preflight-v1";
import { studioCustomerLifeV1 } from "@/config/studio-customer-life-v1";
import { studioVoiceLaunchBlockerHardeningV1 as harden } from "@/config/studio-voice-launch-blocker-hardening-v1";

import { assembleCustomerLifeTruth } from "./assemble-truth";
import { summarizeCustomerLifeStatus } from "./summarize-status";
import type {
  CustomerLifeAnswer,
  CustomerLifeInput,
  CustomerLifeQuestionIntent,
} from "./types";
import { answerCondensedLaunchVoice } from "./condensed-launch-voice";
import {
  answerPricingFromShelf,
  answerScopeFromShelf,
  answerServiceFitFromShelf,
  findPublicShelfService,
} from "./voice-shelf-truth";

function matches(text: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => text.includes(pattern));
}

export function classifyCustomerLifeQuestion(question: string): CustomerLifeQuestionIntent {
  const text = question.trim().toLowerCase();
  if (!text) return "unknown";
  if (matches(text, ["refund", "money back", "want my money"])) {
    return "refund";
  }
  if (matches(text, ["complaint", "complain", "file a complaint"])) {
    return "complaint";
  }
  if (
    matches(text, [
      "isn't what i asked",
      "isn’t what i asked",
      "not what i asked",
      "not what i wanted",
      "i'm not happy",
      "im not happy",
      "this is wrong",
      "this isn’t what",
      "this isn't what",
    ])
  ) {
    return "dissatisfaction";
  }
  if (
    matches(text, [
      "returning customer",
      "welcome back",
      "i already have a project",
      "i have an account",
      "i'm a returning",
      "im a returning",
    ])
  ) {
    return "returning_customer";
  }
  if (
    matches(text, [
      "which service",
      "which one do i need",
      "what do i need",
      "don't know which",
      "dont know which",
      "don’t know which",
      "not sure which",
    ])
  ) {
    return "service_fit";
  }
  if (
    matches(text, [
      "how much",
      "what does it cost",
      "what's the price",
      "whats the price",
      "cost me",
      "pricing",
    ])
  ) {
    return "pricing";
  }
  if (
    matches(text, [
      "what exactly am i getting",
      "what's included",
      "whats included",
      "what am i getting",
      "what's in scope",
      "whats in scope",
    ])
  ) {
    return "scope";
  }
  if (
    matches(text, [
      "source audio",
      "source recording",
      "background noise",
      "audio quality",
    ])
  ) {
    return "source_quality";
  }
  if (matches(text, ["payment", "paid", "pay go through", "charged"])) {
    return "payment";
  }
  if (matches(text, ["receive my revision", "got my revision", "receive my change"])) {
    return "received_revision";
  }
  if (matches(text, ["did you make my", "made my change", "requested change", "make my requested"])) {
    return "revision_applied";
  }
  if (
    matches(text, [
      "need anything else",
      "need anything from me",
      "do you need",
      "still don’t have",
      "still don't have",
      "don't have the photo",
      "dont have the photo",
      "don't have my photo",
      "dont have my photo",
      "haven't sent",
      "havent sent",
      "missing material",
    ])
  ) {
    return "need_anything";
  }
  if (matches(text, ["receive my upload", "receive my file", "get my file", "get my upload", "did you get my file"])) {
    return "received_upload";
  }
  if (matches(text, ["revision"])) {
    if (matches(text, ["receive", "got my", "did you get"])) return "received_revision";
    if (matches(text, ["left", "how many", "remaining"])) return "revisions_left";
    if (matches(text, ["ready", "new version"])) return "new_version_ready";
    return "can_changes";
  }
  if (
    matches(text, [
      "when will you start",
      "when will production start",
      "when do you start",
      "when will you begin",
    ])
  ) {
    return "when_start";
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
  if (
    matches(text, [
      "holding",
      "stuck",
      "delay",
      "waiting on",
      "still waiting",
      "why is it waiting",
      "why hasn't",
      "why hasnt",
    ])
  ) {
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
  if (
    matches(text, [
      "ask for change",
      "make change",
      "changes after",
      "revision round",
      "change something",
      "can i change",
    ])
  ) {
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
  if (matches(text, ["final file", "download", "finished file", "where are my", "where are my files"])) {
    return "final_files";
  }
  if (
    matches(text, [
      "flyer",
      "status",
      "what is happening",
      "what's happening",
      "whats happening",
      "what's going on",
      "whats going on",
      "my order",
      "order status",
    ])
  ) {
    return "flyer_status";
  }
  if (findPublicShelfService(text)) {
    return "service_fit";
  }
  return "unknown";
}

function unknownText(input: CustomerLifeInput, paymentConfirmed: boolean): string {
  if (!input.campaign && !input.account?.signedIn) {
    return harden.unknownSignedOutNoProject;
  }
  if (!input.campaign || !paymentConfirmed) {
    return studioCustomerLifeV1.customerCopy.unknownFromRecordPrePay;
  }
  return studioCustomerLifeV1.customerCopy.unknownFromRecord;
}

function sourceQualityText(input: CustomerLifeInput): string {
  const outcome = input.campaign?.sourceAudioPreflight?.outcome;
  if (outcome === "PASS") return harden.sourceQualityPass;
  if (outcome === "NOTICE_AND_CHOICE") return SOURCE_AUDIO_CUSTOMER_NOTICE;
  if (outcome === "REPLACEMENT_REQUIRED") return harden.sourceQualityReplacement;
  return harden.sourceQualityUnknown;
}

function returningText(input: CustomerLifeInput, statusText: string): string {
  if (!input.account?.signedIn) return harden.returningSignedOut;
  if (!input.campaign) return harden.returningNoOpenProject;
  const name = input.account.preferredName?.trim();
  const greet = name
    ? `${harden.returningWelcomePrefix} ${name}.`
    : harden.returningWelcomePrefix;
  return `${greet} ${statusText}`;
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
    source: input.campaign ? "machine_record" : "none",
  });

  const launchVoice = answerCondensedLaunchVoice(question);
  if (launchVoice) return known(launchVoice);

  switch (intent) {
    case "service_fit":
      return known(answerServiceFitFromShelf(question));
    case "pricing":
      return known(answerPricingFromShelf(question, input.campaign));
    case "scope":
      return known(answerScopeFromShelf(question, input.campaign));
    case "source_quality":
      return known(sourceQualityText(input));
    case "dissatisfaction":
      return known(input.campaign ? harden.dissatisfactionAck : harden.ownerJudgmentNoProject);
    case "complaint":
      return known(input.campaign ? harden.complaintAck : harden.ownerJudgmentNoProject);
    case "refund":
      return known(input.campaign ? harden.refundAck : harden.ownerJudgmentNoProject);
    case "returning_customer":
      return known(
        returningText(
          input,
          input.campaign ? summarizeCustomerLifeStatus(truth) : harden.returningNoOpenProject,
        ),
      );
    default:
      break;
  }

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
      if (!truth.paymentConfirmed) return known(harden.materialsLaterPrePay);
      if (!truth.intakeComplete) return known(copy.intakeNeeded);
      if (truth.blockingMaterialsCount > 0) return known(copy.materialsNeeded);
      if (truth.unusableMaterialCount > 0) return known(copy.unusableMaterial);
      if (truth.phase === "awaiting_production_slot") return known(copy.nothingNeededInLine);
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
        truth.spineStatus === "building_concepts" ||
        truth.reviewEligible ||
        truth.revisionRequested ||
        truth.finalDeliveryReady ||
        truth.phase === "approved"
      ) {
        return known(copy.workStarted);
      }
      if (truth.phase === "awaiting_production_slot") return known(copy.workWaitingForSlot);
      if (truth.activationPendingRetry) return known(copy.recovering);
      return known(copy.workNotStarted);
    case "when_start":
      if (truth.reviewEligible || truth.finalDeliveryReady || truth.phase === "approved") {
        return known(copy.holdingReview);
      }
      if (!truth.intakeComplete) return known(copy.holdingIntake);
      if (truth.blockingMaterialsCount > 0) return known(copy.holdingMaterials);
      if (truth.phase === "awaiting_production_slot") return known(copy.whenStartInLine);
      if (truth.productionStarted || truth.spineStatus === "building_concepts") {
        return known(copy.whenStartAlreadyStarted);
      }
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
      if (truth.phase === "awaiting_production_slot") {
        return known(copy.holdingProductionSlot);
      }
      if (truth.activationPendingRetry && !truth.productionStarted) {
        return known(copy.holdingRecovery);
      }
      if (truth.productionStarted || truth.spineStatus === "building_concepts") {
        return known(copy.holdingProduction);
      }
      return known(unknownText(input, truth.paymentConfirmed));
    case "when_review":
      if (truth.reviewEligible) return known(copy.reviewReady);
      if (truth.phase === "awaiting_production_slot") return known(copy.whenStartInLine);
      return known(copy.reviewNotReady);
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
      if (!truth.approvedVersionLabel && !truth.approvedContentSha256) {
        return known(copy.approvedVersionUnknown);
      }
      if (truth.approvedVersionLabel && /^Version\s+\d+$/i.test(truth.approvedVersionLabel)) {
        return known(copy.approvedVersion(truth.approvedVersionLabel));
      }
      return known(copy.approvedVersionUnlabeled);
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
        text: unknownText(input, truth.paymentConfirmed),
        known: false,
        phase: truth.phase,
        source: "machine_record",
      };
  }
}
