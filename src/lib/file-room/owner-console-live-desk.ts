import { isFixtureCampaignId } from "@/lib/campaign-store/fixture-guard";

/**
 * Room 3 Section 1 — live Owner desk vs stored operating evidence.
 *
 * Historical certification and walk records stay on disk. They must not
 * masquerade as current Owner work on the sequential desk.
 */

export type OwnerConsoleLiveDeskClass =
  | "live_owner_work"
  | "stored_historical_evidence"
  | "stale_fixture_residue";

const STORED_EVIDENCE_ID_PREFIXES = [
  "p3-cert-",
  "p3-owner-",
  "camp-apply-",
  "camp-consent-",
  "camp-owner-",
  "camp-pc-",
  "pay-truth-",
  "pcp-",
  "cyc-",
  "ma001-",
  "bf001-",
  "rmj002-",
  "rmj008-",
  "room3-s1-",
  "self-test-",
] as const;

export function classifyOwnerConsoleCampaignForLiveDesk(
  campaignId: string,
): OwnerConsoleLiveDeskClass {
  if (isFixtureCampaignId(campaignId)) return "stale_fixture_residue";
  const id = campaignId.trim().toLowerCase();
  if (
    STORED_EVIDENCE_ID_PREFIXES.some(
      (prefix) => id === prefix.slice(0, -1) || id.startsWith(prefix),
    )
  ) {
    return "stored_historical_evidence";
  }
  return "live_owner_work";
}

export function shouldAppearOnLiveOwnerDesk(campaignId: string): boolean {
  return classifyOwnerConsoleCampaignForLiveDesk(campaignId) === "live_owner_work";
}
