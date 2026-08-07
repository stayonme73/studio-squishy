/**
 * Kitchen fixture / demo boundary.
 *
 * Seeded KitchenCampaign data remains available for staff demo only.
 * It must never override or mix into live production projection.
 */

import {
  kitchenCampaignSeed,
} from "@/config/studio-kitchen-campaigns";
import type { KitchenCampaign } from "@/config/studio-kitchen";
import {
  KITCHEN_FIXTURE_DEMO_QUERY,
} from "@/config/studio-kitchen-foundation-v1";

/** Explicit fixture export — do not use as live production authority. */
export const kitchenFixtureCampaignSeed: readonly KitchenCampaign[] = kitchenCampaignSeed;

export function isKitchenFixtureDemoRequested(
  searchParams: URLSearchParams | { get(name: string): string | null },
): boolean {
  const value = searchParams.get(KITCHEN_FIXTURE_DEMO_QUERY);
  return value === "1" || value === "true";
}

/**
 * Board and detail share this gate:
 * fixture/demo is allowed only when explicitly requested AND no live campaigns exist.
 */
export function isKitchenFixtureDemoActive(input: {
  fixtureDemoRequested: boolean;
  liveCampaignCount: number;
}): boolean {
  return input.fixtureDemoRequested && input.liveCampaignCount === 0;
}

export function kitchenFixtureCampaignIds(): ReadonlySet<string> {
  return new Set(kitchenFixtureCampaignSeed.map((campaign) => campaign.id));
}

export function isKitchenFixtureCampaignId(campaignId: string): boolean {
  return kitchenFixtureCampaignIds().has(campaignId);
}
