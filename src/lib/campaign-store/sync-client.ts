import type { CampaignRecord } from "@/config/studio-board";

import { isFixtureCampaignId, isFixtureSyncAllowed } from "./fixture-guard";
import {
  CAMPAIGN_SYNC_EVENT,
  CAMPAIGN_SYNC_STATUS_KEY,
  type CampaignSyncStatus,
} from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

export function readCampaignSyncStatus(): CampaignSyncStatus | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CAMPAIGN_SYNC_STATUS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CampaignSyncStatus;
  } catch {
    return null;
  }
}

export function writeCampaignSyncStatus(status: CampaignSyncStatus): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CAMPAIGN_SYNC_STATUS_KEY, JSON.stringify(status));
  window.dispatchEvent(new CustomEvent(CAMPAIGN_SYNC_EVENT, { detail: status }));
}

function logSyncFailure(campaignId: string, message: string, error?: unknown): void {
  const prefix = `[campaign-sync] FAILED campaignId=${campaignId}`;
  if (error instanceof Error) {
    console.error(prefix, message, error);
  } else {
    console.error(prefix, message, error ?? "");
  }
}

function logSyncSkipped(campaignId: string, reason: string): void {
  console.warn(`[campaign-sync] SKIPPED campaignId=${campaignId} — ${reason}`);
}

export async function syncCampaignToServer(record: CampaignRecord): Promise<void> {
  if (typeof window === "undefined") return;

  if (isFixtureCampaignId(record.campaignId) && !isFixtureSyncAllowed()) {
    logSyncSkipped(record.campaignId, "fixture campaign blocked (ALLOW_FIXTURE_SYNC not set)");
    writeCampaignSyncStatus({
      campaignId: record.campaignId,
      state: "error",
      lastError: "Fixture campaign sync blocked",
      updatedAt: nowIso(),
    });
    return;
  }

  writeCampaignSyncStatus({
    campaignId: record.campaignId,
    state: "syncing",
    updatedAt: nowIso(),
  });

  try {
    const response = await fetch("/api/campaigns/current", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ record }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      const message = body.error ?? `HTTP ${response.status}`;
      logSyncFailure(record.campaignId, message);
      writeCampaignSyncStatus({
        campaignId: record.campaignId,
        state: "error",
        lastError: message,
        updatedAt: nowIso(),
      });
      return;
    }

    const body = (await response.json()) as { syncedAt?: string };
    writeCampaignSyncStatus({
      campaignId: record.campaignId,
      state: "synced",
      lastSyncedAt: body.syncedAt ?? nowIso(),
      updatedAt: nowIso(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    logSyncFailure(record.campaignId, message, error);
    writeCampaignSyncStatus({
      campaignId: record.campaignId,
      state: "error",
      lastError: message,
      updatedAt: nowIso(),
    });
  }
}
