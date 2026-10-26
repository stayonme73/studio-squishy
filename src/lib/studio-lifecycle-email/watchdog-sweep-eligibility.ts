import { isFixtureCampaignId } from "@/lib/campaign-store/fixture-guard";

/**
 * Lifecycle watchdog send boundary.
 * Sequence 130. Campaigns and notices created before this instant are the
 * historical queue. The sweep must not send them or write them.
 * Known proof, recovery, and route-proof ids stay out even if a timestamp
 * is rewritten. A missing or invalid timestamp fails closed.
 */

export const WATCHDOG_SWEEP_LAUNCH_CUTOFF_ISO = "2026-10-21T19:18:00.104Z";

const HISTORICAL_CAMPAIGN_ID_PREFIXES = [
  "route-proof-",
  "studio-email-cert-",
  "camp-clip-",
  "messy-customer-",
  "harbor-oak",
  "laptop-approval-",
  "local-harbor-oak",
  "disposable-social-promo-machine-cert",
] as const;

const CUTOFF_MS = Date.parse(WATCHDOG_SWEEP_LAUNCH_CUTOFF_ISO);

export function watchdogCampaignIdMayEnterSweep(campaignId: string | null | undefined): boolean {
  const id = campaignId?.trim() ?? "";
  if (!id) return false;
  if (isFixtureCampaignId(id)) return false;
  const lower = id.toLowerCase();
  return !HISTORICAL_CAMPAIGN_ID_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export function watchdogCampaignCarriesTestMarker(input: {
  sandbox?: boolean | null;
  testPaymentIsolation?: unknown;
  disposableKitStripeTestProof?: unknown;
}): boolean {
  if (input.sandbox === true) return true;
  if (input.testPaymentIsolation != null) return true;
  if (input.disposableKitStripeTestProof != null) return true;
  return false;
}

export function isAtOrAfterWatchdogLaunchCutoff(iso: string | null | undefined): boolean {
  if (!iso?.trim()) return false;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return false;
  return ms >= CUTOFF_MS;
}

export function watchdogSweepMayDeliverCampaign(input: {
  campaignId: string | null | undefined;
  createdAt?: string | null;
  sandbox?: boolean | null;
  testPaymentIsolation?: unknown;
  disposableKitStripeTestProof?: unknown;
}): boolean {
  if (!watchdogCampaignIdMayEnterSweep(input.campaignId)) return false;
  if (watchdogCampaignCarriesTestMarker(input)) return false;
  return isAtOrAfterWatchdogLaunchCutoff(input.createdAt);
}

export function watchdogSweepMaySendNotice(record: {
  campaignId: string | null | undefined;
  createdAt?: string | null;
}): boolean {
  if (!watchdogCampaignIdMayEnterSweep(record.campaignId)) return false;
  return isAtOrAfterWatchdogLaunchCutoff(record.createdAt);
}

/** Cron header cannot authorize a sweep when the server secret is unset. */
export function lifecycleWatchdogCronAuthorized(
  configuredSecret: string | null | undefined,
  providedSecret: string | null | undefined,
): boolean {
  const expected = configuredSecret?.trim() ?? "";
  if (!expected) return false;
  const provided = providedSecret?.trim() ?? "";
  if (!provided) return false;
  return provided === expected;
}
