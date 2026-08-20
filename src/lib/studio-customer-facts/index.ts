export {
  assertCustomerFactSourceGate,
  assertProductionRoutingAllowed,
  evaluateApprovedCustomerFactRecord,
  evaluateCustomerFactSourceGate,
  evaluateProductionRoutingEligibility,
  formatCustomerFactSourceGateFailure,
} from "./evaluate-source-gate";
export {
  CUSTOMER_FACT_APPROVAL_STATUSES,
  CUSTOMER_FACT_IDS,
  PRODUCTION_ALLOWED_FACT_STATUSES,
} from "./types";
export type {
  ApprovedCustomerFactRecord,
  CanonicalCustomerFacts,
  CustomerFactApprovalStatus,
  CustomerFactId,
  CustomerFactSource,
  CustomerFactSourceGateFinding,
  CustomerFactSourceGateFindingCode,
  CustomerFactSourceGateInput,
  CustomerFactSourceGateResult,
  ProductionAllowedFactStatus,
  ProductionRoutingEligibility,
  ProductionRoutingEligibilityInput,
} from "./types";
