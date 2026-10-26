import type { CampaignRecord } from "@/config/studio-board";
import type { ExplicitProductionAuthorization } from "@/lib/studio-dispatch/production-entitlement";
import { disposableSocialPromoCertBlocksBillableProviders } from "./disposable-social-promo-cert-isolation";

/** Strip paid-provider paths for disposable Social & Promo cert campaigns. */
export function clampBillableProductionInput<T extends {
  campaign: CampaignRecord;
  preferAnthropic?: boolean;
  certificationFreshExecution?: ExplicitProductionAuthorization;
}>(input: T): T {
  if (!disposableSocialPromoCertBlocksBillableProviders(input.campaign)) return input;
  return {
    ...input,
    preferAnthropic: false,
    certificationFreshExecution: undefined,
  };
}
