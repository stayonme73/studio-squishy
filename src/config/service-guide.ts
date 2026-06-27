import type { ExecutionMode } from "@/catalog/types";

/** Increment when frozen acknowledgment copy changes — stored on approved plan snapshots. */
export const ACKNOWLEDGMENT_VERSION = "1.0" as const;

/**
 * Full acknowledgment stored on approved plan snapshots — legal/business protections preserved.
 * Checkout UI shows plain-language copy; this frozen text is what the record retains.
 */
export const APPROVAL_ACKNOWLEDGMENT_TEXT =
  "I have reviewed my selected Studio Plan, including services, deliverables, exclusions, pricing, billing terms, timelines, and client responsibilities. I understand The Studio does not guarantee business results. I agree to proceed with payment." as const;

/** Customer-facing execution responsibility labels — faithful to catalog execution modes. */
export const EXECUTION_MODE_LABELS: Record<ExecutionMode, string> = {
  creation_delivery:
    "The Studio creates and delivers finished materials for your review and approved use.",
  strategy_direction:
    "The Studio provides strategy and direction; your team applies and executes the work.",
  managed_execution_when_selected:
    "When selected with a matching parent service, The Studio schedules and publishes approved materials on your behalf.",
};

export const SERVICE_GUIDE_COPY = {
  panelTitle: "Service Guide",
  closeLabel: "Close",
  purposeLabel: "Purpose",
  priceLabel: "Price",
  billingLabel: "Billing",
  deliverablesLabel: "Deliverables",
  exclusionsLabel: "Exclusions",
  timingLabel: "Timeline",
  revisionLabel: "Revisions",
  clientResponsibilitiesLabel: "Your Responsibilities",
  executionLabel: "Execution",
  parentServiceLabel: "Requires parent service",
  faqLabel: "FAQ",
  accessRequiredLabel: "Client access required",
  materialsRequiredLabel: "Client materials required",
  viewDetailsLabel: "View service details",
  viewPlanDetailsLabel: "View your selected plan details",
  billingOneTime: "One-time",
  billingMonthly: "Monthly",
} as const;

export const CLIENT_ACCESS_BOILERPLATE =
  "You will provide secure access to the required platform or account before work begins." as const;

export const CLIENT_MATERIALS_BOILERPLATE =
  "You will provide accurate materials, references, and timely feedback when requested." as const;
