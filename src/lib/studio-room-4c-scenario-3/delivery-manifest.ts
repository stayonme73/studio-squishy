/**
 * Room 4C Scenario 3 — delivery manifest with per-file hashes.
 */

export type Scenario3DeliveryFile = {
  id: string;
  previewRole:
    | "campaign-direction"
    | "social-square"
    | "social-vertical"
    | "video"
    | "caption"
    | "email"
    | "invitation-handout-png"
    | "invitation-handout-pdf"
    | "other";
  relativePath: string;
  contentSha256: string;
  byteLength: number;
  widthPx?: number;
  heightPx?: number;
  durationSeconds?: number;
  mimeType: string;
};

export type Scenario3DeliveryManifest = {
  schemaVersion: 1;
  packageId: string;
  scenarioId: string;
  campaignId: string;
  briefSha256: string;
  generatedAt: string;
  files: readonly Scenario3DeliveryFile[];
};

export function buildScenario3DeliveryManifest(input: {
  packageId: string;
  scenarioId: string;
  campaignId: string;
  briefSha256: string;
  generatedAt: string;
  files: readonly Scenario3DeliveryFile[];
}): Scenario3DeliveryManifest {
  const required: Scenario3DeliveryFile["previewRole"][] = [
    "campaign-direction",
    "social-square",
    "social-vertical",
    "video",
    "caption",
    "email",
    "invitation-handout-png",
    "invitation-handout-pdf",
  ];
  for (const role of required) {
    if (!input.files.some((f) => f.previewRole === role)) {
      throw new Error(`DELIVERY_MANIFEST_MISSING:${role}`);
    }
  }
  return {
    schemaVersion: 1,
    packageId: input.packageId,
    scenarioId: input.scenarioId,
    campaignId: input.campaignId,
    briefSha256: input.briefSha256,
    generatedAt: input.generatedAt,
    files: input.files,
  };
}
