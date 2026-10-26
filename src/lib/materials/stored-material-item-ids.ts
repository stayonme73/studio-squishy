import type { CampaignMaterialItem } from "./types";

/**
 * Ids of stored Supabase material files whose stored checksum matches.
 * Reference-only links have no checksum. A missing checksum does not match.
 */
export function storedMaterialIdsMatchingChecksum(
  items: readonly CampaignMaterialItem[],
  checksumSha256: string,
): string[] {
  return items
    .filter(
      (item) =>
        item.uploadStatus === "stored" &&
        item.storageRef?.provider === "supabase_storage" &&
        item.storageRef.checksumSha256 === checksumSha256,
    )
    .map((item) => item.id);
}
