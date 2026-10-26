export { studioCustomerIdentitySafetyGateV1 } from "@/config/studio-customer-identity-safety-gate-v1";
export {
  evaluateCustomerIdentitySafetyGate,
  isCustomerIdentityBlocked,
} from "./evaluate";
export { resolveCustomerIdentitySafetyCustomerCopy } from "./customer-copy";
export { recoverResolvedCustomerIdentityHold } from "./recover-hold";
export type {
  CustomerIdentityDispatchSession,
  CustomerIdentityMismatchKind,
  CustomerIdentitySafetyContext,
  CustomerIdentitySafetyVerdict,
} from "./types";
