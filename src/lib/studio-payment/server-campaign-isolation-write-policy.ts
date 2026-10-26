import type { CampaignRecord } from "@/config/studio-board";
import {
  disposableKitTestMustStayIsolated,
} from "./disposable-kit-test-isolation";
import {
  armDisposableSocialPromoCertMarker,
  DISPOSABLE_SOCIAL_PROMO_CERT_PURPOSE,
  isDisposableSocialPromoCertCampaignId,
  parseSocialPromoCertIsolation,
  type DisposableSocialPromoCertIsolation,
} from "./disposable-social-promo-cert-isolation";

function isSocialPromoCertMarker(
  marker: unknown,
): marker is DisposableSocialPromoCertIsolation {
  if (!marker || typeof marker !== "object") return false;
  return (
    (marker as DisposableSocialPromoCertIsolation).purpose ===
    DISPOSABLE_SOCIAL_PROMO_CERT_PURPOSE
  );
}

function isolationMarkersEqual(
  a: CampaignRecord["testPaymentIsolation"],
  b: CampaignRecord["testPaymentIsolation"],
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Non-client campaign writes (internal PATCH) must not forge or arm disposable
 * isolation markers outside the approved server helpers.
 */
export function applyServerCampaignIsolationWritePolicy(
  existing: CampaignRecord | null,
  incoming: CampaignRecord,
  env: NodeJS.ProcessEnv = process.env,
): CampaignRecord {
  const merged: CampaignRecord = { ...incoming };

  if (existing?.testPaymentIsolation && disposableKitTestMustStayIsolated(existing)) {
    merged.testPaymentIsolation = existing.testPaymentIsolation;
    if (existing.disposableKitStripeTestProof) {
      merged.disposableKitStripeTestProof = existing.disposableKitStripeTestProof;
    } else {
      delete merged.disposableKitStripeTestProof;
    }
    return merged;
  }

  const existingSp = existing
    ? parseSocialPromoCertIsolation(existing)
    : { kind: "none" as const };

  if (existingSp.kind === "prepared" || existingSp.kind === "armed" || existingSp.kind === "invalid") {
    const incomingMarker = incoming.testPaymentIsolation;
    if (
      existingSp.kind === "prepared" &&
      isSocialPromoCertMarker(incomingMarker) &&
      incomingMarker.executionPhase === "armed"
    ) {
      const armed = armDisposableSocialPromoCertMarker({
        campaign: existing!,
        env,
        armedAt: incomingMarker.armedAt,
      });
      if (
        armed.ok &&
        isolationMarkersEqual(armed.campaign.testPaymentIsolation, incomingMarker)
      ) {
        merged.testPaymentIsolation = armed.campaign.testPaymentIsolation;
        return merged;
      }
    }
    if (existing?.testPaymentIsolation) {
      merged.testPaymentIsolation = existing.testPaymentIsolation;
    } else {
      delete merged.testPaymentIsolation;
    }
    return merged;
  }

  if (
    isSocialPromoCertMarker(incoming.testPaymentIsolation) ||
    (isDisposableSocialPromoCertCampaignId(incoming.campaignId) &&
      incoming.testPaymentIsolation != null)
  ) {
    delete merged.testPaymentIsolation;
  }

  return merged;
}
