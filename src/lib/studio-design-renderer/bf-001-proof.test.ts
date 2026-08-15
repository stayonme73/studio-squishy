/**
 * STUDIO-OPERATING-DESIGN-BF-001-PROOF-1
 * Brand Identity Refresh package — 2/2 · Canva OFF · no remap.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  BF_001_COVER_PLATE,
  BF_001_PROOF_ARTIFACT_ROOT,
  BF_001_PROOF_CONTRACT,
  BF_001_PROFILE_PLATE,
  BF_001_SHEET_PLATE,
  buildBf001ProfileAndCoverTruth,
  buildBf001RefreshTruth,
  fingerprintBf001Package,
  runBf001PackageProofPipeline,
  validateBf001PackageComposition,
} from "@/lib/studio-design-renderer";

const repoRoot = process.cwd();

describe("STUDIO-OPERATING-DESIGN-BF-001-PROOF-1", () => {
  it("contract: 2 members · sheet plate · profile/cover plates · Canva OFF · no remap", () => {
    expect(BF_001_PROOF_CONTRACT.lockedPackageMemberCount).toBe(2);
    expect(BF_001_PROOF_CONTRACT.canvaRequired).toBe(false);
    expect(BF_001_PROOF_CONTRACT.remapAuthorized).toBe(false);
    expect(BF_001_PROOF_CONTRACT.ownerRoutine).toBe("NONE");
    expect(BF_001_PROOF_CONTRACT.fontSectionMode).toBe("recommendations_only");
    expect(BF_001_PROOF_CONTRACT.logoUsageMode).toBe("usage_guidance_only");
    expect(BF_001_SHEET_PLATE.plateId).toBe(
      "brand-direction-sheet-portrait-1024x1536",
    );
    expect(BF_001_SHEET_PLATE.widthPx).toBe(1024);
    expect(BF_001_SHEET_PLATE.heightPx).toBe(1536);
    expect(BF_001_PROFILE_PLATE.plateId).toBe("profile-avatar-square");
    expect(BF_001_COVER_PLATE.plateId).toBe("facebook-page-cover-851x315");
  });

  it("profile package 2/2: sheet sections + placed logo + Studio-safe fonts", async () => {
    const truth = buildBf001RefreshTruth({
      graphicKind: "profile",
      campaignId: "camp-bf001-profile",
      repoRoot,
    });
    const result = await runBf001PackageProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${BF_001_PROOF_ARTIFACT_ROOT}-profile`,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.identity.lockedPackageMemberCount).toBe(2);
    expect(result.identity.members).toHaveLength(2);
    expect(result.identity.members.map((m) => m.memberId)).toEqual([
      "brand_direction_sheet",
      "profile_or_cover_graphic",
    ]);
    expect(result.identity.graphicKind).toBe("profile");
    expect(result.identity.ownerRoutine).toBe("NONE");
    expect(result.identity.canvaUsed).toBe(false);
    expect(result.identity.remapAuthorized).toBe(false);

    const sheet = result.identity.members.find(
      (m) => m.memberId === "brand_direction_sheet",
    )!;
    expect(sheet.agreedPlateId).toBe(BF_001_SHEET_PLATE.plateId);
    const sheetHtml = readFileSync(
      path.join(
        repoRoot,
        sheet.artifacts.find((a) => a.role === "sheet_html")!.relativePath,
      ),
      "utf8",
    );
    expect(sheetHtml).toMatch(/Brand Direction Sheet/i);
    expect(sheetHtml).toMatch(/#5C7A8A/);
    expect(sheetHtml).toMatch(/Recommendation only/i);
    expect(sheetHtml).toMatch(/Playfair Display/);
    expect(sheetHtml).toMatch(/Clear space/i);
    expect(sheetHtml).toMatch(/not redrawn|usage-only/i);
    expect(sheetHtml).not.toMatch(/this graphic (uses|embeds|renders) Playfair/i);
    expect(
      existsSync(
        path.join(
          repoRoot,
          sheet.artifacts.find((a) => a.role === "sheet_png")!.relativePath,
        ),
      ),
    ).toBe(true);
    expect(
      existsSync(
        path.join(
          repoRoot,
          sheet.artifacts.find((a) => a.role === "sheet_pdf")!.relativePath,
        ),
      ),
    ).toBe(true);

    const graphic = result.identity.members.find(
      (m) => m.memberId === "profile_or_cover_graphic",
    )!;
    expect(graphic.agreedPlateId).toBe(BF_001_PROFILE_PLATE.plateId);
    const avatarHtml = readFileSync(
      path.join(
        repoRoot,
        graphic.artifacts.find((a) => a.role === "avatar_html")!.relativePath,
      ),
      "utf8",
    );
    expect(avatarHtml).toMatch(/data:image\/svg\+xml;base64,/);
    expect(avatarHtml).not.toMatch(/Playfair Display|Source Sans/i);
  }, 180_000);

  it("cover package 2/2: cover plate + placed logo + Studio-safe wordmark font", async () => {
    const truth = buildBf001RefreshTruth({
      graphicKind: "cover",
      campaignId: "camp-bf001-cover",
      repoRoot,
    });
    const result = await runBf001PackageProofPipeline({
      repoRoot,
      truth,
      artifactRootRel: `${BF_001_PROOF_ARTIFACT_ROOT}-cover`,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.identity.graphicKind).toBe("cover");
    expect(result.identity.members).toHaveLength(2);
    const graphic = result.identity.members.find(
      (m) => m.memberId === "profile_or_cover_graphic",
    )!;
    expect(graphic.agreedPlateId).toBe(BF_001_COVER_PLATE.plateId);
    const coverHtml = readFileSync(
      path.join(
        repoRoot,
        graphic.artifacts.find((a) => a.role === "cover_html")!.relativePath,
      ),
      "utf8",
    );
    expect(coverHtml).toMatch(/data:image\/svg\+xml;base64,/);
    expect(coverHtml).toMatch(/Georgia/);
    expect(coverHtml).not.toMatch(/Playfair Display/i);
  }, 180_000);

  it("fail closed: insufficient starting materials · no graphic · profile+cover · unsafe font", () => {
    const noLogo = buildBf001RefreshTruth({
      graphicKind: "profile",
      campaignId: "camp-bf001-no-logo",
      repoRoot,
      overrides: { logoMaterial: null },
    });
    const noLogoV = validateBf001PackageComposition(noLogo);
    expect(noLogoV.ok).toBe(false);
    if (!noLogoV.ok) expect(noLogoV.code).toBe("STARTING_POINT_INSUFFICIENT");

    const noName = buildBf001RefreshTruth({
      graphicKind: "profile",
      campaignId: "camp-bf001-no-name",
      repoRoot,
      overrides: { businessName: "   " },
    });
    const noNameV = validateBf001PackageComposition(noName);
    expect(noNameV.ok).toBe(false);
    if (!noNameV.ok) expect(noNameV.code).toBe("BUSINESS_NAME_MISSING");

    const noGraphic = buildBf001RefreshTruth({
      graphicKind: "profile",
      campaignId: "camp-bf001-no-graphic",
      repoRoot,
    });
    (noGraphic as { graphicKind: string }).graphicKind = "";
    const noGraphicV = validateBf001PackageComposition(noGraphic);
    expect(noGraphicV.ok).toBe(false);
    if (!noGraphicV.ok) expect(noGraphicV.code).toBe("NO_GRAPHIC_SELECTED");

    const dual = buildBf001ProfileAndCoverTruth({
      campaignId: "camp-bf001-dual",
      repoRoot,
    });
    const dualV = validateBf001PackageComposition(dual);
    expect(dualV.ok).toBe(false);
    if (!dualV.ok) expect(dualV.code).toBe("PROFILE_AND_COVER");

    const badFont = buildBf001RefreshTruth({
      graphicKind: "cover",
      campaignId: "camp-bf001-bad-font",
      repoRoot,
      overrides: { graphicRenderFontFamily: "Playfair Display, serif" },
    });
    const badFontV = validateBf001PackageComposition(badFont);
    expect(badFontV.ok).toBe(false);
    if (!badFontV.ok) expect(badFontV.code).toBe("STUDIO_SAFE_FONT_VIOLATION");
  });

  it("same truth → ALREADY_RENDERED; material change → immutable vN+1", async () => {
    const root = `${BF_001_PROOF_ARTIFACT_ROOT}-versioning`;
    const truth1 = buildBf001RefreshTruth({
      graphicKind: "profile",
      campaignId: "camp-bf001-versioning",
      repoRoot,
    });
    const first = await runBf001PackageProofPipeline({
      repoRoot,
      truth: truth1,
      artifactRootRel: root,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const v1 = first.identity.packageRenderVersion;

    const second = await runBf001PackageProofPipeline({
      repoRoot,
      truth: truth1,
      artifactRootRel: root,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.verdict).toBe("ALREADY_RENDERED");
    expect(second.identity.packageRenderVersion).toBe(v1);
    expect(second.identity.packageFingerprint).toBe(
      fingerprintBf001Package(truth1),
    );

    const truth2 = buildBf001RefreshTruth({
      graphicKind: "profile",
      campaignId: "camp-bf001-versioning",
      repoRoot,
      overrides: {
        hexPalette: [
          { role: "primary", hex: "#4A6B7A", label: "Harbor blue refreshed" },
          { role: "secondary", hex: "#B8955F", label: "Warm oak refreshed" },
          { role: "neutral", hex: "#F7F4EF", label: "Cream ground" },
          { role: "ink", hex: "#2C3E50", label: "Deep slate" },
        ],
      },
    });
    expect(fingerprintBf001Package(truth2)).not.toBe(
      fingerprintBf001Package(truth1),
    );
    const third = await runBf001PackageProofPipeline({
      repoRoot,
      truth: truth2,
      artifactRootRel: root,
    });
    expect(third.ok).toBe(true);
    if (!third.ok) return;
    expect(third.verdict).toBe("BF_001_REFRESH_PACKAGE_PROOF_PASS");
    expect(third.identity.packageRenderVersion).toBe(v1 + 1);
  }, 240_000);
});
