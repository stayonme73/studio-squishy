/**
 * STUDIO-OPERATING-AUTONOMOUS-PRODUCTION-LOOP-1
 *
 * Machine-owned internal production correction after QA fail.
 * Does not consume customer revision rounds. Does not change refund policy.
 */

export const studioAutonomousProductionLoopV1 = {
  packageId: "STUDIO-OPERATING-AUTONOMOUS-PRODUCTION-LOOP-1",
  schemaVersion: 1 as const,
  room: 4 as const,
  merge: "separately_authorized" as const,
  doNotMerge: true as const,
  skuId: "v2-rtu-flyer" as const,
  productionCapabilityId: "studio_design_renderer" as const,
  ownerRoutineProduction: "NONE" as const,
  customerRevisionPolicyUnchanged: true as const,
  refundPolicyUnchanged: true as const,

  /**
   * Smallest defensible budget: 1 initial production + 2 Machine corrections.
   * One retry proves the conveyor. A second covers stacked independent classes.
   * A fourth attempt would be Scout-style iteration on one artifact.
   */
  maxInternalProductionAttempts: 3 as const,
  maxCorrectionCycles: 2 as const,

  dispositions: {
    inProgress: "in_progress",
    passed: "passed",
    escalated: "escalated",
    failClosed: "fail_closed",
  } as const,

  /**
   * HARDEN #1 — Flyer exhaust is fail-closed / refund, not Owner rescue.
   * Owner does not produce the flyer. Review stays closed.
   */
  ownerEscalation: {
    afterInternalBudgetExhausted: false as const,
    notOnFirstFailure: true as const,
    customerReviewStaysClosed: true as const,
  } as const,

  failClosed: {
    afterInternalBudgetExhausted: true as const,
    customerDisposition: "refund_or_cannot_deliver" as const,
    ownerDoesNotProduceTheFlyer: true as const,
    customerReviewStaysClosed: true as const,
  } as const,
} as const;

export type ProductionFailureClass =
  | "hierarchy_failure"
  | "excessive_dominant_geometry"
  | "hollow_unused_composition"
  | "instructional_copy_leakage"
  | "duplicate_customer_facing_copy"
  | "field_label_leakage"
  | "legibility_failure"
  | "required_content_failure"
  | "technical_render_failure"
  | "derivative_visual_signature"
  | "template_generated_composition"
  | "creatively_insufficient";

export const PRODUCTION_FAILURE_CLASS_STANDARDS: Record<
  ProductionFailureClass,
  string
> = {
  hierarchy_failure:
    "The customer offer must lead. A promotional price may be a primary attention element; contact and supporting lines may not bury the offer.",
  excessive_dominant_geometry:
    "Decorative geometry must not dominate the live area. A legitimate promotional price callout may carry substantial visual weight; reject it only when it overwhelms the composition or damages hierarchy.",
  hollow_unused_composition:
    "Offer regions and live area must be composed from authorized customer content. Decorative occupancy and leftover canvas do not pass. Do not invent filler.",
  instructional_copy_leakage:
    "Intake instructions, job purpose, and production notes must not print as customer-facing copy.",
  duplicate_customer_facing_copy:
    "Customer facts such as phone, website, and price must appear once in their proper role, not repeated as decoration.",
  field_label_leakage:
    "Database/field labels such as phone or web must not print as marketing copy.",
  legibility_failure:
    "Required text must remain unclipped, readable, and inside the canvas.",
  required_content_failure:
    "Required customer facts (offer, price, contact) must be present when the customer supplied them.",
  technical_render_failure:
    "The production capability must emit intact PNG and PDF bytes for the sealed identity.",
  derivative_visual_signature:
    "A new customer may not inherit the visual signature of a previous customer unless the new brief independently supports it. Maya-like navy/gold and centered circular treatment must not be the Studio default.",
  template_generated_composition:
    "Composition must feel designed for this brief. Reject bland or obviously derivative house-plate work even when the file is technically valid.",
  creatively_insufficient:
    "Technically correct is not the bar. Reject work the Studio would not put in front of a paying customer: large regions carrying no subject, text, or light; the visual anchor hidden behind the type; copy that cannot be read at the size it will be used; a composition that ignores the layout family chosen for it. A rejection here is Studio correction and never consumes a customer revision.",
};

export type FlyerReasoningConstraints = {
  capDominantGeometry: boolean;
  tightenComposition: boolean;
  preferOfferLedHierarchy: boolean;
  preferAlternateLayoutFamily?: boolean;
  excludeLayoutFamilyIds?: readonly string[];
};
