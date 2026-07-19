import type { CampaignSyncStatus } from "@/lib/campaign-store/types";

/**
 * Customer-facing save status for Host journey surfaces.
 * Remote sync is optional; local campaign progress is the path of record.
 * Never show "Save failed" — it implies the customer's work was lost.
 */
export function campaignSaveStatusLabel(status: CampaignSyncStatus | null): string {
  if (status?.state === "syncing") return "Saving…";
  if (status?.state === "synced") return "Progress saved";
  if (status?.state === "error") return "";
  if (status?.state === "idle") return "Progress saved";
  return "Progress saved";
}
