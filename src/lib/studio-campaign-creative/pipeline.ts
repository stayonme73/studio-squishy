/**
 * Campaign creative pipeline — Machine-native photo-led production.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { captureFlyerExports } from "@/lib/studio-design-renderer/capture";

import {
  nextCampaignRenderVersion,
  persistCampaignCreativeSetArtifacts,
  sha256File,
} from "./bind";
import type { CreativeBrief } from "./contracts";
import { CAMPAIGN_FORMAT_ORDER } from "./formats";
import {
  reasonCampaignCreativeSetDeterministic,
} from "./reason/reason-campaign-set";
import { renderCampaignAssetHtml } from "./render-html";
import { validateCampaignCreativeSetSpec } from "./set-qa";
import type {
  CampaignCreativeSetIdentity,
  CampaignCreativeSetSpec,
  CampaignMaterialRef,
} from "./types";
import { assessImageAsset, prepareVisualAsset } from "./visual-prep";
import { loadCampaignVisualSystem } from "./visual-system/rooted-ready-wellness-v1";

export type CampaignPipelineMaterialInput = {
  materialId: string;
  role: "logo" | "hero" | "support";
  /** Repo-relative path to source binary. */
  relativePath: string;
};

export type CampaignPipelineResult = {
  setSpec: CampaignCreativeSetSpec;
  identity: CampaignCreativeSetIdentity;
  qa: ReturnType<typeof validateCampaignCreativeSetSpec>;
  artifactRootRel: string;
  renderVersion: number;
  overflowByAssetId: Record<string, boolean>;
};

export async function runCampaignCreativePipeline(input: {
  repoRoot: string;
  brief: CreativeBrief;
  systemId: string;
  materials: readonly CampaignPipelineMaterialInput[];
  artifactRootRel: string;
  packageId?: string;
}): Promise<CampaignPipelineResult> {
  const system = loadCampaignVisualSystem(input.systemId);
  const logo = input.materials.find((m) => m.role === "logo");
  if (!logo) throw new Error("MISSING_LOGO_MATERIAL");

  const heroSource = input.materials.find(
    (m) => m.materialId === input.brief.selectedAssetIds.primaryPhotoId,
  );
  if (!heroSource) {
    throw new Error(
      `HERO_MATERIAL_NOT_BOUND:${input.brief.selectedAssetIds.primaryPhotoId}`,
    );
  }

  const heroAbs = path.join(input.repoRoot, heroSource.relativePath);
  const heroAssessment = await assessImageAsset({
    assetId: heroSource.materialId,
    absolutePath: heroAbs,
  });

  const renderVersion = nextCampaignRenderVersion(
    input.repoRoot,
    input.artifactRootRel,
  );
  const preparedDirRel = `${input.artifactRootRel}/prepared/v${renderVersion}`;
  mkdirSync(path.join(input.repoRoot, preparedDirRel), { recursive: true });

  const preparedHeroByFormat: Record<string, CampaignMaterialRef> = {};
  for (const formatId of CAMPAIGN_FORMAT_ORDER) {
    if (!input.brief.targetFormats.includes(formatId)) continue;
    const outRel = `${preparedDirRel}/hero-${formatId}.jpg`;
    const prepared = await prepareVisualAsset({
      sourceAbsolutePath: heroAbs,
      assessment: heroAssessment,
      formatId,
      outAbsolutePath: path.join(input.repoRoot, outRel),
      contrastBoost: 1.05,
    });
    preparedHeroByFormat[formatId] = {
      materialId: prepared.preparedId,
      role: "hero",
      relativePath: outRel,
      contentSha256: prepared.contentSha256,
    };
  }

  const logoAbs = path.join(input.repoRoot, logo.relativePath);
  const logoMaterials: CampaignMaterialRef[] = [
    {
      materialId: logo.materialId,
      role: "logo",
      relativePath: logo.relativePath,
      contentSha256: sha256File(logoAbs),
    },
  ];

  const setSpec = reasonCampaignCreativeSetDeterministic({
    brief: input.brief,
    system,
    heroAssessment,
    materials: logoMaterials,
    preparedHeroByFormat,
  });

  const qa = validateCampaignCreativeSetSpec(setSpec);
  if (!qa.pass) {
    throw new Error(
      `CAMPAIGN_QA_FAIL:${qa.findings.map((f) => f.id).join(",")}`,
    );
  }

  const renderDirRel = `${input.artifactRootRel}/renders/v${renderVersion}`;
  mkdirSync(path.join(input.repoRoot, renderDirRel), { recursive: true });

  const pngAbsoluteByAssetId: Record<string, string> = {};
  const pdfAbsoluteByAssetId: Record<string, string> = {};
  const overflowByAssetId: Record<string, boolean> = {};

  for (const asset of setSpec.assets) {
    const html = renderCampaignAssetHtml(input.repoRoot, setSpec, asset);
    const htmlRel = `${renderDirRel}/${asset.assetId}.html`;
    const pngRel = `${renderDirRel}/${asset.assetId}.png`;
    const pdfRel = `${renderDirRel}/${asset.assetId}.pdf`;
    const htmlAbs = path.join(input.repoRoot, htmlRel);
    const pngAbs = path.join(input.repoRoot, pngRel);
    const pdfAbs = path.join(input.repoRoot, pdfRel);
    writeFileSync(htmlAbs, html, "utf8");

    const capture = await captureFlyerExports({
      htmlAbsolutePath: htmlAbs,
      pngAbsolutePath: pngAbs,
      pdfAbsolutePath: pdfAbs,
      widthPx: asset.canvas.widthPx,
      heightPx: asset.canvas.heightPx,
    });
    if (!capture.overflowOk) {
      throw new Error(
        `OVERFLOW_FAIL:${asset.assetId}:${capture.overflowDetail}`,
      );
    }
    pngAbsoluteByAssetId[asset.assetId] = pngAbs;
    pdfAbsoluteByAssetId[asset.assetId] = pdfAbs;
    overflowByAssetId[asset.assetId] = capture.overflowOk;
  }

  const identity = persistCampaignCreativeSetArtifacts({
    repoRoot: input.repoRoot,
    artifactRootRel: input.artifactRootRel,
    setSpec,
    renderVersion,
    pngAbsoluteByAssetId,
    pdfAbsoluteByAssetId,
    packageId: input.packageId,
  });

  return {
    setSpec,
    identity,
    qa,
    artifactRootRel: input.artifactRootRel,
    renderVersion,
    overflowByAssetId,
  };
}
