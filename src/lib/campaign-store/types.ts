import type { CampaignRecord } from "@/config/studio-board";

export type StudioRole = "owner" | "staff" | "client";

/**
 * Seed / account classification — production may only bootstrap staff.
 * Public customers use account creation (`customer`).
 */
export type StudioUserAccountClass =
  | "staff"
  | "test"
  | "migration-only"
  | "customer";

export type StudioUser = {
  id: string;
  email: string;
  displayName: string;
  roles: readonly StudioRole[];
  /** Client session — campaign they are actively syncing from this browser. */
  currentCampaignId?: string;
  /** Durable client ownership — every campaign this client account may open. */
  clientCampaignIds?: readonly string[];
  accountClass?: StudioUserAccountClass;
  /**
   * Set by Email Verification package. Soft at signup; hard before Board claim.
   * Absent / null means not verified yet.
   */
  emailVerifiedAt?: string | null;
};

export type StudioUserRecord = StudioUser & {
  /**
   * One-way password hash (`scrypt$…`). Required for new accounts.
   */
  passwordHash?: string;
  /**
   * Legacy plaintext — development seed migration only.
   * Never accept for authentication in production.
   */
  password?: string;
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
