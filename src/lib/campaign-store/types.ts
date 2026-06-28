import type { CampaignRecord } from "@/config/studio-board";

export type StudioRole = "owner" | "staff" | "client";

export type StudioUser = {
  id: string;
  email: string;
  displayName: string;
  roles: readonly StudioRole[];
  /** Client session — campaign they are actively syncing from this browser. */
  currentCampaignId?: string;
};

export type StudioUserRecord = StudioUser & {
  /** Dev-only plaintext password — not for production. */
  password: string;
};

export type ServerCampaignEnvelope = {
  campaignId: string;
  clientUserId?: string;
  record: CampaignRecord;
  syncedAt: string;
  /** Monotonic counter — increments on each successful server write. */
  syncVersion: number;
};

export type CampaignSyncStatus = {
  campaignId: string;
  state: "idle" | "syncing" | "synced" | "error";
  lastSyncedAt?: string;
  lastError?: string;
  updatedAt: string;
};

export const CAMPAIGN_SYNC_STATUS_KEY = "studio-squishy:campaign-sync-status";
export const CAMPAIGN_SYNC_EVENT = "studio-squishy:campaign-sync-status-changed";
