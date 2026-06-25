/**
 * Studio Services — discovery catalog (Phase A scaffold).
 * Need → deliverable mapping and add-on definitions only.
 * NO prices — pricing lives in a separate config, applied at Payment.
 *
 * @see docs/discovery-studio-redesign-proposal.md
 */

/** Customer-facing outcome bubbles (Decision 2) */
export type StudioNeedId =
  | "get-more-customers"
  | "better-branding"
  | "create-content"
  | "improve-communication"
  | "better-business-systems"
  | "workflow-improvements"
  | "better-customer-experience";

/** Deliverable lines that appear in Your Project Includes */
export type StudioDeliverableId =
  | "campaign-creation"
  | "brand-messaging"
  | "marketing-graphics"
  | "social-media-content"
  | "email-campaign"
  | "sms-messaging"
  | "video-scripts"
  | "marketing-calendar"
  | "campaign-planning";

/** Opt-in add-ons for You May Also Like */
export type AddOnId =
  | "email-marketing"
  | "sms-campaign"
  | "business-workflow"
  | "customer-follow-up"
  | "monthly-support";

export type StudioNeed = {
  id: StudioNeedId;
  label: string;
};

export type StudioDeliverable = {
  id: StudioDeliverableId;
  label: string;
};

export type StudioAddOn = {
  id: AddOnId;
  label: string;
};

/** Stable display order for unioned deliverables in Project Summary */
export const STUDIO_DELIVERABLE_ORDER: readonly StudioDeliverableId[] = [
  "campaign-creation",
  "brand-messaging",
  "marketing-graphics",
  "social-media-content",
  "email-campaign",
  "sms-messaging",
  "video-scripts",
  "marketing-calendar",
  "campaign-planning",
] as const;

export const studioNeeds: readonly StudioNeed[] = [
  { id: "get-more-customers", label: "Get More Customers" },
  { id: "better-branding", label: "Better Branding" },
  { id: "create-content", label: "Create Content" },
  { id: "improve-communication", label: "Improve Communication" },
  { id: "better-business-systems", label: "Better Business Systems" },
  { id: "workflow-improvements", label: "Workflow Improvements" },
  { id: "better-customer-experience", label: "Better Customer Experience" },
] as const;

export const studioDeliverables: readonly StudioDeliverable[] = [
  { id: "campaign-creation", label: "Campaign Creation" },
  { id: "brand-messaging", label: "Brand Messaging" },
  { id: "marketing-graphics", label: "Marketing Graphics" },
  { id: "social-media-content", label: "Social Media Content" },
  { id: "email-campaign", label: "Email Campaign" },
  { id: "sms-messaging", label: "SMS Messaging" },
  { id: "video-scripts", label: "Video Scripts" },
  { id: "marketing-calendar", label: "Marketing Calendar" },
  { id: "campaign-planning", label: "Campaign Planning" },
] as const;

export const studioAddOns: readonly StudioAddOn[] = [
  { id: "email-marketing", label: "Email Marketing" },
  { id: "sms-campaign", label: "SMS Campaign" },
  { id: "business-workflow", label: "Business Workflow" },
  { id: "customer-follow-up", label: "Customer Follow-Up" },
  { id: "monthly-support", label: "Monthly Support" },
] as const;

/**
 * Deterministic need → deliverable mapping.
 * Source of truth for projectIncludes — no AI.
 */
export const NEED_TO_DELIVERABLES: Record<StudioNeedId, readonly StudioDeliverableId[]> = {
  "get-more-customers": ["campaign-creation", "email-campaign", "sms-messaging"],
  "better-branding": ["campaign-creation", "brand-messaging", "marketing-graphics"],
  "create-content": ["social-media-content", "video-scripts"],
  "improve-communication": ["email-campaign", "sms-messaging"],
  "better-business-systems": ["marketing-calendar", "campaign-planning"],
  "workflow-improvements": ["marketing-calendar"],
  "better-customer-experience": ["email-campaign", "sms-messaging", "social-media-content"],
} as const;

/** Add-on → deliverable promotion when customer opts in */
export const ADD_ON_TO_DELIVERABLES: Partial<Record<AddOnId, readonly StudioDeliverableId[]>> = {
  "email-marketing": ["email-campaign"],
  "sms-campaign": ["sms-messaging"],
  "business-workflow": ["campaign-planning"],
} as const;

const deliverableById = new Map(studioDeliverables.map((d) => [d.id, d]));
const needById = new Map(studioNeeds.map((n) => [n.id, n]));

export function labelForNeed(id: StudioNeedId): string {
  return needById.get(id)?.label ?? id;
}

export function labelForDeliverable(id: StudioDeliverableId): string {
  return deliverableById.get(id)?.label ?? id;
}

/** Union deliverables from selected needs, stable order */
export function deliverablesFromNeeds(needs: readonly StudioNeedId[]): StudioDeliverableId[] {
  const seen = new Set<StudioDeliverableId>();
  const result: StudioDeliverableId[] = [];

  for (const deliverableId of STUDIO_DELIVERABLE_ORDER) {
    for (const needId of needs) {
      if (NEED_TO_DELIVERABLES[needId]?.includes(deliverableId) && !seen.has(deliverableId)) {
        seen.add(deliverableId);
        result.push(deliverableId);
        break;
      }
    }
  }

  return result;
}
