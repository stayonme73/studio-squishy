import type { CampaignRecord } from "@/config/studio-board";

export const DISPOSABLE_SOCIAL_PROMO_CERT_ISOLATION_SCHEMA =
  "disposable-test-isolation-v1" as const;

export const DISPOSABLE_SOCIAL_PROMO_CERT_PURPOSE =
  "social_and_promo_production_truth_cert" as const;

export const DISPOSABLE_SOCIAL_PROMO_CERT_ID =
  /^disposable-social-promo-machine-cert-\d+$/;

export type DisposableSocialPromoCertExecutionPhase = "prepared" | "armed";

export type DisposableSocialPromoCertIsolation = {
  schemaVersion: typeof DISPOSABLE_SOCIAL_PROMO_CERT_ISOLATION_SCHEMA;
  purpose: typeof DISPOSABLE_SOCIAL_PROMO_CERT_PURPOSE;
  stripeMode: "test";
  disposable: true;
  executionPhase: DisposableSocialPromoCertExecutionPhase;
  armedAt?: string;
  armedBy?: "owner";
};

export type SocialPromoCertIsolationParse =
  | { kind: "none" }
  | { kind: "invalid"; reason: string }
  | { kind: "prepared"; marker: DisposableSocialPromoCertIsolation }
  | { kind: "armed"; marker: DisposableSocialPromoCertIsolation };

const REFUSED_ID_FRAGMENTS = [
  "harbor",
  "customer-one",
  "cedar",
  "messy-customer",
  "route-proof",
  "thank-you-social",
  "716a15b6",
  "review-room-v1",
] as const;

export function disposableSocialPromoCertMarker(
  executionPhase: DisposableSocialPromoCertExecutionPhase = "prepared",
): DisposableSocialPromoCertIsolation {
  return {
    schemaVersion: DISPOSABLE_SOCIAL_PROMO_CERT_ISOLATION_SCHEMA,
    purpose: DISPOSABLE_SOCIAL_PROMO_CERT_PURPOSE,
    stripeMode: "test",
    disposable: true,
    executionPhase,
  };
}

export function isDisposableSocialPromoCertCampaignId(campaignId: string): boolean {
  return DISPOSABLE_SOCIAL_PROMO_CERT_ID.test(campaignId.trim());
}

function refusedCampaignId(campaignId: string): boolean {
  const lower = campaignId.trim().toLowerCase();
  if (!isDisposableSocialPromoCertCampaignId(lower)) return true;
  return REFUSED_ID_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function markerShapeValid(
  marker: unknown,
): marker is DisposableSocialPromoCertIsolation {
  if (!marker || typeof marker !== "object") return false;
  const m = marker as DisposableSocialPromoCertIsolation;
  if (m.schemaVersion !== DISPOSABLE_SOCIAL_PROMO_CERT_ISOLATION_SCHEMA) return false;
  if (m.purpose !== DISPOSABLE_SOCIAL_PROMO_CERT_PURPOSE) return false;
  if (m.stripeMode !== "test") return false;
  if (m.disposable !== true) return false;
  if (m.executionPhase !== "prepared" && m.executionPhase !== "armed") return false;
  if (m.executionPhase === "armed") {
    if (!m.armedAt?.trim()) return false;
    if (m.armedBy !== "owner") return false;
  }
  return true;
}

export function parseSocialPromoCertIsolation(
  campaign: CampaignRecord,
): SocialPromoCertIsolationParse {
  const marker = campaign.testPaymentIsolation;
  const onAllowlistedId = isDisposableSocialPromoCertCampaignId(campaign.campaignId);

  if (!onAllowlistedId) {
    if (
      marker &&
      typeof marker === "object" &&
      "purpose" in marker &&
      (marker as { purpose?: string }).purpose === DISPOSABLE_SOCIAL_PROMO_CERT_PURPOSE
    ) {
      return { kind: "invalid", reason: "marker_on_non_allowlisted_campaign" };
    }
    return { kind: "none" };
  }

  if (!markerShapeValid(marker)) {
    return { kind: "invalid", reason: "missing_or_invalid_marker_on_allowlisted_id" };
  }

  if (refusedCampaignId(campaign.campaignId)) {
    return { kind: "invalid", reason: "refused_campaign_id" };
  }

  if (marker.executionPhase === "prepared") {
    return { kind: "prepared", marker };
  }
  return { kind: "armed", marker };
}

export function isDisposableSocialPromoCert(campaign: CampaignRecord): boolean {
  const parsed = parseSocialPromoCertIsolation(campaign);
  return parsed.kind === "prepared" || parsed.kind === "armed";
}

function paymentAllowsSocialPromoCertExecution(campaign: CampaignRecord): boolean {
  if (!campaign.paymentReceivedAt) return false;
  if (campaign.paymentTruth?.status !== "confirmed") return false;
  if (campaign.paymentTruth.sandbox === true) return true;
  return false;
}

function servicesAllowSocialPromoCert(campaign: CampaignRecord): boolean {
  const services = campaign.paymentTruth?.selectedServiceIds;
  return (
    Array.isArray(services) &&
    services.length === 1 &&
    services[0] === "social_and_promo_graphics"
  );
}

/**
 * Armed phase may run the operating chain only in dev/test on the allowlisted
 * disposable campaign with sandbox (or future sealed Stripe test) payment.
 */
export function disposableSocialPromoCertAllowsOperatingChain(
  campaign: CampaignRecord,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const parsed = parseSocialPromoCertIsolation(campaign);
  if (parsed.kind !== "armed") return false;
  if (env.NODE_ENV !== "test" && env.NODE_ENV !== "development") return false;
  if (refusedCampaignId(campaign.campaignId)) return false;
  if (campaign.condensedOffer?.packageId !== "social_and_promo_graphics") return false;
  if (!paymentAllowsSocialPromoCertExecution(campaign)) return false;
  if (!servicesAllowSocialPromoCert(campaign)) return false;
  return true;
}

export function disposableSocialPromoCertBlocksOperatingChain(
  campaign: CampaignRecord,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const parsed = parseSocialPromoCertIsolation(campaign);
  if (parsed.kind === "none") return false;
  if (parsed.kind === "invalid") return true;
  if (parsed.kind === "prepared") return true;
  return !disposableSocialPromoCertAllowsOperatingChain(campaign, env);
}

/** Valid Social & Promo cert marker — block paid provider paths even when armed. */
export function disposableSocialPromoCertBlocksBillableProviders(
  campaign: CampaignRecord,
): boolean {
  const parsed = parseSocialPromoCertIsolation(campaign);
  if (parsed.kind === "prepared" || parsed.kind === "armed") return true;
  if (
    parsed.kind === "invalid" &&
    isDisposableSocialPromoCertCampaignId(campaign.campaignId)
  ) {
    return true;
  }
  return false;
}

export function socialPromoCertCampaignIdFailClosed(campaignId: string): boolean {
  return isDisposableSocialPromoCertCampaignId(campaignId);
}

/**
 * Server-only transition prepared → armed. Not wired to customer APIs in this package.
 */
export function armDisposableSocialPromoCertMarker(input: {
  campaign: CampaignRecord;
  env?: NodeJS.ProcessEnv;
  armedAt?: string;
}):
  | { ok: true; campaign: CampaignRecord }
  | { ok: false; message: string } {
  const env = input.env ?? process.env;
  if (env.NODE_ENV !== "test" && env.NODE_ENV !== "development") {
    return {
      ok: false,
      message: "Social & Promo cert cannot be armed outside dev/test.",
    };
  }
  const parsed = parseSocialPromoCertIsolation(input.campaign);
  if (parsed.kind !== "prepared") {
    return {
      ok: false,
      message: "Only a prepared Social & Promo cert project can be armed.",
    };
  }
  if (!paymentAllowsSocialPromoCertExecution(input.campaign)) {
    return {
      ok: false,
      message: "Arming requires confirmed sandbox payment on the disposable cert project.",
    };
  }
  const armedAt = input.armedAt ?? new Date().toISOString();
  return {
    ok: true,
    campaign: {
      ...input.campaign,
      testPaymentIsolation: {
        ...parsed.marker,
        executionPhase: "armed",
        armedAt,
        armedBy: "owner",
      },
    },
  };
}
