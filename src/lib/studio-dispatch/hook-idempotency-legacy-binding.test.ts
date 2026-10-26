/**
 * Reuse must require the *whole* request identity, including the fields a durable
 * `DesignArtifactIdentity` cannot record.
 *
 * That record predates both the correction brief and the production method. When a
 * version has an identity but no receipt, matching on the fields it does carry
 * looks like a clean hit while the differing input is simply invisible — so a
 * hybrid request could be served renderer-only pixels, and a correction request
 * could be served the artifact from before the correction. Neither would be
 * detectable downstream: the bytes are real, QA passed, and the receipt gets
 * synthesized claiming the requested key.
 *
 * These tests build an artifact tree with an identity and no receipt, then ask for
 * reuse under each request shape.
 */
import { createHash } from "crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";

import { describe, expect, it } from "vitest";

import type { DesignArtifactIdentity } from "@/lib/studio-design-renderer";

import {
  RENDERER_ONLY_PRODUCTION_METHOD_ID,
  buildIdempotencyKey,
  findSuccessfulRenderForFingerprint,
  legacyIdentityCanBindTuple,
  type IdempotencyTuple,
} from "./hook-idempotency";

const HYBRID_METHOD_ID = "image_plus_renderer";
const ARTIFACT_ROOT_REL = "data/campaign-design-artifacts/c1/dd_c1_v2-rtu-flyer";
const RENDER_VERSION = 3;

const BASE_TUPLE: IdempotencyTuple = {
  dispatchId: "dd:c1:v2-rtu-flyer",
  jobId: "c1:v2-rtu-flyer",
  skuId: "v2-rtu-flyer",
  designSpecFingerprint: "spec-fp",
  materialFingerprint: "material-fp",
  rendererVersion: "renderer-1",
  correctionBriefFingerprint: "none",
};

function sha(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * A render version with real bytes, a passing QA record, and a durable identity —
 * but deliberately no `dispatch-hook-receipt.json`, which is the legacy shape.
 */
function stageIdentityWithoutReceipt(): string {
  const repoRoot = mkdtempSync(path.join(tmpdir(), "studio-legacy-bind-"));
  const versionDir = path.join(
    repoRoot,
    ARTIFACT_ROOT_REL,
    "renders",
    `v${RENDER_VERSION}`,
  );
  mkdirSync(versionDir, { recursive: true });

  const pngBytes = Buffer.from("png-bytes");
  const pdfBytes = Buffer.from("pdf-bytes");
  const pngRel = `${ARTIFACT_ROOT_REL}/renders/v${RENDER_VERSION}/flyer.png`;
  const pdfRel = `${ARTIFACT_ROOT_REL}/renders/v${RENDER_VERSION}/flyer.pdf`;
  writeFileSync(path.join(repoRoot, pngRel), pngBytes);
  writeFileSync(path.join(repoRoot, pdfRel), pdfBytes);
  writeFileSync(
    path.join(versionDir, "flyer.design-qa.json"),
    JSON.stringify({ ok: true }),
  );

  const identity: DesignArtifactIdentity = {
    packageId: "STUDIO-OPERATING-DESIGN-RENDERER-PROOF-1",
    campaignId: "c1",
    jobId: BASE_TUPLE.jobId,
    dispatchId: BASE_TUPLE.dispatchId,
    skuId: "v2-rtu-flyer",
    renderId: "render-1",
    renderVersion: RENDER_VERSION,
    designSpecVersion: "1",
    designSpecFingerprint: BASE_TUPLE.designSpecFingerprint,
    materialFingerprint: BASE_TUPLE.materialFingerprint,
    rendererVersion: BASE_TUPLE.rendererVersion,
    pngRelativePath: pngRel,
    pdfRelativePath: pdfRel,
    htmlRelativePath: `${ARTIFACT_ROOT_REL}/renders/v${RENDER_VERSION}/flyer.html`,
    pngContentSha256: sha(pngBytes),
    pdfContentSha256: sha(pdfBytes),
    widthPx: 100,
    heightPx: 100,
    createdAt: "2026-09-01T00:00:00.000Z",
    lineageNote: "test",
  } as DesignArtifactIdentity;
  writeFileSync(
    path.join(versionDir, "artifact-identity.json"),
    JSON.stringify(identity),
  );
  return repoRoot;
}

function lookup(repoRoot: string, tuple: IdempotencyTuple) {
  return findSuccessfulRenderForFingerprint({
    repoRoot,
    artifactRootRel: ARTIFACT_ROOT_REL,
    tuple,
  });
}

describe("legacy identity reuse requires full request identity", () => {
  it("binds a plain renderer-only request with no correction brief", () => {
    const found = lookup(stageIdentityWithoutReceipt(), BASE_TUPLE);
    expect(found.found).toBe(true);
    if (!found.found) return;
    // The synthesized receipt may only claim the key it actually satisfied.
    expect(found.receipt.idempotencyKey).toBe(buildIdempotencyKey(BASE_TUPLE));
  });

  it("binds an explicit renderer-only method the same way", () => {
    const tuple: IdempotencyTuple = {
      ...BASE_TUPLE,
      productionMethodId: RENDERER_ONLY_PRODUCTION_METHOD_ID,
    };
    expect(lookup(stageIdentityWithoutReceipt(), tuple).found).toBe(true);
  });

  it("refuses to serve renderer-only pixels for a hybrid request", () => {
    const tuple: IdempotencyTuple = {
      ...BASE_TUPLE,
      productionMethodId: HYBRID_METHOD_ID,
    };
    const found = lookup(stageIdentityWithoutReceipt(), tuple);
    expect(found.found).toBe(false);
    if (found.found) return;
    expect(found.reason).toBe("no_matching_success");
  });

  it("refuses to serve the pre-correction artifact for a correction request", () => {
    const tuple: IdempotencyTuple = {
      ...BASE_TUPLE,
      correctionBriefFingerprint: "correction-brief-fp",
    };
    expect(lookup(stageIdentityWithoutReceipt(), tuple).found).toBe(false);
  });

  it("refuses when both unprovable fields are set", () => {
    const tuple: IdempotencyTuple = {
      ...BASE_TUPLE,
      correctionBriefFingerprint: "correction-brief-fp",
      productionMethodId: HYBRID_METHOD_ID,
    };
    expect(lookup(stageIdentityWithoutReceipt(), tuple).found).toBe(false);
  });

  it("still refuses on the fields the identity can prove", () => {
    const repoRoot = stageIdentityWithoutReceipt();
    expect(
      lookup(repoRoot, { ...BASE_TUPLE, designSpecFingerprint: "other" }).found,
    ).toBe(false);
    expect(
      lookup(repoRoot, { ...BASE_TUPLE, materialFingerprint: "other" }).found,
    ).toBe(false);
    expect(
      lookup(repoRoot, { ...BASE_TUPLE, rendererVersion: "renderer-2" }).found,
    ).toBe(false);
    expect(lookup(repoRoot, { ...BASE_TUPLE, jobId: "other" }).found).toBe(false);
  });

  it("states the binding rule directly", () => {
    expect(legacyIdentityCanBindTuple(BASE_TUPLE)).toBe(true);
    expect(
      legacyIdentityCanBindTuple({
        ...BASE_TUPLE,
        productionMethodId: RENDERER_ONLY_PRODUCTION_METHOD_ID,
      }),
    ).toBe(true);
    expect(
      legacyIdentityCanBindTuple({
        ...BASE_TUPLE,
        productionMethodId: HYBRID_METHOD_ID,
      }),
    ).toBe(false);
    expect(
      legacyIdentityCanBindTuple({
        ...BASE_TUPLE,
        correctionBriefFingerprint: "fp",
      }),
    ).toBe(false);
  });
});
