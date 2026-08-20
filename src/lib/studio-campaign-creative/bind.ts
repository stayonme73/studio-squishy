import { createHash } from "crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import path from "path";

import type {
  CampaignCreativeSetIdentity,
  CampaignCreativeSetSpec,
} from "./types";
import { CAMPAIGN_CREATIVE_RENDERER_VERSION } from "./types";

export function sha256Bytes(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function sha256File(absolutePath: string): string {
  return sha256Bytes(readFileSync(absolutePath));
}

export function fingerprintCampaignMaterials(
  setSpec: CampaignCreativeSetSpec,
): string {
  const parts = setSpec.materials
    .map((m) => `${m.materialId}:${m.contentSha256}`)
    .sort();
  return sha256Bytes(parts.join("|"));
}

export function fingerprintCampaignAssetSpec(
  asset: CampaignCreativeSetSpec["assets"][number],
): string {
  return sha256Bytes(JSON.stringify(asset));
}

export function fingerprintCampaignSetSpec(
  setSpec: CampaignCreativeSetSpec,
): string {
  return sha256Bytes(
    JSON.stringify({
      specVersion: setSpec.specVersion,
      systemId: setSpec.systemId,
      familyId: setSpec.familyId,
      colors: setSpec.colors,
      materials: setSpec.materials,
      brief: setSpec.brief,
      assets: setSpec.assets,
      reasoning: setSpec.reasoning,
    }),
  );
}

export function nextCampaignRenderVersion(
  repoRoot: string,
  artifactRootRel: string,
): number {
  const root = path.join(repoRoot, artifactRootRel, "renders");
  if (!existsSync(root)) return 1;
  const versions = readdirSync(root)
    .map((n) => /^v(\d+)$/.exec(n))
    .filter(Boolean)
    .map((m) => Number(m![1]));
  return versions.length === 0 ? 1 : Math.max(...versions) + 1;
}

export function persistCampaignCreativeSetArtifacts(input: {
  repoRoot: string;
  artifactRootRel: string;
  setSpec: CampaignCreativeSetSpec;
  renderVersion: number;
  pngAbsoluteByAssetId: Record<string, string>;
  pdfAbsoluteByAssetId?: Record<string, string>;
  packageId?: string;
}): CampaignCreativeSetIdentity {
  const dirRel = `${input.artifactRootRel}/renders/v${input.renderVersion}`;
  const dirAbs = path.join(input.repoRoot, dirRel);
  mkdirSync(dirAbs, { recursive: true });

  writeFileSync(
    path.join(dirAbs, "design-spec.json"),
    JSON.stringify(input.setSpec, null, 2),
  );

  const assetFingerprints: Record<string, string> = {};
  const pngShas: Record<string, string> = {};
  for (const asset of input.setSpec.assets) {
    assetFingerprints[asset.assetId] = fingerprintCampaignAssetSpec(asset);
    const pngAbs = input.pngAbsoluteByAssetId[asset.assetId];
    if (!pngAbs) throw new Error(`MISSING_PNG:${asset.assetId}`);
    pngShas[asset.assetId] = sha256File(pngAbs);
  }

  const identity: CampaignCreativeSetIdentity = {
    packageId:
      input.packageId ??
      "STUDIO-OPERATING-ROOM-4B-MACHINE-NATIVE-PHOTO-LED-CAMPAIGN-PRODUCTION-BUILD-1",
    campaignId: input.setSpec.brief.campaignId,
    systemId: input.setSpec.systemId,
    familyId: input.setSpec.familyId,
    renderVersion: input.renderVersion,
    heroMaterialId: input.setSpec.reasoning.heroMaterialId,
    materialFingerprint: fingerprintCampaignMaterials(input.setSpec),
    setFingerprint: fingerprintCampaignSetSpec(input.setSpec),
    assetFingerprints,
    pngShas,
    createdAt: new Date().toISOString(),
  };

  writeFileSync(
    path.join(dirAbs, "artifact-identity.json"),
    JSON.stringify(
      { ...identity, rendererVersion: CAMPAIGN_CREATIVE_RENDERER_VERSION },
      null,
      2,
    ),
  );

  return identity;
}
