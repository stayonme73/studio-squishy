/**
 * STUDIO-OPERATING-DESIGN-RM-J007-PROOF-1
 * Reference-Guided Promotion Update — 1/1 · Canva OFF · recreation honesty.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  RM_J007_HONESTY_LINE,
  RM_J007_PROOF_ARTIFACT_ROOT,
  RM_J007_PROOF_CONTRACT,
  RM_J007_UPDATE_PLATE,
  buildRmJ007UpdateTruth,
  ensureRmJ007ReferenceFixture,
  fingerprintRmJ007Package,
  runRmJ007PackageProofPipeline,
  validateRmJ007PackageComposition,
} from "@/lib/studio-design-renderer";

const repoRoot = process.cwd();

describe("STUDIO-OPERATING-DESIGN-RM-J007-PROOF-1", () => {
  it("contract: 1 member · promo portrait plate · Canva OFF · recreation · no redesign", () => {
    expect(RM_J007_PROOF_CONTRACT.lockedPackageMemberCount).toBe(1);
    expect(RM_J007_PROOF_CONTRACT.canvaRequired).toBe(false);
    expect(RM_J007_PROOF_CONTRACT.fulfillmentMode).toBe("recreation");
    expect(RM_J007_PROOF_CONTRACT.redesignAllowed).toBe(false);
    expect(RM_J007_PROOF_CONTRACT.pixelPerfectGuarantee).toBe(false);
    expect(RM_J007_PROOF_CONTRACT.ownerRoutine).toBe("NONE");
    expect(RM_J007_UPDATE_PLATE.plateId).toBe("cert-portrait-1024x1536");
    expect(RM_J007_UPDATE_PLATE.widthPx).toBe(1024);
    expect(RM_J007_UPDATE_PLATE.heightPx).toBe(1536);
  });

  it("pass path: Harbor & Oak before→after with bounded changes + honesty", async () => {
    const reference = await ensureRmJ007ReferenceFixture(repoRoot);
    const truth = buildRmJ007UpdateTruth({
      campaignId: "camp-rmj007-pass",
      repoRoot,
      referenceMaterial: reference,
    });
    const result = await runRmJ007PackageProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${RM_J007_PROOF_ARTIFACT_ROOT}-pass`,
    });
    if (!result.ok) {
      // Surface failure for debugging in CI/local.
      expect.fail(`${result.failureCode}: ${result.message}`);
    }
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.identity.lockedPackageMemberCount).toBe(1);
    expect(result.identity.members).toHaveLength(1);
    expect(result.identity.members[0]!.memberId).toBe("updated_promotion");
    expect(result.identity.canvaUsed).toBe(false);
    expect(result.identity.fulfillmentMode).toBe("recreation");
    expect(result.identity.acceptRecreationLimits).toBe(true);
    expect(result.identity.redesignRequested).toBe(false);
    expect(result.identity.ownerRoutine).toBe("NONE");

    const member = result.identity.members[0]!;
    const html = readFileSync(
      path.join(
        repoRoot,
        member.artifacts.find((a) => a.role === "update_html")!.relativePath,
      ),
      "utf8",
    );
    expect(html).toContain(RM_J007_HONESTY_LINE);
    expect(html).toMatch(/Harbor &amp; Oak Studio|Harbor & Oak Studio/);
    expect(html).toMatch(/\$59|April 12/);
    expect(
      existsSync(
        path.join(
          repoRoot,
          member.artifacts.find((a) => a.role === "update_png")!.relativePath,
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        path.join(
          repoRoot,
          member.artifacts.find((a) => a.role === "reference_before_png")!
            .relativePath,
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        path.join(
          repoRoot,
          member.artifacts.find((a) => a.role === "change_request_json")!
            .relativePath,
        ),
      ),
    ).toBe(true);
  }, 180_000);

  it("same truth → ALREADY_RENDERED; material change → immutable vN+1", async () => {
    const root = `${RM_J007_PROOF_ARTIFACT_ROOT}-versioning`;
    const reference = await ensureRmJ007ReferenceFixture(repoRoot);
    const truth1 = buildRmJ007UpdateTruth({
      campaignId: "camp-rmj007-version",
      repoRoot,
      referenceMaterial: reference,
    });
    const first = await runRmJ007PackageProofPipeline({
      repoRoot,
      truth: truth1,
      artifactRootRel: root,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const v1 = first.identity.packageRenderVersion;

    const second = await runRmJ007PackageProofPipeline({
      repoRoot,
      truth: truth1,
      artifactRootRel: root,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.verdict).toBe("ALREADY_RENDERED");
    expect(second.identity.packageRenderVersion).toBe(v1);

    // Material change: copy reference to a new path with different content hash.
    const altDir = path.join(repoRoot, root, "materials-alt");
    mkdirSync(altDir, { recursive: true });
    const altRel = `${root}/materials-alt/reference-changed.png`;
    const altAbs = path.join(repoRoot, altRel);
    copyFileSync(path.join(repoRoot, reference.relativePath), altAbs);
    // Append a byte so the SHA changes.
    writeFileSync(altAbs, Buffer.concat([readFileSync(altAbs), Buffer.from([1])]));
    const { createHash } = await import("crypto");
    const altSha = createHash("sha256").update(readFileSync(altAbs)).digest("hex");

    const truth2 = buildRmJ007UpdateTruth({
      campaignId: "camp-rmj007-version",
      repoRoot,
      referenceMaterial: {
        ...reference,
        materialId: "mat-changed",
        relativePath: altRel,
        contentSha256: altSha,
      },
      overrides: {
        boundedChanges: {
          dates: "May 3",
          prices: "$69",
        },
        whatChange: "Move to May and raise price again",
        newInfo: "May 3 · $69",
      },
    });
    expect(fingerprintRmJ007Package(truth2)).not.toBe(
      fingerprintRmJ007Package(truth1),
    );
    const third = await runRmJ007PackageProofPipeline({
      repoRoot,
      truth: truth2,
      artifactRootRel: root,
    });
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(third.invocationOutcome).toBe("RENDERED");
    expect(third.identity.packageRenderVersion).toBe(v1 + 1);
  }, 240_000);

  it("fail closed: redesign · missing reference · unsupported mime · missing acceptance", async () => {
    const reference = await ensureRmJ007ReferenceFixture(repoRoot);

    const redesign = buildRmJ007UpdateTruth({
      campaignId: "camp-rmj007-redesign",
      repoRoot,
      referenceMaterial: reference,
      overrides: { redesignRequested: true as unknown as false },
    });
    const redesignV = validateRmJ007PackageComposition(redesign);
    expect(redesignV.ok).toBe(false);
    if (!redesignV.ok) expect(redesignV.code).toBe("REDESIGN_REQUESTED");

    const noRef = buildRmJ007UpdateTruth({
      campaignId: "camp-rmj007-noref",
      repoRoot,
      referenceMaterial: reference,
      overrides: { referenceMaterial: null },
    });
    expect(noRef.referenceMaterial).toBeNull();
    const noRefV = validateRmJ007PackageComposition(noRef);
    expect(noRefV.ok).toBe(false);
    if (!noRefV.ok) expect(noRefV.code).toBe("MISSING_REFERENCE");

    const badMime = buildRmJ007UpdateTruth({
      campaignId: "camp-rmj007-mime",
      repoRoot,
      referenceMaterial: {
        ...reference,
        mime: "gif" as "png",
      },
    });
    const badMimeV = validateRmJ007PackageComposition(badMime);
    expect(badMimeV.ok).toBe(false);
    if (!badMimeV.ok) expect(badMimeV.code).toBe("UNSUPPORTED_REFERENCE_MIME");

    const noAccept = buildRmJ007UpdateTruth({
      campaignId: "camp-rmj007-accept",
      repoRoot,
      referenceMaterial: reference,
      overrides: { acceptRecreationLimits: false as unknown as true },
    });
    const noAcceptV = validateRmJ007PackageComposition(noAccept);
    expect(noAcceptV.ok).toBe(false);
    if (!noAcceptV.ok) expect(noAcceptV.code).toBe("MISSING_ACCEPTANCE");

    const pipelineFail = await runRmJ007PackageProofPipeline({
      repoRoot,
      truth: noRef,
      artifactRootRel: `${RM_J007_PROOF_ARTIFACT_ROOT}-fail`,
    });
    expect(pipelineFail.ok).toBe(false);
    if (!pipelineFail.ok) {
      expect(pipelineFail.failureCode).toBe("MISSING_REFERENCE");
    }
  }, 120_000);
});
