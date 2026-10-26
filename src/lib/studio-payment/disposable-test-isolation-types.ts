import type { DisposableKitTestIsolation } from "./disposable-kit-test-isolation";
import type { DisposableSocialPromoCertIsolation } from "./disposable-social-promo-cert-isolation";

/** Server-owned markers on CampaignRecord.testPaymentIsolation — client sync cannot set. */
export type TestPaymentIsolation =
  | DisposableKitTestIsolation
  | DisposableSocialPromoCertIsolation;
