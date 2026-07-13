import type { CampaignSyncStatus } from "@/lib/campaign-store/types";

/** Customer-facing save status driven by real persistence state — not decorative copy. */
export function campaignSaveStatusLabel(status: CampaignSyncStatus | null): string {
  if (status?.state === "syncing") return "Saving…";
  if (status?.state === "error") return "Save failed";
  return "Progress saved";
}
