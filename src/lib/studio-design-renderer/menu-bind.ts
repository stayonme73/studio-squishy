/**
 * Menu artifact identity binding — PNG + PDF, immutable versions.
 */

import { randomUUID } from "crypto";
import { copyFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { nextRenderVersion, sha256Bytes, sha256File } from "./bind";
import { countMenuItems } from "./menu-contracts";
import { MENU_PROOF_PACKAGE_ID } from "./menu-fixtures";
import type {
  MenuArtifactIdentity,
  MenuDesignSpec,
  MenuProjectTruth,
} from "./menu-types";
import {
  MENU_DESIGN_SPEC_VERSION,
  MENU_RENDERER_VERSION,
} from "./menu-types";

export function fingerprintMenuDesignSpec(spec: MenuDesignSpec): string {
  return sha256Bytes(
    JSON.stringify({
      specVersion: spec.specVersion,
      skuId: spec.skuId,
      canvas: spec.canvas,
      background: spec.background,
      colors: spec.colors,
      layers: spec.layers,
      materials: spec.materials.map((m) => ({
        materialId: m.materialId,
        contentSha256: m.contentSha256,
        relativePath: m.relativePath,
      })),
      outputFormats: spec.outputFormats,
      typographyMode: spec.typographyMode,
      layoutMode: spec.layoutMode,
      contentBottomPx: spec.contentBottomPx,
    }),
  );
}

export function fingerprintMenuMaterials(spec: MenuDesignSpec): string {
  const parts = spec.materials
    .map((m) => `${m.materialId}:${m.contentSha256}`)
    .sort();
  return sha256Bytes(parts.join("|"));
}

export function resolveMenuRenderPaths(input: {
  artifactRootRel: string;
  renderVersion: number;
}): {
  dirRel: string;
  htmlRel: string;
  pngRel: string;
  pdfRel: string;
  specRel: string;
  identityRel: string;
} {
  const dirRel = `${input.artifactRootRel}/renders/v${input.renderVersion}`;
  return {
    dirRel,
    htmlRel: `${dirRel}/menu.html`,
    pngRel: `${dirRel}/menu.png`,
    pdfRel: `${dirRel}/menu.pdf`,
    specRel: `${dirRel}/design-spec.json`,
    identityRel: `${dirRel}/artifact-identity.json`,
  };
}

export function persistMenuArtifacts(input: {
  repoRoot: string;
  truth: MenuProjectTruth;
  spec: MenuDesignSpec;
  artifactRootRel: string;
  html: string;
  pngAbsolutePath: string;
  pdfAbsolutePath: string;
  overflowOk: boolean;
  overflowDetail: string;
  widthPx: number;
  heightPx: number;
  supersedesRenderId?: string;
}): MenuArtifactIdentity {
  const renderVersion = nextRenderVersion(input.repoRoot, input.artifactRootRel);
  const paths = resolveMenuRenderPaths({
    artifactRootRel: input.artifactRootRel,
    renderVersion,
  });
  const dirAbs = path.join(input.repoRoot, paths.dirRel);
  mkdirSync(dirAbs, { recursive: true });

  writeFileSync(path.join(input.repoRoot, paths.htmlRel), input.html, "utf8");
  writeFileSync(
    path.join(input.repoRoot, paths.specRel),
    `${JSON.stringify(input.spec, null, 2)}\n`,
    "utf8",
  );
  copyFileSync(
    input.pngAbsolutePath,
    path.join(input.repoRoot, paths.pngRel),
  );
  copyFileSync(
    input.pdfAbsolutePath,
    path.join(input.repoRoot, paths.pdfRel),
  );

  const identity: MenuArtifactIdentity = {
    packageId: MENU_PROOF_PACKAGE_ID,
    campaignId: input.truth.campaignId,
    jobId: input.truth.jobId,
    dispatchId: input.truth.dispatchId,
    skuId: input.truth.skuId,
    renderId: randomUUID(),
    renderVersion,
    designSpecVersion: MENU_DESIGN_SPEC_VERSION,
    designSpecFingerprint: fingerprintMenuDesignSpec(input.spec),
    materialFingerprint: fingerprintMenuMaterials(input.spec),
    rendererVersion: MENU_RENDERER_VERSION,
    pngRelativePath: paths.pngRel,
    pdfRelativePath: paths.pdfRel,
    htmlRelativePath: paths.htmlRel,
    pngContentSha256: sha256File(path.join(input.repoRoot, paths.pngRel)),
    pdfContentSha256: sha256File(path.join(input.repoRoot, paths.pdfRel)),
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    createdAt: new Date().toISOString(),
    supersedesRenderId: input.supersedesRenderId,
    lineageNote:
      "Menu single-page proof — design-only flattened PNG/PDF; print/bleed/CMYK not claimed; Canva unused.",
    itemCount: countMenuItems(input.truth.sections),
    sectionCount: input.truth.sections.length,
    typographyMode: input.spec.typographyMode,
    layoutMode: input.spec.layoutMode,
    contentBottomPx: input.spec.contentBottomPx,
    overflowOk: input.overflowOk,
    overflowDetail: input.overflowDetail,
  };

  writeFileSync(
    path.join(input.repoRoot, paths.identityRel),
    `${JSON.stringify(identity, null, 2)}\n`,
    "utf8",
  );

  const currentIdentityRel = `${input.artifactRootRel}/current-identity.json`;
  writeFileSync(
    path.join(input.repoRoot, currentIdentityRel),
    `${JSON.stringify(identity, null, 2)}\n`,
    "utf8",
  );

  return identity;
}
