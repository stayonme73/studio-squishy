/**
 * Room 4C Scenario 2 — asset provenance bound to the canonical brief hash.
 */

export type Scenario2ProvenanceRecord = {
  schemaVersion: 1;
  packageId: string;
  scenarioId: string;
  campaignId: string;
  briefSha256: string;
  visualSystemId: string;
  generatedAt: string;
  assets: readonly Scenario2ProvenanceAsset[];
};

export type Scenario2ProvenanceAsset = {
  id: string;
  role:
    | "brief"
    | "logo"
    | "hero_photo"
    | "visual_production_spec"
    | "campaign_direction"
    | "social_square"
    | "social_vertical"
    | "print_counter_card_png"
    | "print_counter_card_pdf"
    | "caption"
    | "email"
    | "narration_script"
    | "voice_mp3"
    | "video_plate"
    | "video_mp4";
  relativePath: string;
  contentSha256: string;
  source: "authoritative_brief" | "studio_generated" | "derived_from_brief";
  derivedFromBriefSha256: string;
};

export function buildScenario2Provenance(input: {
  packageId: string;
  scenarioId: string;
  campaignId: string;
  briefSha256: string;
  visualSystemId: string;
  generatedAt: string;
  assets: readonly Scenario2ProvenanceAsset[];
}): Scenario2ProvenanceRecord {
  const unbound = input.assets.filter(
    (a) => a.derivedFromBriefSha256 !== input.briefSha256,
  );
  if (unbound.length > 0) {
    throw new Error(
      `PROVENANCE_UNBOUND:${unbound.map((a) => a.id).join(",")}`,
    );
  }
  return {
    schemaVersion: 1,
    packageId: input.packageId,
    scenarioId: input.scenarioId,
    campaignId: input.campaignId,
    briefSha256: input.briefSha256,
    visualSystemId: input.visualSystemId,
    generatedAt: input.generatedAt,
    assets: input.assets,
  };
}
