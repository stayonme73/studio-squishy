/**
 * Room 4C Scenario 1 — delivery manifest with per-file hashes.
 */

export type Scenario1DeliveryFile = {
  id: string;
  previewRole:
    | "social-graphic"
    | "video"
    | "caption"
    | "handout-png"
    | "handout-pdf"
    | "other";
  relativePath: string;
  contentSha256: string;
  byteLength: number;
  widthPx?: number;
  heightPx?: number;
  durationSeconds?: number;
  mimeType: string;
};

export type Scenario1DeliveryManifest = {
  schemaVersion: 1;
  packageId: string;
  scenarioId: string;
  campaignId: string;
  briefSha256: string;
  generatedAt: string;
  files: readonly Scenario1DeliveryFile[];
};

export function buildScenario1DeliveryManifest(input: {
  packageId: string;
  scenarioId: string;
  campaignId: string;
  briefSha256: string;
  generatedAt: string;
  files: readonly Scenario1DeliveryFile[];
}): Scenario1DeliveryManifest {
  const required: Scenario1DeliveryFile["previewRole"][] = [
    "social-graphic",
    "video",
    "caption",
    "handout-png",
    "handout-pdf",
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
