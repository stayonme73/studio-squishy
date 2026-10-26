import { customerArtifactRootRel } from "@/lib/studio-dispatch/map-flyer-job-truth";

export const RIVER_REED_CAMPAIGN_ID = "camp-clip-full-cust-cert-20261002" as const;
export const COLE_KINDRED_CAMPAIGN_ID = "camp-clip-sold-recert-20261003" as const;

export function artifactRootsAreIsolated(
  leftCampaignId: string,
  rightCampaignId: string,
): boolean {
  if (leftCampaignId === rightCampaignId) return false;
  const left = customerArtifactRootRel(leftCampaignId, `dd:${leftCampaignId}:sku`);
  const right = customerArtifactRootRel(rightCampaignId, `dd:${rightCampaignId}:sku`);
  return (
    left !== right &&
    left.includes(`/${leftCampaignId}/`) &&
    right.includes(`/${rightCampaignId}/`) &&
    !left.includes(rightCampaignId) &&
    !right.includes(leftCampaignId)
  );
}

export function soldContractIsolationHolds(): boolean {
  return artifactRootsAreIsolated(RIVER_REED_CAMPAIGN_ID, COLE_KINDRED_CAMPAIGN_ID);
}
