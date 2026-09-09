/**
 * Customer-One paid Maya flyer matchers. Safe for client hydrate.
 */

import type { CampaignRecord } from "@/config/studio-board";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";

export function isLocalCustomerOnePaidFlyerCampaign(
  record: CampaignRecord,
): boolean {
  if (!record.paymentReceivedAt) return false;
  if (!/Maya.?s Mobile Boutique/i.test(String(record.campaignName ?? ""))) {
    return false;
  }
  return (record.approvedStudioPlan?.selectedServiceIds ?? []).includes(
    "v2-rtu-flyer",
  );
}

/** Latest existing paid Maya flyer. Does not create campaigns. */
export function pickLocalCustomerOnePaidFlyerCampaign(
  envelopes: readonly ServerCampaignEnvelope[],
  userId: string,
): ServerCampaignEnvelope | null {
  const matches = envelopes.filter((envelope) => {
    if (envelope.clientUserId && envelope.clientUserId !== userId) return false;
    return isLocalCustomerOnePaidFlyerCampaign(envelope.record);
  });
  if (matches.length === 0) return null;
  const i20 = matches.filter(
    (envelope) => envelope.record.routeMapContext?.roadId === "i20",
  );
  const pool = i20.length > 0 ? i20 : matches;
  return [...pool].sort((a, b) => {
    const aPaid = new Date(a.record.paymentReceivedAt ?? 0).getTime();
    const bPaid = new Date(b.record.paymentReceivedAt ?? 0).getTime();
    return bPaid - aPaid;
  })[0] ?? null;
}
