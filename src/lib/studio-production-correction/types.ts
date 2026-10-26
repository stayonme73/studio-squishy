/**
 * STUDIO-OPERATING-AUTONOMOUS-PRODUCTION-LOOP-1
 * Structured correction brief — class failures and standards, not a hand layout.
 */

import {
  PRODUCTION_FAILURE_CLASS_STANDARDS,
  studioAutonomousProductionLoopV1,
  type FlyerReasoningConstraints,
  type ProductionFailureClass,
} from "@/config/studio-autonomous-production-loop-v1";
import type { DesignQualityFinding } from "@/lib/studio-kitchen-production/design-quality";

export type ProductionCorrectionFinding = {
  id: string;
  failureClass: ProductionFailureClass;
  message: string;
  source: "creative_quality" | "technical_qa" | "render";
};

export type ProductionCorrectionBrief = {
  packageId: typeof studioAutonomousProductionLoopV1.packageId;
  briefId: string;
  fingerprint: string;
  sourceAttemptNumber: number;
  failureClasses: readonly ProductionFailureClass[];
  findings: readonly ProductionCorrectionFinding[];
  requiredStandards: readonly string[];
  constraints: FlyerReasoningConstraints;
  preserveCustomerFacts: true;
  doNotInventCustomerFacts: true;
  createdAt: string;
};

export type InternalProductionLoopOrigin =
  | "initial_production"
  | "studio_quality_correction"
  | "technical_recovery";

export type InternalProductionAttemptTrigger =
  | "initial_dispatch"
  | "qa_correction"
  | "studio_quality_correction";

export type InternalProductionAttemptRecord = {
  attemptNumber: number;
  triggeredBy: InternalProductionAttemptTrigger;
  productionCapabilityId: typeof studioAutonomousProductionLoopV1.productionCapabilityId;
  correctionBriefId: string | null;
  correctionBriefFingerprint: string;
  renderVersion: number | null;
  pngContentSha256: string | null;
  qaResult: "pass" | "fail" | "not_run";
  failureClasses: readonly ProductionFailureClass[];
  failureCode: string | null;
  message: string | null;
  startedAt: string;
  completedAt: string;
};

export type InternalProductionLoopRecord = {
  packageId: typeof studioAutonomousProductionLoopV1.packageId;
  skuId: typeof studioAutonomousProductionLoopV1.skuId;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  /**
   * Why this loop exists. Distinct from customer revisionRoundsUsed.
   * Missing on loops written before Studio-quality-correction accounting.
   */
  origin?: InternalProductionLoopOrigin;
  status: "in_progress" | "passed" | "escalated" | "fail_closed";
  maxAttempts: typeof studioAutonomousProductionLoopV1.maxInternalProductionAttempts;
  attempts: readonly InternalProductionAttemptRecord[];
  /**
   * Index in `attempts` where the *current* production sequence begins.
   *
   * `attempts` is the job's whole history. Before this field existed, every count that
   * meant "how far into this production run are we" read `attempts.length`, so a run
   * inherited the attempts of sequences that had already finished. That had three
   * consequences, all of them a legitimate fresh production being treated as a retry of
   * an old one: the creative reasoner was skipped, the correction budget was spent before
   * the run began, and a single failure could escalate on an inherited count.
   *
   * A finished sequence keeps its attempts — they are the evidence of what was produced —
   * and a new sequence simply starts counting from where it began.
   *
   * Absent on records written before this existed, which reads as 0 and reproduces the
   * old counting exactly. Only a deliberate `beginNewAttemptSequence` moves it.
   */
  sequenceStartedAtAttempt?: number;
  briefs: readonly ProductionCorrectionBrief[];
  activeBrief: ProductionCorrectionBrief | null;
  ownerEscalation: {
    required: true;
    reason: string;
    at: string;
    failureClasses: readonly ProductionFailureClass[];
  } | null;
  /**
   * Flyer LIGHT harden: budget exhaust refunds / cannot-deliver.
   * Owner rescue is not the completion path.
   */
  failClosed?: {
    required: true;
    customerDisposition: "refund_or_cannot_deliver";
    reason: string;
    at: string;
    failureClasses: readonly ProductionFailureClass[];
  } | null;
  settledConstraints: FlyerReasoningConstraints | null;
  settledBriefFingerprint: string | null;
  productionFactFingerprint: string | null;
  updatedAt: string;
};

export function emptyFlyerReasoningConstraints(): FlyerReasoningConstraints {
  return {
    capDominantGeometry: false,
    tightenComposition: false,
    preferOfferLedHierarchy: false,
    preferAlternateLayoutFamily: false,
    excludeLayoutFamilyIds: [],
  };
}

/**
 * Carry every constraint forward. A constraint left out here is silently forgotten
 * on the next attempt: the loop settles constraints between attempts, so an
 * instruction that survives only the first pass is an instruction the reasoner
 * stops hearing exactly when the correction is being retried. Layout-family
 * exclusions accumulate rather than replace — a family already rejected does not
 * become acceptable again because a later attempt failed for another reason.
 */
export function mergeFlyerReasoningConstraints(
  current: FlyerReasoningConstraints | null | undefined,
  next: FlyerReasoningConstraints,
): FlyerReasoningConstraints {
  const base = current ?? emptyFlyerReasoningConstraints();
  return {
    capDominantGeometry: base.capDominantGeometry || next.capDominantGeometry,
    tightenComposition: base.tightenComposition || next.tightenComposition,
    preferOfferLedHierarchy:
      base.preferOfferLedHierarchy || next.preferOfferLedHierarchy,
    preferAlternateLayoutFamily: Boolean(
      base.preferAlternateLayoutFamily || next.preferAlternateLayoutFamily,
    ),
    excludeLayoutFamilyIds: [
      ...new Set([
        ...(base.excludeLayoutFamilyIds ?? []),
        ...(next.excludeLayoutFamilyIds ?? []),
      ]),
    ],
  };
}

export function constraintsFromBrief(
  brief: ProductionCorrectionBrief | null | undefined,
): FlyerReasoningConstraints {
  return brief?.constraints ?? emptyFlyerReasoningConstraints();
}

export function classifyFindingId(id: string): ProductionFailureClass {
  if (
    id === "instructional_purpose_on_art" ||
    id === "headline_is_intake_purpose" ||
    id.startsWith("generic_placeholder")
  ) {
    return "instructional_copy_leakage";
  }
  if (
    id === "duplicate_phone" ||
    id === "duplicate_web" ||
    id === "duplicate_headline_cta" ||
    id === "redundant_price_representation"
  ) {
    return "duplicate_customer_facing_copy";
  }
  if (id === "field_label_leak") return "field_label_leakage";
  if (
    id === "derivative_visual_signature" ||
    id === "maya_like_default"
  ) {
    return "derivative_visual_signature";
  }
  if (
    id === "template_generated_composition" ||
    id === "tiny_body_copy" ||
    id === "stale_creative_direction" ||
    id.startsWith("layout_family_")
  ) {
    return "template_generated_composition";
  }
  // Technically correct, creatively insufficient — the Creative Director's own
  // verdict, whether it came from measurement or from the vision pass.
  if (
    id === "composed_dead_canvas_region" ||
    id === "composed_unfinished_below_lockup" ||
    id === "subject_obscured_by_type_plate" ||
    id === "creatively_insufficient" ||
    id === "creative_director_rejected_creatively_insufficient"
  ) {
    return "creatively_insufficient";
  }
  if (id.startsWith("body_copy_")) return "legibility_failure";
  if (
    id === "price_outranks_offer" ||
    id === "offer_buried" ||
    id === "offer_price_ungrouped" ||
    id === "missing_offer_panel" ||
    id === "missing_no_photo_hero" ||
    id === "underscaled_promotional_price"
  ) {
    return "hierarchy_failure";
  }
  if (id === "excessive_dominant_geometry") {
    return "excessive_dominant_geometry";
  }
  if (
    id === "top_heavy_composition" ||
    id === "unfinished_lower_canvas" ||
    id === "accidental_dead_space" ||
    id === "words_on_background" ||
    id === "hollow_offer_panel" ||
    id === "hollow_field_plate" ||
    id === "dead_space_occupancy" ||
    id === "content_disproportionate_format" ||
    id === "identity_offer_ungrouped" ||
    id.startsWith("unused_space_")
  ) {
    return "hollow_unused_composition";
  }
  if (
    id === "required_text" ||
    id.startsWith("missing_required") ||
    id.startsWith("campaign_truth")
  ) {
    return "required_content_failure";
  }
  if (id.includes("overflow") || id.includes("clip") || id === "legibility") {
    return "legibility_failure";
  }
  return "required_content_failure";
}

export function classifyPipelineFailureCode(
  failureCode: string | undefined,
): ProductionFailureClass {
  if (
    failureCode === "RENDER_FAILURE" ||
    failureCode === "EXPORT_FAILURE" ||
    failureCode === "BROKEN_ASSET_REFERENCE" ||
    failureCode === "PARTIAL_RENDER_STATE"
  ) {
    return "technical_render_failure";
  }
  if (failureCode === "COLLISION" || failureCode === "OVERLAP") {
    return "hollow_unused_composition";
  }
  if (failureCode === "QA_FAILURE") return "hierarchy_failure";
  return "required_content_failure";
}

export function classifyQualityFindings(
  findings: readonly DesignQualityFinding[],
): ProductionCorrectionFinding[] {
  return findings
    .filter((finding) => finding.severity === "fail")
    .map((finding) => ({
      id: finding.id,
      failureClass: classifyFindingId(finding.id),
      message: finding.message,
      source:
        finding.checkKind === "creative_quality" ? "creative_quality" : "technical_qa",
    }));
}

export function constraintsForClasses(
  classes: readonly ProductionFailureClass[],
): FlyerReasoningConstraints {
  const set = new Set(classes);
  return {
    capDominantGeometry: set.has("excessive_dominant_geometry"),
    tightenComposition:
      set.has("hollow_unused_composition") ||
      set.has("excessive_dominant_geometry") ||
      set.has("creatively_insufficient"),
    preferOfferLedHierarchy:
      set.has("hierarchy_failure") ||
      set.has("instructional_copy_leakage") ||
      set.has("duplicate_customer_facing_copy") ||
      set.has("field_label_leakage"),
    preferAlternateLayoutFamily:
      set.has("derivative_visual_signature") ||
      set.has("template_generated_composition") ||
      set.has("hollow_unused_composition") ||
      set.has("creatively_insufficient"),
    excludeLayoutFamilyIds: [],
  };
}

export function uniqueClasses(
  findings: readonly ProductionCorrectionFinding[],
): ProductionFailureClass[] {
  return [...new Set(findings.map((finding) => finding.failureClass))];
}
