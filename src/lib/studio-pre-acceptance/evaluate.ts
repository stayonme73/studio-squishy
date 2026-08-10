import { studioPreAcceptanceV1 } from "@/config/studio-pre-acceptance-v1";

import { evaluateCapabilityForServices } from "./evaluate-capability";
import { evaluateMaterialClarification } from "./evaluate-clarification";
import { evaluateMaterialRiskPolicy } from "./evaluate-risk";
import { evaluateTimingTruth } from "./evaluate-timing";
import { buildPreAcceptanceFactFingerprint } from "./fingerprint";
import type {
  PreAcceptanceDecision,
  PreAcceptanceProjectFacts,
} from "./types";

function newDecisionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `pa-${crypto.randomUUID()}`;
  }
  return `pa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Authoritative pre-acceptance evaluation.
 * Decision Core / system logic decides — Voice only communicates the result.
 */
export function evaluatePreAcceptance(
  facts: PreAcceptanceProjectFacts,
): PreAcceptanceDecision {
  const copy = studioPreAcceptanceV1.customerCopy;
  const fingerprint = buildPreAcceptanceFactFingerprint(facts);
  const capability = evaluateCapabilityForServices(facts.selectedServiceIds);
  const timing = evaluateTimingTruth({
    requestedDeadline: facts.requestedDeadline,
    deadlineStatus: facts.deadlineStatus,
    selectedServiceIds: facts.selectedServiceIds,
  });
  const clarification = evaluateMaterialClarification({
    routeId: facts.routeId,
    selectedServiceIds: facts.selectedServiceIds,
    projectNeed: facts.projectNeed,
  });
  const riskPolicy = evaluateMaterialRiskPolicy(
    facts.riskScanText ?? facts.projectNeed,
  );

  const blockingFacts: string[] = [];
  const nonBlockingFacts: string[] = [];
  const reasons: string[] = [];

  if (capability.verdict === "pass") {
    nonBlockingFacts.push(
      `Capability: all selected services launchable (${capability.weakestDisposition ?? "n/a"}).`,
    );
  } else {
    blockingFacts.push(...capability.reasons);
    reasons.push(...capability.reasons);
  }

  if (timing.verdict === "NO_KNOWN_TIMING_CONFLICT") {
    nonBlockingFacts.push(`Timing: ${timing.reason}`);
  } else {
    blockingFacts.push(timing.reason);
    reasons.push(timing.reason);
  }

  if (clarification.verdict === "sufficient") {
    nonBlockingFacts.push("Material project facts are sufficient to accept.");
  } else {
    blockingFacts.push(...clarification.gaps);
    reasons.push(...clarification.gaps);
  }

  if (riskPolicy.verdict === "clear") {
    nonBlockingFacts.push("No bounded risk/policy hard stop detected.");
  } else {
    blockingFacts.push(...riskPolicy.reasons);
    reasons.push(...riskPolicy.reasons);
  }

  let outcome: PreAcceptanceDecision["outcome"] =
    studioPreAcceptanceV1.outcomes.clearToAccept;
  let customerMessage: string | null = null;
  let voiceLine: string | null = null;
  let escalationTarget: PreAcceptanceDecision["escalationTarget"] = "none";

  // Priority: hard decline → owner policy → clarification → capability decline → clear
  if (riskPolicy.verdict === "decline") {
    outcome = studioPreAcceptanceV1.outcomes.decline;
    customerMessage = copy.declineLead;
    voiceLine = copy.declineVoice;
  } else if (riskPolicy.verdict === "owner_policy_review") {
    outcome = studioPreAcceptanceV1.outcomes.ownerPolicyReview;
    customerMessage = copy.ownerPolicyLead;
    voiceLine = copy.ownerPolicyVoice;
    escalationTarget = "owner_policy";
  } else if (
    clarification.verdict === "material_gap" ||
    timing.verdict === "CLARIFICATION_NEEDED"
  ) {
    outcome = studioPreAcceptanceV1.outcomes.clarificationRequired;
    const detail =
      clarification.customerPrompt ??
      (timing.verdict === "CLARIFICATION_NEEDED" ? timing.reason : copy.clarificationLead);
    customerMessage = `${copy.clarificationLead} ${detail}`;
    voiceLine = `${copy.clarificationVoicePrefix} ${detail}`;
  } else if (
    capability.verdict === "fail" ||
    timing.verdict === "UNSUPPORTED"
  ) {
    outcome = studioPreAcceptanceV1.outcomes.decline;
    customerMessage =
      capability.verdict === "fail"
        ? `${copy.declineLead} ${copy.capabilityUnsupported}`
        : `${copy.declineLead} ${timing.reason}`;
    voiceLine = copy.declineVoice;
  } else {
    outcome = studioPreAcceptanceV1.outcomes.clearToAccept;
    customerMessage = null;
    voiceLine = null;
  }

  const paymentAllowed =
    outcome === studioPreAcceptanceV1.outcomes.clearToAccept;

  return {
    decisionId: newDecisionId(),
    schemaVersion: studioPreAcceptanceV1.decisionSchemaVersion,
    packageId: studioPreAcceptanceV1.packageId,
    draftRevision: facts.draftRevision,
    factFingerprint: fingerprint,
    selectedServiceIds: [...facts.selectedServiceIds],
    routeId: facts.routeId,
    capability: {
      verdict: capability.verdict,
      perSku: capability.perSku,
      weakestDisposition: capability.weakestDisposition,
    },
    timing: {
      verdict: timing.verdict,
      requestedDeadline: facts.requestedDeadline,
      deadlineStatus: facts.deadlineStatus,
      reason: timing.reason,
      requiredMinBusinessDays: timing.requiredMinBusinessDays,
      availableBusinessDays: timing.availableBusinessDays,
      evidenceSource: timing.evidenceSource,
    },
    clarification: {
      verdict: clarification.verdict,
      gaps: clarification.gaps,
      customerPrompt: clarification.customerPrompt,
    },
    riskPolicy: {
      verdict: riskPolicy.verdict,
      reasons: riskPolicy.reasons,
    },
    outcome,
    reasons,
    blockingFacts,
    nonBlockingFacts,
    paymentAllowed,
    escalationTarget,
    customerMessage,
    voiceLine,
    evaluatedAt: new Date().toISOString(),
  };
}
