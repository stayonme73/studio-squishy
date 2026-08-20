/**
 * Generic customer-fact source gate.
 * Canonical values come from an approved fact record, not from inferred copy.
 * Presence of "a phone" or "a URL" is not enough.
 */

export const CUSTOMER_FACT_IDS = [
  "phoneDisplay",
  "bookingUrl",
  "bookingContact",
  "offerName",
  "datesDisplay",
  "cta",
  "businessName",
] as const;

export type CustomerFactId = (typeof CUSTOMER_FACT_IDS)[number];

export const CUSTOMER_FACT_APPROVAL_STATUSES = [
  "OWNER_APPROVED_FOR_CERTIFICATION",
  "UNAPPROVED",
  "MACHINE_INFERRED",
  "PLACEHOLDER",
] as const;

export type CustomerFactApprovalStatus =
  (typeof CUSTOMER_FACT_APPROVAL_STATUSES)[number];

export const PRODUCTION_ALLOWED_FACT_STATUSES = [
  "OWNER_APPROVED_FOR_CERTIFICATION",
] as const;

export type ProductionAllowedFactStatus =
  (typeof PRODUCTION_ALLOWED_FACT_STATUSES)[number];

export type CanonicalCustomerFacts = {
  values: Partial<Record<CustomerFactId, string>>;
  forbiddenExact: readonly string[];
};

export type ApprovedCustomerFactRecord = {
  /**
   * How these facts were authorized. Fictional certification phone/URL use
   * OWNER_APPROVED_FOR_CERTIFICATION — not customer-provided real-world facts.
   */
  approvalStatus: CustomerFactApprovalStatus;
  values: Partial<Record<CustomerFactId, string>>;
  requiredFactIds: readonly CustomerFactId[];
  forbiddenExact: readonly string[];
  unapprovedClaimPatterns?: readonly string[];
};

export type CustomerFactSource = {
  sourceId: string;
  text: string;
  requireExact: readonly CustomerFactId[];
  forbidExact?: readonly CustomerFactId[];
  forbidSubstrings?: readonly string[];
};

export type CustomerFactSourceGateFindingCode =
  | "missing_exact_fact"
  | "required_fact_missing"
  | "forbidden_canonical_present"
  | "forbidden_substring_present"
  | "stale_or_invented_fact"
  | "canonical_value_empty"
  | "owner_lock_mismatch"
  | "facts_not_approved"
  | "machine_inferred_contact"
  | "placeholder_contact"
  | "unapproved_claim";

export type CustomerFactSourceGateFinding = {
  code: CustomerFactSourceGateFindingCode;
  sourceId: string;
  factId?: CustomerFactId;
  expected?: string;
  detail: string;
};

export type CustomerFactSourceGateResult = {
  ok: boolean;
  findings: CustomerFactSourceGateFinding[];
};

export type CustomerFactSourceGateInput = {
  approvedRecord: ApprovedCustomerFactRecord;
  /** Hashed-brief values. Must match the approved record for overlapping keys. */
  candidateValues?: Partial<Record<CustomerFactId, string>>;
  sources: readonly CustomerFactSource[];
};

export type ProductionRoutingEligibilityInput = {
  approvedRecord: ApprovedCustomerFactRecord;
  candidateValues?: Partial<Record<CustomerFactId, string>>;
};

export type ProductionRoutingEligibility = {
  routingAllowed: boolean;
  findings: CustomerFactSourceGateFinding[];
};
