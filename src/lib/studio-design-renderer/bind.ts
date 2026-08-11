/**
 * Artifact identity binding — SHA-256 + durable lineage record.
 */

import { createHash, randomUUID } from "crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import path from "path";

import { PROOF_PACKAGE_ID } from "./fixtures";
import type {
  DesignArtifactIdentity,
  FlyerDesignSpec,
  FlyerProjectTruth,
} from "./types";
import { DESIGN_RENDERER_VERSION, FLYER_DESIGN_SPEC_VERSION } from "./types";

export function sha256Bytes(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function sha256File(absolutePath: string): string {
  return sha256Bytes(readFileSync(absolutePath));
}

export function fingerprintDesignSpec(spec: FlyerDesignSpec): string {
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
    }),
  );
}

export function fingerprintMaterials(spec: FlyerDesignSpec): string {
  const parts = spec.materials
    .map((m) => `${m.materialId}:${m.contentSha256}`)
    .sort();
  return sha256Bytes(parts.join("|"));
}

export function resolveRenderPaths(input: {
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
    htmlRel: `${dirRel}/flyer.html`,
    pngRel: `${dirRel}/flyer.png`,
    pdfRel: `${dirRel}/flyer.pdf`,
    specRel: `${dirRel}/design-spec.json`,
    identityRel: `${dirRel}/artifact-identity.json`,
  };
}

/**
 * Next render version under artifact root — never overwrites prior approved lineage.
 */
export function nextRenderVersion(
  repoRoot: string,
  artifactRootRel: string,
): number {
  const rendersDir = path.join(repoRoot, artifactRootRel, "renders");
  if (!existsSync(rendersDir)) return 1;
  let max = 0;
  for (const name of readdirSync(rendersDir)) {
    const m = /^v(\d+)$/.exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

export function persistFlyerArtifacts(input: {
  repoRoot: string;
  truth: FlyerProjectTruth;
  spec: FlyerDesignSpec;
  artifactRootRel: string;
  html: string;
  pngAbsolutePath: string;
  pdfAbsolutePath: string;
  widthPx: number;
  heightPx: number;
  supersedesRenderId?: string;
}): DesignArtifactIdentity {
  const renderVersion = nextRenderVersion(input.repoRoot, input.artifactRootRel);
  const paths = resolveRenderPaths({
    artifactRootRel: input.artifactRootRel,
    renderVersion,
  });
  const absDir = path.join(input.repoRoot, paths.dirRel);
  mkdirSync(absDir, { recursive: true });

  const htmlAbs = path.join(input.repoRoot, paths.htmlRel);
  const pngAbs = path.join(input.repoRoot, paths.pngRel);
  const pdfAbs = path.join(input.repoRoot, paths.pdfRel);
  const specAbs = path.join(input.repoRoot, paths.specRel);
  const identityAbs = path.join(input.repoRoot, paths.identityRel);

  writeFileSync(htmlAbs, input.html, "utf8");
  writeFileSync(specAbs, `${JSON.stringify(input.spec, null, 2)}\n`, "utf8");
  copyFileSync(input.pngAbsolutePath, pngAbs);
  copyFileSync(input.pdfAbsolutePath, pdfAbs);

  const identity: DesignArtifactIdentity = {
    packageId: PROOF_PACKAGE_ID,
    campaignId: input.truth.campaignId,
    jobId: input.truth.jobId,
    dispatchId: input.truth.dispatchId,
    skuId: input.truth.skuId,
    renderId: randomUUID(),
    renderVersion,
    designSpecVersion: FLYER_DESIGN_SPEC_VERSION,
    designSpecFingerprint: fingerprintDesignSpec(input.spec),
    materialFingerprint: fingerprintMaterials(input.spec),
    rendererVersion: DESIGN_RENDERER_VERSION,
    pngRelativePath: paths.pngRel,
    pdfRelativePath: paths.pdfRel,
    htmlRelativePath: paths.htmlRel,
    pngContentSha256: sha256File(pngAbs),
    pdfContentSha256: sha256File(pdfAbs),
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    createdAt: new Date().toISOString(),
    supersedesRenderId: input.supersedesRenderId,
    lineageNote:
      "Rerenders allocate a new vN directory; prior render folders are retained. Approved lineage is never silently overwritten.",
  };

  writeFileSync(identityAbs, `${JSON.stringify(identity, null, 2)}\n`, "utf8");
  writeFileSync(
    path.join(input.repoRoot, input.artifactRootRel, "current-identity.json"),
    `${JSON.stringify(identity, null, 2)}\n`,
    "utf8",
  );

  return identity;
}
