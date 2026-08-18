import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";
import type { OwnerDeskItem } from "@/lib/job-control/owner-desk";

/**
 * Authoritative stall-cause labels drawn from existing exception kinds and
 * Owner desk reasons. Do not invent causes the Machine does not already hold.
 */
export type OwnerStallCauseCategory =
  | "waiting_on_customer"
  | "waiting_on_production"
  | "qa_failed_correction_pending"
  | "tool_provider_retry"
  | "communication_failed"
  | "policy_exception_requires_owner"
  | "customer_requested_outside_scope";

export type OwnerStallCause = {
  category: OwnerStallCauseCategory;
  label: string;
};

const EXCEPTION_STALL_CAUSE: Partial<Record<CampaignExceptionKind, OwnerStallCause>> = {
  compliance_hold: {
    category: "policy_exception_requires_owner",
    label: "Policy hold — Owner must clear or redirect before production continues.",
  },
  direction_disagreement: {
    category: "policy_exception_requires_owner",
    label: "Brand-direction exception — Owner must confirm which direction stands.",
  },
  scope_change: {
    category: "customer_requested_outside_scope",
    label: "Customer requested something outside the purchased scope.",
  },
  pricing_exception: {
    category: "policy_exception_requires_owner",
    label: "Pricing exception — Owner must judge the quoted or purchased amount before work continues.",
  },
  deadline_commitment: {
    category: "policy_exception_requires_owner",
    label: "Deadline commitment needs Owner judgment before the Studio promises a date.",
  },
  deadline_risk: {
    category: "policy_exception_requires_owner",
    label: "Deadline is at risk — Owner must decide how the Studio proceeds.",
  },
  revision_exhausted: {
    category: "policy_exception_requires_owner",
    label: "Revision allowance is exhausted — this is a boundary or goodwill judgment.",
  },
  client_request: {
    category: "waiting_on_customer",
    label: "Studio cannot ask the customer until Owner approves the client-facing wording.",
  },
  missing_client_fact: {
    category: "waiting_on_customer",
    label: "Work is waiting on customer information.",
  },
  routine_internal: {
    category: "waiting_on_production",
    label: "Internal team follow-up — not an Owner decision.",
  },
};

const DESK_STALL_CAUSE: Record<OwnerDeskItem["reason"], OwnerStallCause> = {
  approval_before_review: {
    category: "qa_failed_correction_pending",
    label: "Production asked for Owner support before client review.",
  },
  approval_before_delivery: {
    category: "policy_exception_requires_owner",
    label: "Final delivery is gated until Owner releases the package.",
  },
  deadline_exception: {
    category: "policy_exception_requires_owner",
    label: "Deadline exception — Owner must commit or redirect.",
  },
  scope_issue: {
    category: "customer_requested_outside_scope",
    label: "Scope issue — Owner must approve or decline the change.",
  },
  revision_limit_reached: {
    category: "policy_exception_requires_owner",
    label: "Revision boundary reached — Owner judgment required.",
  },
  at_risk_job: {
    category: "policy_exception_requires_owner",
    label: "This work is at risk against the customer deadline.",
  },
  heavy_lane_full: {
    category: "waiting_on_production",
    label: "Heavy production lane is at capacity — Owner must choose bump or wait.",
  },
  refund_eligible: {
    category: "policy_exception_requires_owner",
    label: "Refund request — Owner must approve, deny, or ask for more information.",
  },
  client_complaint: {
    category: "policy_exception_requires_owner",
    label: "Customer complaint — Owner must choose the Studio response.",
  },
};

export function resolveStallCauseForExceptionKind(
  kind: CampaignExceptionKind,
): OwnerStallCause | null {
  return EXCEPTION_STALL_CAUSE[kind] ?? null;
}

export function resolveStallCauseForDeskReason(
  reason: OwnerDeskItem["reason"],
): OwnerStallCause {
  return DESK_STALL_CAUSE[reason];
}
