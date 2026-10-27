/** Repo-relative paths under `data/campaign-design-artifacts/`. */

const DATA_PREFIX = "data/campaign-design-artifacts/";

export function isCampaignDesignArtifactRelPath(rel: string): boolean {
  const norm = rel.replace(/\\/g, "/");
  return norm.startsWith(DATA_PREFIX) || norm.startsWith("campaign-design-artifacts/");
}

export function campaignDesignArtifactRelPath(campaignId: string, suffix: string): string {
  const tail = suffix.replace(/^\/+/, "").replace(/\\/g, "/");
  return `${DATA_PREFIX}${campaignId}/${tail}`;
}

/** Private Storage object key (no `data/` prefix). */
export function relPathToStorageObjectPath(rel: string): string {
  const norm = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  if (norm.startsWith(DATA_PREFIX)) {
    return norm.slice("data/".length);
  }
  if (norm.startsWith("campaign-design-artifacts/")) return norm;
  throw new Error(`Not a campaign design artifact path: ${rel}`);
}

export function storageObjectPathToRelPath(objectPath: string): string {
  const norm = objectPath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `data/${norm}`;
}

export function campaignArtifactStoragePrefix(campaignId: string): string {
  return `campaign-design-artifacts/${campaignId.replace(/\\/g, "/")}/`;
}
