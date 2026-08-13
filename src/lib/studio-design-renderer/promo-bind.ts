/**
 * Campaign-set artifact identity — whole-set version binds Asset A + Asset B.
 */

import { randomUUID } from "crypto";
import { copyFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { nextRenderVersion, sha256Bytes, sha256File } from "./bind";
import { PROMO_PROOF_PACKAGE_ID } from "./promo-fixtures";
import type {
  PromoAssetArtifact,
  PromoAssetSpec,
  PromoCampaignSetIdentity,
  PromoCampaignSetSpec,
  PromoProjectTruth,
} from "./promo-types";
import {
  PROMO_DESIGN_SPEC_VERSION,
  PROMO_RENDERER_VERSION,
} from "./promo-types";

export function fingerprintPromoSharedSpec(spec: PromoCampaignSetSpec): string {
  return sha256Bytes(
    JSON.stringify({
      specVersion: spec.specVersion,
      skuId: spec.skuId,
      colors: spec.colors,
      sharedCampaign: spec.sharedCampaign,
      materials: spec.materials.map((m) => ({
        materialId: m.materialId,
        contentSha256: m.contentSha256,
        relativePath: m.relativePath,
      })),
      assetIds: spec.assets.map((a) => a.assetId),
    }),
  );
}

export function fingerprintPromoAssetSpec(asset: PromoAssetSpec): string {
  return sha256Bytes(JSON.stringify(asset));
}

export function fingerprintPromoMaterials(spec: PromoCampaignSetSpec): string {
  const parts = spec.materials
    .map((m) => `${m.materialId}:${m.contentSha256}`)
    .sort();
  return sha256Bytes(parts.join("|"));
}

export function resolvePromoRenderPaths(input: {
  artifactRootRel: string;
  renderVersion: number;
  assetId: string;
}): {
  dirRel: string;
  htmlRel: string;
  pngRel: string;
  pdfRel: string;
  specRel: string;
  identityRel: string;
  qaRel: string;
} {
  const dirRel = `${input.artifactRootRel}/renders/v${input.renderVersion}`;
  const safe = input.assetId.replace(/[^a-zA-Z0-9_-]+/g, "-");
  return {
    dirRel,
    htmlRel: `${dirRel}/${safe}.html`,
    pngRel: `${dirRel}/${safe}.png`,
    pdfRel: `${dirRel}/${safe}.pdf`,
    specRel: `${dirRel}/campaign-set-design-spec.json`,
    identityRel: `${dirRel}/artifact-identity.json`,
    qaRel: `${dirRel}/campaign-set.design-qa.json`,
  };
}

export function persistPromoCampaignSetArtifacts(input: {
  repoRoot: string;
  truth: PromoProjectTruth;
  spec: PromoCampaignSetSpec;
  artifactRootRel: string;
  assetRenders: readonly {
    asset: PromoAssetSpec;
    html: string;
    pngAbsolutePath: string;
    pdfAbsolutePath: string;
    overflowOk: boolean;
    overflowDetail: string;
    individualQaOk: boolean;
  }[];
  setQaOk: boolean;
}): PromoCampaignSetIdentity {
  if (input.assetRenders.length !== 2) {
    throw new Error("PARTIAL_SET_FAILURE: persist requires exactly two asset renders");
  }

  const renderVersion = nextRenderVersion(input.repoRoot, input.artifactRootRel);
  const sharedPaths = resolvePromoRenderPaths({
    artifactRootRel: input.artifactRootRel,
    renderVersion,
    assetId: "set",
  });
  const absDir = path.join(input.repoRoot, sharedPaths.dirRel);
  mkdirSync(absDir, { recursive: true });

  writeFileSync(
    path.join(input.repoRoot, sharedPaths.specRel),
    `${JSON.stringify(input.spec, null, 2)}\n`,
    "utf8",
  );

  const assets = input.assetRenders.map((r) => {
    const paths = resolvePromoRenderPaths({
      artifactRootRel: input.artifactRootRel,
      renderVersion,
      assetId: r.asset.assetId,
    });
    writeFileSync(path.join(input.repoRoot, paths.htmlRel), r.html, "utf8");
    copyFileSync(r.pngAbsolutePath, path.join(input.repoRoot, paths.pngRel));
    copyFileSync(r.pdfAbsolutePath, path.join(input.repoRoot, paths.pdfRel));
    const artifact: PromoAssetArtifact = {
      assetId: r.asset.assetId,
      authorizedPurpose: r.asset.authorizedPurpose,
      plateId: r.asset.plateId,
      widthPx: r.asset.canvas.widthPx,
      heightPx: r.asset.canvas.heightPx,
      layoutVariant: r.asset.layoutVariant,
      pngRelativePath: paths.pngRel,
      pdfRelativePath: paths.pdfRel,
      htmlRelativePath: paths.htmlRel,
      pngContentSha256: sha256File(path.join(input.repoRoot, paths.pngRel)),
      pdfContentSha256: sha256File(path.join(input.repoRoot, paths.pdfRel)),
      assetSpecFingerprint: fingerprintPromoAssetSpec(r.asset),
      overflowOk: r.overflowOk,
      overflowDetail: r.overflowDetail,
      individualQaOk: r.individualQaOk,
    };
    return artifact;
  }) as [PromoAssetArtifact, PromoAssetArtifact];

  const identity: PromoCampaignSetIdentity = {
    packageId: PROMO_PROOF_PACKAGE_ID,
    campaignId: input.truth.campaignId,
    jobId: input.truth.jobId,
    dispatchId: input.truth.dispatchId,
    skuId: input.truth.skuId,
    renderId: randomUUID(),
    campaignSetRenderVersion: renderVersion,
    designSpecVersion: PROMO_DESIGN_SPEC_VERSION,
    sharedSpecFingerprint: fingerprintPromoSharedSpec(input.spec),
    materialFingerprint: fingerprintPromoMaterials(input.spec),
    rendererVersion: PROMO_RENDERER_VERSION,
    designSpecRelativePath: sharedPaths.specRel,
    assets,
    setQaOk: input.setQaOk,
    createdAt: new Date().toISOString(),
    lineageNote:
      "Promotion-graphics campaign set — whole-set version binds both assets; prior vN retained; Canva unused; primaryTool still Canva until authorized hook; live per-asset purpose intake gap documented.",
    liveIntakePerAssetPurposeGap: input.truth.liveIntakePerAssetPurposeGap,
  };

  writeFileSync(
    path.join(input.repoRoot, sharedPaths.identityRel),
    `${JSON.stringify(identity, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    path.join(input.repoRoot, input.artifactRootRel, "current-identity.json"),
    `${JSON.stringify(identity, null, 2)}\n`,
    "utf8",
  );

  return identity;
}
