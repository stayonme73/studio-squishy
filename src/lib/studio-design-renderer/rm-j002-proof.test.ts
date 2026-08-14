/**
 * STUDIO-OPERATING-DESIGN-RM-J002-PROOF-1
 * Profile Setup Kit composer — three platforms · no remap · no Canva · no mutation.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  buildRmJ002KitTruth,
  buildRmJ002UnsupportedInstagramCoverTruth,
  fingerprintRmJ002Kit,
  RM_J002_AVATAR_PLATE,
  RM_J002_COPY_CHECKLIST_PRESENTATION_VERSION,
  RM_J002_FACEBOOK_COVER_PLATE,
  RM_J002_PROOF_ARTIFACT_ROOT,
  RM_J002_PROOF_CONTRACT,
  recipeForPlatform,
  runRmJ002KitProofPipeline,
  validateRmJ002KitComposition,
  writeScopedProfileCopy,
} from "@/lib/studio-design-renderer";

const repoRoot = process.cwd();

describe("STUDIO-OPERATING-DESIGN-RM-J002-PROOF-1", () => {
  it("contract recipes: Facebook 4 · Instagram 3 · TikTok 3; IG cover unsupported", () => {
    expect(recipeForPlatform("facebook").lockedKitMemberCount).toBe(4);
    expect(recipeForPlatform("instagram").lockedKitMemberCount).toBe(3);
    expect(recipeForPlatform("tiktok").lockedKitMemberCount).toBe(3);
    expect(
      recipeForPlatform("instagram").plannedKitMembers.some(
        (m) => m.memberId === "page_cover",
      ),
    ).toBe(false);
    expect(RM_J002_PROOF_CONTRACT.canvaRequired).toBe(false);
    expect(RM_J002_PROOF_CONTRACT.accountMutation).toBe(false);
    expect(RM_J002_PROOF_CONTRACT.remapAuthorized).toBe(false);
    expect(RM_J002_AVATAR_PLATE.widthPx).toBe(1024);
    expect(RM_J002_FACEBOOK_COVER_PLATE.widthPx).toBe(851);

    const bad = buildRmJ002UnsupportedInstagramCoverTruth({
      campaignId: "camp-rmj002-ig-cover-bad",
    });
    const v = validateRmJ002KitComposition(bad);
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.code).toMatch(/UNSUPPORTED_USE|MEMBERSHIP_MISMATCH/);
    }
  });

  it("Facebook kit 4/4 complete with Page cover + durable field-map", async () => {
    const truth = buildRmJ002KitTruth({
      platform: "facebook",
      campaignId: "camp-rmj002-facebook",
    });
    const result = await runRmJ002KitProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${RM_J002_PROOF_ARTIFACT_ROOT}-facebook`,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.identity.platform).toBe("facebook");
    expect(result.identity.lockedKitMemberCount).toBe(4);
    expect(result.identity.members).toHaveLength(4);
    expect(result.identity.members.map((m) => m.memberId)).toEqual([
      "bio_about_copy",
      "field_map_checklist",
      "profile_image",
      "page_cover",
    ]);
    expect(result.identity.ownerRoutine).toBe("NONE");
    expect(result.identity.canvaUsed).toBe(false);
    expect(result.identity.accountMutation).toBe(false);

    const fieldMap = result.identity.members.find(
      (m) => m.memberId === "field_map_checklist",
    )!;
    expect(fieldMap.artifacts.some((a) => a.role === "field_map_json")).toBe(
      true,
    );
    expect(
      fieldMap.artifacts.some((a) => a.role === "field_map_markdown"),
    ).toBe(true);
    expect(
      existsSync(
        path.join(
          repoRoot,
          fieldMap.artifacts.find((a) => a.role === "field_map_json")!
            .relativePath,
        ),
      ),
    ).toBe(true);

    const avatar = result.identity.members.find(
      (m) => m.memberId === "profile_image",
    )!;
    expect(avatar.agreedPlateId).toBe(RM_J002_AVATAR_PLATE.plateId);
    expect(avatar.plateHonestyNote).toMatch(/not guaranteed visible/i);
    const avatarHtml = readFileSync(
      path.join(
        repoRoot,
        avatar.artifacts.find((a) => a.role === "avatar_html")!.relativePath,
      ),
      "utf8",
    );
    expect(avatarHtml).not.toMatch(/Profile photo/i);
    expect(avatarHtml).not.toMatch(/Harbor &amp; Oak Studio/);
    expect(avatarHtml).toMatch(/Harbor and Oak mark|brand mark/i);
    expect(avatarHtml).toMatch(/data:image\/svg\+xml;base64,/);

    const cover = result.identity.members.find((m) => m.memberId === "page_cover")!;
    expect(cover.agreedPlateId).toBe(RM_J002_FACEBOOK_COVER_PLATE.plateId);
    const coverHtml = readFileSync(
      path.join(
        repoRoot,
        cover.artifacts.find((a) => a.role === "cover_html")!.relativePath,
      ),
      "utf8",
    );
    expect(coverHtml).not.toMatch(/customer uploads/i);
    expect(coverHtml).not.toMatch(/class="overlap"/);
    expect(coverHtml).not.toMatch(/not every pixel/i);
    const plateHonestyPath = cover.artifacts.find(
      (a) => a.role === "plate_honesty",
    )!.relativePath;
    const honesty = JSON.parse(
      readFileSync(path.join(repoRoot, plateHonestyPath), "utf8"),
    ) as {
      studioRenderPx: { width: number; height: number };
      customerFacingLabelsInPng: boolean;
    };
    expect(honesty.studioRenderPx).toEqual({ width: 851, height: 315 });
    expect(honesty.customerFacingLabelsInPng).toBe(false);

    const copy = result.identity.members.find(
      (m) => m.memberId === "bio_about_copy",
    )!;
    const copyJson = JSON.parse(
      readFileSync(
        path.join(
          repoRoot,
          copy.artifacts.find((a) => a.role === "copy_json")!.relativePath,
        ),
        "utf8",
      ),
    ) as { studioWritten: boolean; text: string };
    expect(copyJson.studioWritten).toBe(true);
    expect(copyJson.text.length).toBeGreaterThan(0);
    expect([...copyJson.text].length).toBeLessThanOrEqual(100);
    expect(copyJson.text).not.toMatch(/^Show a /i);
    expect(copyJson.text).toMatch(/Harbor & Oak Studio/i);
    expect(copyJson.text).toMatch(/Calm,\s+timeless\s+portrait\s+photography/i);
    expect(copyJson.text).toMatch(/Book a discovery call/i);

    const fieldMapMd = readFileSync(
      path.join(
        repoRoot,
        fieldMap.artifacts.find((a) => a.role === "field_map_markdown")!
          .relativePath,
      ),
      "utf8",
    );
    expect(fieldMapMd).not.toMatch(/\[profile asset/i);
    expect(fieldMapMd).not.toMatch(/\[cover asset/i);
    expect(fieldMapMd).not.toMatch(/`Customer action`/);
    expect(fieldMapMd).toMatch(
      /Upload the profile image included with this kit/i,
    );
    expect(fieldMapMd).toMatch(
      /Upload the Facebook Page cover included with this kit/i,
    );
  }, 180_000);

  it("customer-voice copy is platform-tailored (Instagram ≠ TikTok) and not assignment-echo", () => {
    expect(RM_J002_COPY_CHECKLIST_PRESENTATION_VERSION).toBe(
      "v2.1-customer-voice-platform-tailored",
    );
    const fb = writeScopedProfileCopy(
      buildRmJ002KitTruth({ platform: "facebook", campaignId: "c-fb" }),
    );
    const ig = writeScopedProfileCopy(
      buildRmJ002KitTruth({ platform: "instagram", campaignId: "c-ig" }),
    );
    const tt = writeScopedProfileCopy(
      buildRmJ002KitTruth({ platform: "tiktok", campaignId: "c-tt" }),
    );
    expect(fb.ok && ig.ok && tt.ok).toBe(true);
    if (!fb.ok || !ig.ok || !tt.ok) return;
    expect(fb.field).toBe("about");
    expect(ig.field).toBe("bio");
    expect(tt.field).toBe("bio");
    expect(fb.text).not.toMatch(/^Show a /i);
    expect(ig.text).not.toMatch(/^Show a /i);
    expect(tt.text).not.toMatch(/^Show a /i);
    expect(ig.text).not.toBe(tt.text);
    expect(fb.text).not.toBe(ig.text);
    expect(fb.text).not.toBe(tt.text);
    expect(fb.text).toMatch(/Harbor & Oak Studio/i);
    expect(ig.text).toMatch(/Calm,\s+timeless\s+portrait\s+photography/i);
    expect(tt.text).toMatch(/Calm portraits/i);
    expect(tt.text).not.toMatch(/timeless portrait photography/i);
  });

  it("Instagram kit 3/3 complete — no cover", async () => {
    const truth = buildRmJ002KitTruth({
      platform: "instagram",
      campaignId: "camp-rmj002-instagram",
    });
    const result = await runRmJ002KitProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${RM_J002_PROOF_ARTIFACT_ROOT}-instagram`,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.identity.lockedKitMemberCount).toBe(3);
    expect(result.identity.members.map((m) => m.memberId)).toEqual([
      "bio_profile_copy",
      "field_map_checklist",
      "profile_image",
    ]);
    expect(
      result.identity.members.some((m) => m.memberId === "page_cover"),
    ).toBe(false);
  }, 180_000);

  it("TikTok kit 3/3 complete — no cover", async () => {
    const truth = buildRmJ002KitTruth({
      platform: "tiktok",
      campaignId: "camp-rmj002-tiktok",
    });
    const result = await runRmJ002KitProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${RM_J002_PROOF_ARTIFACT_ROOT}-tiktok`,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.identity.lockedKitMemberCount).toBe(3);
    expect(
      result.identity.members.some((m) => m.memberId === "page_cover"),
    ).toBe(false);
  }, 180_000);

  it("unsupported Instagram cover fails closed", async () => {
    const truth = buildRmJ002UnsupportedInstagramCoverTruth({
      campaignId: "camp-rmj002-unsupported-cover",
    });
    const result = await runRmJ002KitProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${RM_J002_PROOF_ARTIFACT_ROOT}-unsupported-cover`,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failureCode).toMatch(
        /UNSUPPORTED_USE|MEMBERSHIP_MISMATCH/,
      );
    }
  });

  it("same truth → ALREADY_RENDERED; material change → immutable vN+1", async () => {
    const root = `${RM_J002_PROOF_ARTIFACT_ROOT}-versioning`;
    const truth = buildRmJ002KitTruth({
      platform: "instagram",
      campaignId: "camp-rmj002-versioning",
    });
    const first = await runRmJ002KitProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: root,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const v1 = first.identity.kitRenderVersion;

    const again = await runRmJ002KitProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: root,
    });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.verdict).toBe("ALREADY_RENDERED");
    expect(again.identity.kitRenderVersion).toBe(v1);
    expect(fingerprintRmJ002Kit(truth)).toBe(first.identity.kitFingerprint);

    const changed = buildRmJ002KitTruth({
      platform: "instagram",
      campaignId: "camp-rmj002-versioning",
      overrides: {
        profileGoal: "Material change — new booking CTA emphasis.",
      },
    });
    const second = await runRmJ002KitProofPipeline({
      repoRoot,
      truth: changed,
      artifactRootRel: root,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.verdict).toBe("RM_J002_KIT_COMPOSER_PROOF_PASS");
    expect(second.identity.kitRenderVersion).toBe(v1 + 1);
    expect(second.identity.kitFingerprint).not.toBe(first.identity.kitFingerprint);
    expect(
      existsSync(path.join(repoRoot, root, `renders/v${v1}`, "kit-identity.json")),
    ).toBe(true);
  }, 240_000);
});
