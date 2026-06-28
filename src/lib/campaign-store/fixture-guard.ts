const FIXTURE_CAMPAIGN_IDS = new Set(["owner-qa-dev"]);

export function isFixtureCampaignId(campaignId: string): boolean {
  if (FIXTURE_CAMPAIGN_IDS.has(campaignId)) return true;
  return campaignId.startsWith("test-");
}

export function isFixtureSyncAllowed(): boolean {
  return process.env.ALLOW_FIXTURE_SYNC === "1";
}

export function assertCampaignSyncAllowed(campaignId: string): void {
  if (!isFixtureCampaignId(campaignId)) return;
  if (isFixtureSyncAllowed()) return;
  throw new FixtureCampaignBlockedError(campaignId);
}

export class FixtureCampaignBlockedError extends Error {
  readonly campaignId: string;

  constructor(campaignId: string) {
    super(`Fixture campaign "${campaignId}" sync blocked — set ALLOW_FIXTURE_SYNC=1 to enable.`);
    this.name = "FixtureCampaignBlockedError";
    this.campaignId = campaignId;
  }
}
