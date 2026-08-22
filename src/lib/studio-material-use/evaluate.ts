import {
  studioMaterialUseV1,
  type MaterialUseAuthorizationBasis,
  type StudioMaterialUseOutcome,
} from "@/config/studio-material-use-v1";
import type { CampaignMaterialItem, MaterialCategory } from "@/lib/materials/types";
import {
  isCustomerContentClearedForProduction,
  requiresContentCertificationGate,
} from "@/lib/studio-customer-content-intake";

import type {
  MaterialUseAuthorization,
  MaterialUseBlockCode,
  MaterialUseDecision,
} from "./types";

const CLEARANCE_REQUIRED = new Set<string>(
  studioMaterialUseV1.clearanceRequiredCategories,
);

const HARD_BLOCK_PATTERNS: readonly RegExp[] = [
  /\bi\s+do\s+not\s+(own|have)\s+(rights?|permission|license)/i,
  /\bunauthorized\s+(use|copy|asset)/i,
  /\bstolen\s+(image|photo|logo|asset)/i,
  /\bno\s+permission\s+to\s+use/i,
  /\bdo\s+not\s+have\s+(a\s+)?license/i,
];

const OWNER_POLICY_PATTERNS: readonly RegExp[] = [
  /\btrademark\b.*\b(unclear|unsure|maybe|unknown)/i,
  /\b(unsure|not\s+sure|unclear).*\b(permission|rights?|license|ownership)/i,
  /\blikeness\b.*\b(privacy|consent|permission)/i,
  /\bconflicting\s+(ownership|rights?)/i,
];

function newDecisionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `mu-${crypto.randomUUID()}`;
  }
  return `mu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function categoryRequiresUseClearance(category: MaterialCategory): boolean {
  return CLEARANCE_REQUIRED.has(category);
}

export function scanMaterialText(item: CampaignMaterialItem): string {
  return [item.label, item.text, item.fileName, item.url, item.teamNote]
    .filter(Boolean)
    .join("\n");
}

/**
 * Content identity for the material payload currently on the ledger item.
 * Replacement of fileName/url/text/size must invalidate a prior APPROVED_FOR_USE.
 */
export function buildMaterialContentFingerprint(item: CampaignMaterialItem): string {
  const storage =
    item.storageRef && "reference" in item.storageRef
      ? String(item.storageRef.reference ?? "")
      : item.storageRef && "objectPath" in item.storageRef
        ? String(item.storageRef.objectPath ?? "")
        : "";
  const payload = [
    item.fileName?.trim() ?? "",
    item.url?.trim() ?? "",
    item.text?.trim() ?? "",
    item.mimeType?.trim() ?? "",
    item.sizeBytes != null ? String(item.sizeBytes) : "",
    storage,
  ].join("|");
  let h = 2166136261;
  for (let i = 0; i < payload.length; i += 1) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `mcf:${(h >>> 0).toString(16)}`;
}

export function priorApprovalMatchesCurrentContent(item: CampaignMaterialItem): boolean {
  const prior = item.useDecision?.contentFingerprint?.trim();
  if (!prior) return false;
  return prior === buildMaterialContentFingerprint(item);
}

function customerPromptForCategory(category: MaterialCategory): string {
  if (category === "logo-brand") return studioMaterialUseV1.customerCopy.logoOwnership;
  if (category === "photo-video") return studioMaterialUseV1.customerCopy.photoOwnership;
  return studioMaterialUseV1.customerCopy.brandPermission;
}

function hasRoutineClearBasis(basis: MaterialUseAuthorizationBasis | null | undefined): boolean {
  return (
    basis === "customer_owns" ||
    basis === "customer_has_permission" ||
    basis === "studio_generated" ||
    basis === "studio_controlled_licensed" ||
    basis === "provider_licensed"
  );
}

function isStudioSourced(item: CampaignMaterialItem): boolean {
  const basis = item.useAuthorization?.basis;
  if (basis === "studio_generated" || basis === "studio_controlled_licensed" || basis === "provider_licensed") {
    return true;
  }
  const role = item.submittedBy?.role;
  return role === "staff" || role === "owner";
}

/**
 * Bounded per-material use decision.
 * Operational clearance — not a claim of legal ownership certainty.
 */
export function evaluateMaterialUseDecision(input: {
  item: CampaignMaterialItem;
  campaignId: string;
  evaluatedAt?: string;
  decisionId?: string;
}): MaterialUseDecision {
  const { item } = input;
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const blockCodes: MaterialUseBlockCode[] = [];
  const reasons: string[] = [];
  let customerPrompt: string | null = null;
  let escalationTarget: MaterialUseDecision["escalationTarget"] = "none";
  let outcome: StudioMaterialUseOutcome =
    studioMaterialUseV1.outcomes.approvedForUse;

  const push = (code: MaterialUseBlockCode, reason: string) => {
    if (!blockCodes.includes(code)) blockCodes.push(code);
    reasons.push(reason);
  };

  const scan = scanMaterialText(item);
  const hardHit = HARD_BLOCK_PATTERNS.some((pattern) => pattern.test(scan));
  const policyHit = OWNER_POLICY_PATTERNS.some((pattern) => pattern.test(scan));
  const contentFingerprint = buildMaterialContentFingerprint(item);
  const contentReplaced =
    item.reviewStatus === "approved_for_use" &&
    item.useDecision?.outcome === "APPROVED_FOR_USE" &&
    !priorApprovalMatchesCurrentContent(item);

  if (item.reviewStatus === "not_needed") {
    return {
      decisionId: input.decisionId ?? newDecisionId(),
      schemaVersion: studioMaterialUseV1.decisionSchemaVersion,
      packageId: studioMaterialUseV1.packageId,
      materialId: item.id,
      campaignId: input.campaignId,
      category: item.category,
      outcome: studioMaterialUseV1.outcomes.approvedForUse,
      authorizationBasis: item.useAuthorization?.basis ?? "studio_controlled_licensed",
      contentFingerprint,
      blockCodes: [],
      reasons: ["Material marked not needed for production."],
      customerPrompt: null,
      escalationTarget: "none",
      evaluatedAt,
    };
  }

  if (item.reviewStatus === "blocked_from_use" || item.useHold === "blocked_from_use") {
    push("blocked", studioMaterialUseV1.staffCopy.blocked);
    outcome = studioMaterialUseV1.outcomes.blockedFromUse;
  } else if (
    item.reviewStatus === "owner_policy_review" ||
    item.useHold === "owner_policy_review"
  ) {
    push("owner_policy_pending", studioMaterialUseV1.staffCopy.ownerPolicyPending);
    outcome = studioMaterialUseV1.outcomes.ownerPolicyReview;
    escalationTarget = "owner_policy";
  } else if (hardHit) {
    push("hard_block_signal", studioMaterialUseV1.staffCopy.hardBlockSignal);
    outcome = studioMaterialUseV1.outcomes.blockedFromUse;
  } else if (contentReplaced) {
    // Photo A approved must not authorize photo B on the same material id.
    push("content_replaced", studioMaterialUseV1.staffCopy.contentReplaced);
    outcome = studioMaterialUseV1.outcomes.clarificationRequired;
    customerPrompt = customerPromptForCategory(item.category);
  } else if (item.reviewStatus === "needs_clarification") {
    push("clarification_pending", studioMaterialUseV1.staffCopy.clarificationPending);
    outcome = studioMaterialUseV1.outcomes.clarificationRequired;
    customerPrompt = customerPromptForCategory(item.category);
  } else if (item.clientAvailability === "not_available_yet") {
    // Client marked material unavailable — do not treat as cleared for use.
    push("not_submitted", "Customer indicated this material is not available yet.");
    outcome = studioMaterialUseV1.outcomes.clarificationRequired;
    customerPrompt = customerPromptForCategory(item.category);
  } else if (
    item.reviewStatus === "missing" ||
    item.reviewStatus === "requested" ||
    (!item.submittedAt && item.reviewStatus !== "approved_for_use")
  ) {
    push("not_submitted", "Required material has not been submitted yet.");
    outcome = studioMaterialUseV1.outcomes.clarificationRequired;
    customerPrompt = customerPromptForCategory(item.category);
  } else if (item.reviewStatus === "approved_for_use") {
    outcome = studioMaterialUseV1.outcomes.approvedForUse;
  } else if (!categoryRequiresUseClearance(item.category)) {
    // Low-friction categories: submission is enough for operational use.
    outcome = studioMaterialUseV1.outcomes.approvedForUse;
  } else if (isStudioSourced(item) || hasRoutineClearBasis(item.useAuthorization?.basis)) {
    if (policyHit && !isStudioSourced(item)) {
      push("owner_policy_pending", studioMaterialUseV1.staffCopy.ownerPolicyPending);
      outcome = studioMaterialUseV1.outcomes.ownerPolicyReview;
      escalationTarget = "owner_policy";
    } else {
      outcome = studioMaterialUseV1.outcomes.approvedForUse;
    }
  } else if (policyHit) {
    push("owner_policy_pending", studioMaterialUseV1.staffCopy.ownerPolicyPending);
    outcome = studioMaterialUseV1.outcomes.ownerPolicyReview;
    escalationTarget = "owner_policy";
  } else {
    // Clearance-required + submitted without usable authorization basis.
    push("missing_authorization", studioMaterialUseV1.staffCopy.submittedNotCleared);
    push("submitted_not_cleared", studioMaterialUseV1.staffCopy.submittedNotCleared);
    outcome = studioMaterialUseV1.outcomes.clarificationRequired;
    customerPrompt = customerPromptForCategory(item.category);
  }

  return {
    decisionId: input.decisionId ?? newDecisionId(),
    schemaVersion: studioMaterialUseV1.decisionSchemaVersion,
    packageId: studioMaterialUseV1.packageId,
    materialId: item.id,
    campaignId: input.campaignId,
    category: item.category,
    outcome,
    authorizationBasis: item.useAuthorization?.basis ?? null,
    contentFingerprint,
    blockCodes,
    reasons,
    customerPrompt,
    escalationTarget,
    evaluatedAt,
  };
}

export function isApprovedForUse(decision: MaterialUseDecision): boolean {
  return decision.outcome === studioMaterialUseV1.outcomes.approvedForUse;
}

export function materialBlocksProductionUse(item: CampaignMaterialItem, campaignId: string): boolean {
  if (item.requirementLevel !== "required") return false;
  if (item.reviewStatus === "not_needed") return false;
  if (requiresContentCertificationGate(item) && !isCustomerContentClearedForProduction(item)) {
    return true;
  }
  return !isApprovedForUse(evaluateMaterialUseDecision({ item, campaignId }));
}

export function buildUseAuthorization(input: {
  basis: MaterialUseAuthorizationBasis;
  attestedAt?: string;
  attestedBy?: MaterialUseAuthorization["attestedBy"];
  statement?: string;
}): MaterialUseAuthorization {
  return {
    basis: input.basis,
    attestedAt: input.attestedAt ?? new Date().toISOString(),
    attestedBy: input.attestedBy,
    statement: input.statement?.trim() || undefined,
  };
}

/**
 * After submit/review, stamp durable useDecision and auto-promote clear cases.
 */
export function applyMaterialUseDecisionToItem(input: {
  item: CampaignMaterialItem;
  campaignId: string;
  evaluatedAt?: string;
}): CampaignMaterialItem {
  const decision = evaluateMaterialUseDecision({
    item: input.item,
    campaignId: input.campaignId,
    evaluatedAt: input.evaluatedAt,
  });

  let reviewStatus = input.item.reviewStatus;
  if (
    decision.outcome === studioMaterialUseV1.outcomes.approvedForUse &&
    input.item.clientAvailability !== "not_available_yet" &&
    (reviewStatus === "submitted" || reviewStatus === "needs_clarification")
  ) {
    // Routine clear: promote to approved_for_use without Owner.
    reviewStatus = "approved_for_use";
  }
  if (
    decision.blockCodes.includes("content_replaced") &&
    reviewStatus === "approved_for_use"
  ) {
    // Prior approval invalidated — require re-clearance for the new payload.
    reviewStatus = "needs_clarification";
  }

  return {
    ...input.item,
    reviewStatus,
    useDecision: {
      decisionId: decision.decisionId,
      outcome: decision.outcome,
      authorizationBasis: decision.authorizationBasis,
      contentFingerprint: decision.contentFingerprint,
      packageId: decision.packageId,
      schemaVersion: decision.schemaVersion,
      evaluatedAt: decision.evaluatedAt,
      customerPrompt: decision.customerPrompt,
      escalationTarget: decision.escalationTarget,
      reasons: decision.reasons,
    },
  };
}

export function listProductionBlockingMaterials(
  items: readonly CampaignMaterialItem[],
  campaignId: string,
): CampaignMaterialItem[] {
  return items.filter((item) => materialBlocksProductionUse(item, campaignId));
}

export function jobHasUnresolvedMaterialUseHold(
  items: readonly CampaignMaterialItem[],
  campaignId: string,
  skuId: string,
): boolean {
  return items.some(
    (item) =>
      item.relatedServiceIds.includes(skuId as never) &&
      materialBlocksProductionUse(item, campaignId),
  );
}
