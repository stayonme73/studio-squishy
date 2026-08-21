/**
 * Room 4C Scenario 3 — asset provenance companion.
 */

export function buildScenario3Provenance(input: {
  briefSha256: string;
  generatedAt: string;
  photoFiles: readonly {
    assetId: string;
    filename: string;
    sha256: string;
    rightsBasis: string;
  }[];
  toolIds: readonly string[];
}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    scenarioId: "scenario-3-photo-led-campaign",
    campaignId: "room-4c-s3-moss-and-thread-studio",
    briefSha256: input.briefSha256,
    generatedAt: input.generatedAt,
    photoRightsBasis: "STUDIO_GENERATED_CERTIFICATION_FIXTURE",
    externalCustomerPhotoPathProven: false,
    photos: input.photoFiles,
    tools: input.toolIds,
  };
}
