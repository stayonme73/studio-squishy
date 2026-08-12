/**
 * Business-card artifact identity binding — front + back + PDF, immutable versions.
 */

import { randomUUID } from "crypto";
import { copyFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { nextRenderVersion, sha256Bytes, sha256File } from "./bind";
import { BUSINESS_CARD_PROOF_PACKAGE_ID } from "./card-fixtures";
import type {
  BusinessCardArtifactIdentity,
  BusinessCardDesignSpec,
  BusinessCardProjectTruth,
  BusinessCardSideArtifact,
} from "./card-types";
import {
  BUSINESS_CARD_DESIGN_SPEC_VERSION,
  BUSINESS_CARD_RENDERER_VERSION,
} from "./card-types";
import { BUSINESS_CARD_PROOF_CONTRACT } from "./card-contracts";

export function fingerprintBusinessCardDesignSpec(
  spec: BusinessCardDesignSpec,
): string {
  return sha256Bytes(
    JSON.stringify({
      specVersion: spec.specVersion,
      skuId: spec.skuId,
      canvas: spec.canvas,
      colors: spec.colors,
      front: spec.front,
      back: spec.back,
      materials: spec.materials.map((m) => ({
        materialId: m.materialId,
        contentSha256: m.contentSha256,
        relativePath: m.relativePath,
      })),
      outputFormats: spec.outputFormats,
    }),
  );
}

export function fingerprintBusinessCardMaterials(
  spec: BusinessCardDesignSpec,
): string {
  const parts = spec.materials
    .map((m) => `${m.materialId}:${m.contentSha256}`)
    .sort();
  return sha256Bytes(parts.join("|"));
}

export function resolveBusinessCardRenderPaths(input: {
  artifactRootRel: string;
  renderVersion: number;
}): {
  dirRel: string;
  frontHtmlRel: string;
  backHtmlRel: string;
  printHtmlRel: string;
  frontPngRel: string;
  backPngRel: string;
  pdfRel: string;
  specRel: string;
  identityRel: string;
} {
  const dirRel = `${input.artifactRootRel}/renders/v${input.renderVersion}`;
  return {
    dirRel,
    frontHtmlRel: `${dirRel}/front.html`,
    backHtmlRel: `${dirRel}/back.html`,
    printHtmlRel: `${dirRel}/card-print.html`,
    frontPngRel: `${dirRel}/front.png`,
    backPngRel: `${dirRel}/back.png`,
    pdfRel: `${dirRel}/business-card.pdf`,
    specRel: `${dirRel}/design-spec.json`,
    identityRel: `${dirRel}/artifact-identity.json`,
  };
}

export function persistBusinessCardArtifacts(input: {
  repoRoot: string;
  truth: BusinessCardProjectTruth;
  spec: BusinessCardDesignSpec;
  artifactRootRel: string;
  frontHtml: string;
  backHtml: string;
  printHtml: string;
  frontPngAbsolutePath: string;
  backPngAbsolutePath: string;
  pdfAbsolutePath: string;
  frontOverflowOk: boolean;
  frontOverflowDetail: string;
  backOverflowOk: boolean;
  backOverflowDetail: string;
  widthPx: number;
  heightPx: number;
  supersedesRenderId?: string;
}): BusinessCardArtifactIdentity {
  const renderVersion = nextRenderVersion(input.repoRoot, input.artifactRootRel);
  const paths = resolveBusinessCardRenderPaths({
    artifactRootRel: input.artifactRootRel,
    renderVersion,
  });
  const absDir = path.join(input.repoRoot, paths.dirRel);
  mkdirSync(absDir, { recursive: true });

  writeFileSync(path.join(input.repoRoot, paths.frontHtmlRel), input.frontHtml, "utf8");
  writeFileSync(path.join(input.repoRoot, paths.backHtmlRel), input.backHtml, "utf8");
  writeFileSync(path.join(input.repoRoot, paths.printHtmlRel), input.printHtml, "utf8");
  writeFileSync(
    path.join(input.repoRoot, paths.specRel),
    `${JSON.stringify(input.spec, null, 2)}\n`,
    "utf8",
  );
  copyFileSync(
    input.frontPngAbsolutePath,
    path.join(input.repoRoot, paths.frontPngRel),
  );
  copyFileSync(
    input.backPngAbsolutePath,
    path.join(input.repoRoot, paths.backPngRel),
  );
  copyFileSync(input.pdfAbsolutePath, path.join(input.repoRoot, paths.pdfRel));

  const sides: BusinessCardSideArtifact[] = [
    {
      side: "front",
      pngRelativePath: paths.frontPngRel,
      htmlRelativePath: paths.frontHtmlRel,
      pngContentSha256: sha256File(path.join(input.repoRoot, paths.frontPngRel)),
      widthPx: input.widthPx,
      heightPx: input.heightPx,
      overflowOk: input.frontOverflowOk,
      overflowDetail: input.frontOverflowDetail,
    },
    {
      side: "back",
      pngRelativePath: paths.backPngRel,
      htmlRelativePath: paths.backHtmlRel,
      pngContentSha256: sha256File(path.join(input.repoRoot, paths.backPngRel)),
      widthPx: input.widthPx,
      heightPx: input.heightPx,
      overflowOk: input.backOverflowOk,
      overflowDetail: input.backOverflowDetail,
    },
  ];

  const identity: BusinessCardArtifactIdentity = {
    packageId: BUSINESS_CARD_PROOF_PACKAGE_ID,
    campaignId: input.truth.campaignId,
    jobId: input.truth.jobId,
    dispatchId: input.truth.dispatchId,
    skuId: input.truth.skuId,
    renderId: randomUUID(),
    renderVersion,
    designSpecVersion: BUSINESS_CARD_DESIGN_SPEC_VERSION,
    designSpecFingerprint: fingerprintBusinessCardDesignSpec(input.spec),
    materialFingerprint: fingerprintBusinessCardMaterials(input.spec),
    rendererVersion: BUSINESS_CARD_RENDERER_VERSION,
    sides,
    pdfRelativePath: paths.pdfRel,
    pdfContentSha256: sha256File(path.join(input.repoRoot, paths.pdfRel)),
    designSpecRelativePath: paths.specRel,
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    createdAt: new Date().toISOString(),
    supersedesRenderId: input.supersedesRenderId,
    lineageNote:
      "Rerenders allocate a new vN directory; prior render folders are retained. Front and back are both bound per version.",
    printPromiseNote: BUSINESS_CARD_PROOF_CONTRACT.printReadyMeans,
  };

  writeFileSync(
    path.join(input.repoRoot, paths.identityRel),
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
