/**
 * STUDIO-OPERATING-DESIGN-RM-J008-PROOF-1
 * Profile Update Kit — full replacement · no remap · no Canva · no mutation.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  buildRmJ008PartialBioOnlyTruth,
  buildRmJ008UnsupportedInstagramCoverTruth,
  buildRmJ008UpdateKitTruth,
  fingerprintRmJ008UpdateKit,
  recipeForUpdatePlatform,
  RM_J008_PROOF_ARTIFACT_ROOT,
  RM_J008_PROOF_CONTRACT,
  runRmJ008KitProofPipeline,
  validateRmJ008KitComposition,
} from "@/lib/studio-design-renderer";

const repoRoot = process.cwd();

describe("STUDIO-OPERATING-DESIGN-RM-J008-PROOF-1", () => {
  it("contract: Facebook 5 · Instagram 4 · TikTok 4; no remap/Canva/mutation", () => {
    expect(recipeForUpdatePlatform("facebook").lockedKitMemberCount).toBe(5);
    expect(recipeForUpdatePlatform("instagram").lockedKitMemberCount).toBe(4);
    expect(recipeForUpdatePlatform("tiktok").lockedKitMemberCount).toBe(4);
    expect(
      recipeForUpdatePlatform("instagram").plannedKitMembers.some(
        (m) => m.memberId === "page_cover",
      ),
    ).toBe(false);
    expect(
      recipeForUpdatePlatform("facebook").plannedKitMembers.map((m) => m.memberId),
    ).toEqual([
      "bio_about_copy",
      "field_map_checklist",
      "profile_image",
      "page_cover",
      "before_after_change_sheet",
    ]);
    expect(RM_J008_PROOF_CONTRACT.canvaRequired).toBe(false);
    expect(RM_J008_PROOF_CONTRACT.accountMutation).toBe(false);
    expect(RM_J008_PROOF_CONTRACT.remapAuthorized).toBe(false);
    expect(RM_J008_PROOF_CONTRACT.beforeStateSource).toBe("customer_supplied");
    expect(RM_J008_PROOF_CONTRACT.unchangedMembers).toBe("reissue_always");
  });

  it("fails closed: Instagram cover + bio-only partial kit", () => {
    const igCover = buildRmJ008UnsupportedInstagramCoverTruth({
      campaignId: "camp-rmj008-ig-cover-bad",
    });
    const v1 = validateRmJ008KitComposition(igCover);
    expect(v1.ok).toBe(false);
    if (!v1.ok) {
      expect(v1.code).toMatch(/UNSUPPORTED_USE|MEMBERSHIP_MISMATCH/);
    }

    const partial = buildRmJ008PartialBioOnlyTruth({
      campaignId: "camp-rmj008-bio-only-bad",
    });
    const v2 = validateRmJ008KitComposition(partial);
    expect(v2.ok).toBe(false);
    if (!v2.ok) {
      expect(v2.code).toMatch(/PARTIAL_KIT_FORBIDDEN|MEMBERSHIP_MISMATCH/);
    }
  });

  it(
    "Facebook update kit 5/5 — change sheet marks CHANGED bio + UNCHANGED avatar/cover; all reissued",
    async () => {
    const truth = buildRmJ008UpdateKitTruth({
      platform: "facebook",
      campaignId: "camp-rmj008-facebook",
      bioLedUpdate: true,
    });
    expect(truth.before.source).toBe("customer_supplied");
    const result = await runRmJ008KitProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${RM_J008_PROOF_ARTIFACT_ROOT}-facebook`,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.identity.lockedKitMemberCount).toBe(5);
    expect(result.identity.members).toHaveLength(5);
    expect(result.identity.members.map((m) => m.memberId)).toEqual([
      "bio_about_copy",
      "field_map_checklist",
      "profile_image",
      "page_cover",
      "before_after_change_sheet",
    ]);
    expect(result.identity.ownerRoutine).toBe("NONE");
    expect(result.identity.canvaUsed).toBe(false);
    expect(result.identity.accountMutation).toBe(false);
    expect(result.identity.beforeStateSource).toBe("customer_supplied");

    const about = result.changeSheetRows.find((r) => r.fieldId === "about")!;
    expect(about.status).toBe("CHANGED");
    expect(about.beforeValue).toMatch(/Old bio/i);
    expect(about.afterValue).not.toEqual(about.beforeValue);

    const avatar = result.changeSheetRows.find(
      (r) => r.fieldId === "profile_image",
    )!;
    expect(avatar.status).toBe("UNCHANGED");
    const cover = result.changeSheetRows.find((r) => r.fieldId === "page_cover")!;
    expect(cover.status).toBe("UNCHANGED");

    // Full reissue even when UNCHANGED
    expect(
      result.identity.members.find((m) => m.memberId === "profile_image")!
        .artifacts.length,
    ).toBeGreaterThan(0);
    expect(
      result.identity.members.find((m) => m.memberId === "page_cover")!
        .artifacts.length,
    ).toBeGreaterThan(0);

    const sheetJsonPath = path.join(
      repoRoot,
      result.identity.members
        .find((m) => m.memberId === "before_after_change_sheet")!
        .artifacts.find((a) => a.role === "change_sheet_json")!.relativePath,
    );
    expect(existsSync(sheetJsonPath)).toBe(true);
    const sheetJson = JSON.parse(readFileSync(sheetJsonPath, "utf8")) as {
      comparisonBasis: string;
      beforeStateSource: string;
    };
    expect(sheetJson.comparisonBasis).toMatch(/authoritative_before/i);
    expect(sheetJson.comparisonBasis).toMatch(/not_artifact_hashes/i);
    expect(sheetJson.beforeStateSource).toBe("customer_supplied");

    const checklistMd = readFileSync(
      path.join(
        repoRoot,
        result.identity.members
          .find((m) => m.memberId === "field_map_checklist")!
          .artifacts.find((a) => a.role === "field_map_markdown")!.relativePath,
      ),
      "utf8",
    );
    expect(checklistMd).toMatch(/Replace with|Leave as-is \(UNCHANGED\)/i);
    expect(checklistMd).toMatch(/does not log in/i);
  },
    30_000,
  );

  it(
    "Instagram 4/4 and TikTok 4/4 — no cover; cover row NOT_APPLICABLE",
    async () => {
    for (const platform of ["instagram", "tiktok"] as const) {
      const truth = buildRmJ008UpdateKitTruth({
        platform,
        campaignId: `camp-rmj008-${platform}`,
        bioLedUpdate: true,
      });
      const result = await runRmJ008KitProofPipeline({
        repoRoot,
        truth,
        artifactRootRel: `${RM_J008_PROOF_ARTIFACT_ROOT}-${platform}`,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.identity.lockedKitMemberCount).toBe(4);
      expect(
        result.identity.members.some((m) => m.memberId === "page_cover"),
      ).toBe(false);
      const coverRow = result.changeSheetRows.find(
        (r) => r.fieldId === "page_cover",
      )!;
      expect(coverRow.status).toBe("NOT_APPLICABLE");
      const bio = result.changeSheetRows.find((r) => r.fieldId === "bio")!;
      expect(bio.status).toBe("CHANGED");
    }
  },
    60_000,
  );

  it(
    "same truth → ALREADY_RENDERED; material after change → immutable vN+1",
    async () => {
    const root = `${RM_J008_PROOF_ARTIFACT_ROOT}-versioning`;
    const t1 = buildRmJ008UpdateKitTruth({
      platform: "instagram",
      campaignId: "camp-rmj008-versioning",
      bioLedUpdate: true,
    });
    const first = await runRmJ008KitProofPipeline({
      repoRoot,
      truth: t1,
      artifactRootRel: root,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const v1 = first.identity.kitRenderVersion;

    const second = await runRmJ008KitProofPipeline({
      repoRoot,
      truth: t1,
      artifactRootRel: root,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.verdict).toBe("ALREADY_RENDERED");
    expect(second.identity.kitRenderVersion).toBe(v1);

    const t2 = buildRmJ008UpdateKitTruth({
      platform: "instagram",
      campaignId: "camp-rmj008-versioning",
      bioLedUpdate: true,
      overrides: { afterWebsite: "https://harbor-and-oak-updated.example" },
    });
    expect(fingerprintRmJ008UpdateKit(t2)).not.toBe(
      fingerprintRmJ008UpdateKit(t1),
    );
    const third = await runRmJ008KitProofPipeline({
      repoRoot,
      truth: t2,
      artifactRootRel: root,
    });
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(third.invocationOutcome).toBe("RENDERED");
    expect(third.identity.kitRenderVersion).toBe(v1 + 1);
    expect(
      existsSync(
        path.join(repoRoot, root, `renders/v${v1}`, "kit-identity.json"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        path.join(repoRoot, root, `renders/v${v1 + 1}`, "kit-identity.json"),
      ),
    ).toBe(true);
  },
    60_000,
  );
});
