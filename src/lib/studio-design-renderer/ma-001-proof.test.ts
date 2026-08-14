/**
 * STUDIO-OPERATING-DESIGN-MA-001-PROOF-1
 * Heterogeneous pack orchestrator proof — no remap, no dispatch.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  buildHarborOakMa001MaxMixedPackTruth,
  buildHarborOakMa001N1FlyerPackTruth,
  buildMa001UnsupportedKindPackTruth,
  MA_001_PROOF_ARTIFACT_ROOT,
  MA_001_SUPPORTED_KINDS,
  fingerprintMa001Pack,
  producerFamilyForKind,
  runMa001PackProofPipeline,
  validateMa001PackComposition,
} from "@/lib/studio-design-renderer";

const repoRoot = process.cwd();

describe("STUDIO-OPERATING-DESIGN-MA-001-PROOF-1", () => {
  it("rejects unsupported kind (poster) fail-closed — no flyer fallback", async () => {
    const truth = buildMa001UnsupportedKindPackTruth({ repoRoot });
    const composition = validateMa001PackComposition(truth);
    expect(composition.ok).toBe(false);
    if (!composition.ok) {
      expect(composition.code).toBe("UNSUPPORTED_KIND");
      expect(composition.message).toMatch(/poster/i);
      expect(composition.message).toMatch(/UNSUPPORTED_KIND/);
      expect(composition.message).not.toMatch(/substitut|closest match/i);
    }
    const result = await runMa001PackProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${MA_001_PROOF_ARTIFACT_ROOT}-unsupported`,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failureCode).toBe("UNSUPPORTED_KIND");
    }
  });

  it("N=1 flyer pack structurally passes", async () => {
    const truth = buildHarborOakMa001N1FlyerPackTruth({
      repoRoot,
      campaignId: "camp-ma-001-n1",
    });
    expect(truth.lockedPackMemberCount).toBe(1);
    const result = await runMa001PackProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${MA_001_PROOF_ARTIFACT_ROOT}-n1`,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.lockedPackMemberCount).toBe(1);
      expect(result.identity.members).toHaveLength(1);
      expect(result.identity.members[0]!.kind).toBe("flyer");
    }
  }, 120_000);

  it("N=2 and N=3 structural packs pass", async () => {
    const base = buildHarborOakMa001MaxMixedPackTruth({
      repoRoot,
      campaignId: "camp-ma-001-n23",
    });
    for (const n of [2, 3] as const) {
      const members = base.plannedPackMembers.slice(0, n);
      const truth = {
        ...base,
        campaignId: `camp-ma-001-n${n}`,
        jobId: `camp-ma-001-n${n}::ma-001`,
        lockedPackMemberCount: n,
        plannedPackMembers: members,
        label: `Harbor & Oak — ma-001 N=${n}`,
        memberTruthById: Object.fromEntries(
          members.map((m) => [m.memberId, base.memberTruthById[m.memberId]!]),
        ),
      };
      const result = await runMa001PackProofPipeline({
        repoRoot,
        truth,
        artifactRootRel: `${MA_001_PROOF_ARTIFACT_ROOT}-n${n}`,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.identity.lockedPackMemberCount).toBe(n);
        expect(result.identity.members).toHaveLength(n);
      }
    }
  }, 240_000);

  it("max-load mixed 4-member pack: flyer + card + service sheet + promotion_graphic", async () => {
    const truth = buildHarborOakMa001MaxMixedPackTruth({ repoRoot });
    expect(truth.lockedPackMemberCount).toBe(4);
    expect(truth.plannedPackMembers.map((m) => m.kind)).toEqual([
      "flyer",
      "business_card",
      "service_sheet",
      "promotion_graphic",
    ]);
    for (const m of truth.plannedPackMembers) {
      expect(MA_001_SUPPORTED_KINDS).toContain(m.kind);
      expect(m.producerFamily).toBe(
        producerFamilyForKind(
          m.kind as (typeof MA_001_SUPPORTED_KINDS)[number],
        ),
      );
    }

    const result = await runMa001PackProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: MA_001_PROOF_ARTIFACT_ROOT,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(["RENDERED", "ALREADY_RENDERED"]).toContain(result.invocationOutcome);
    expect(result.identity.lockedPackMemberCount).toBe(4);
    expect(result.identity.members).toHaveLength(4);
    expect(result.identity.packQaOk).toBe(true);

    const card = result.identity.members.find(
      (m) => m.kind === "business_card",
    )!;
    expect(card.artifacts.length).toBeGreaterThanOrEqual(3); // front + back + pdf
    // Member count is 4 even though card alone has multiple files
    const artifactFiles = result.identity.members.reduce(
      (s, m) => s + m.artifacts.length,
      0,
    );
    expect(artifactFiles).toBeGreaterThan(4);
    expect(result.identity.members.length).toBe(4);

    const promo = result.identity.members.find(
      (m) => m.kind === "promotion_graphic",
    )!;
    expect(promo.producerFamily).toBe(
      "v2-rtu-promotion-graphics-single-adapter",
    );
    expect(promo.agreedPlateId).toBe("cert-square-1024");
    // Honest single graphic — only one promo asset id in artifacts, not two campaign graphics
    const promoPngs = promo.artifacts.filter((a) => a.role === "png");
    expect(promoPngs).toHaveLength(1);

    const manifestPath = path.join(
      repoRoot,
      result.identity.manifestRelativePath,
    );
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(manifest.lockedPackMemberCount).toBe(4);
    expect(manifest.countUnit).toBe("member_identities");
    expect(manifest.members).toHaveLength(4);

    for (const m of result.identity.members) {
      for (const a of m.artifacts) {
        expect(existsSync(path.join(repoRoot, a.relativePath))).toBe(true);
      }
    }
  }, 300_000);

  it("same truth → ALREADY_RENDERED; material change → immutable vN+1", async () => {
    const root = `${MA_001_PROOF_ARTIFACT_ROOT}-versioning`;
    const truth = buildHarborOakMa001N1FlyerPackTruth({
      repoRoot,
      campaignId: "camp-ma-001-versioning",
    });
    const first = await runMa001PackProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: root,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const v1 = first.identity.packRenderVersion;

    const second = await runMa001PackProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: root,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.invocationOutcome).toBe("ALREADY_RENDERED");
    expect(second.identity.packRenderVersion).toBe(v1);

    const changed = {
      ...truth,
      offerName: `${truth.offerName} — revised`,
      memberTruthById: {
        ...truth.memberTruthById,
        "pack-member-1-flyer": {
          kind: "flyer" as const,
          truth: {
            ...truth.memberTruthById["pack-member-1-flyer"]!.truth,
            offerName: `${truth.offerName} — revised`,
          },
        },
      },
    };
    expect(fingerprintMa001Pack(changed)).not.toBe(fingerprintMa001Pack(truth));

    const third = await runMa001PackProofPipeline({
      repoRoot,
      truth: changed,
      artifactRootRel: root,
    });
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(third.invocationOutcome).toBe("RENDERED");
    expect(third.identity.packRenderVersion).toBe(v1 + 1);
    expect(
      existsSync(
        path.join(repoRoot, root, `renders/v${v1}`, "pack-identity.json"),
      ),
    ).toBe(true);
  }, 180_000);

  it("partial failure: one member fail → pack fail closed (not 3-of-4)", async () => {
    const truth = buildHarborOakMa001MaxMixedPackTruth({
      repoRoot,
      campaignId: "camp-ma-001-partial-fail",
    });
    const result = await runMa001PackProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${MA_001_PROOF_ARTIFACT_ROOT}-partial-fail`,
      forceMemberIdFail: "pack-member-3-service-sheet",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failureCode).toBe("MEMBER_RENDER_FAILURE");
      expect(result.message).toMatch(/pack-member-3-service-sheet/);
    }
  }, 300_000);
});
