import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import {
  ALL_LAYOUT_FAMILY_IDS,
  applyHeroPhotoRevision,
  assessImageAsset,
  buildNiaFallResetCreativeBrief,
  computeCoverCrop,
  getLayoutRecipe,
  loadCampaignVisualSystem,
  NIA_DEFAULT_VISUAL_SYSTEM_ID,
  NIA_PHOTO_ASSET_IDS,
  pickRecipeFamily,
  reasonCampaignCreativeSetDeterministic,
  resolveHeroMaterialId,
  ROOTED_READY_WELLNESS_VISUAL_SYSTEM_V1,
  runCampaignCreativePipeline,
  sanitizeCampaignCreativeCopy,
  validateCampaignCreativeSetSpec,
  writeSyntheticProofAssets,
  assertNoInternalLeakInCampaignText,
  type CampaignMaterialRef,
} from "@/lib/studio-campaign-creative";

const temps: string[] = [];

afterEach(() => {
  for (const t of temps.splice(0)) {
    try {
      rmSync(t, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

describe("campaign visual system", () => {
  it("loads rooted-ready wellness system as machine-readable truth", () => {
    const system = loadCampaignVisualSystem(NIA_DEFAULT_VISUAL_SYSTEM_ID);
    expect(system.systemId).toBe("rooted-ready-wellness-v1");
    expect(system.approvedLayoutFamilyIds).toContain("full_bleed_hero");
    expect(system.hierarchy[0]).toBe("photo");
    expect(system.palette.primary).toBe(
      ROOTED_READY_WELLNESS_VISUAL_SYSTEM_V1.palette.primary,
    );
  });
});

describe("recipes", () => {
  it("provides three families across three formats with in-bounds slots", () => {
    for (const family of ALL_LAYOUT_FAMILY_IDS) {
      for (const format of [
        "social_square",
        "social_vertical",
        "print_handout",
      ] as const) {
        const recipe = getLayoutRecipe(family, format);
        expect(recipe.familyId).toBe(family);
        expect(recipe.formatId).toBe(format);
        const hero = recipe.slots.find((s) => s.role === "hero");
        expect(hero).toBeTruthy();
        for (const slot of recipe.slots) {
          expect(slot.box.x).toBeGreaterThanOrEqual(0);
          expect(slot.box.y).toBeGreaterThanOrEqual(0);
          expect(slot.box.x + slot.box.width).toBeLessThanOrEqual(
            recipe.canvas.widthPx + 1,
          );
          expect(slot.box.y + slot.box.height).toBeLessThanOrEqual(
            recipe.canvas.heightPx + 1,
          );
        }
      }
    }
  });
});

describe("visual prep", () => {
  it("assesses and cover-crops around focal", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "cc-prep-"));
    temps.push(dir);
    await writeSyntheticProofAssets(dir);
    const assessment = await assessImageAsset({
      assetId: "proof-hero",
      absolutePath: path.join(dir, "proof-hero-portrait.jpg"),
    });
    expect(assessment.technical.usable).toBe(true);
    expect(assessment.orientation).toBe("portrait");
    const crop = computeCoverCrop({
      sourceW: assessment.widthPx,
      sourceH: assessment.heightPx,
      targetW: 1080,
      targetH: 1080,
      focal: assessment.subject?.focalRegion,
    });
    expect(crop.width).toBeGreaterThan(0);
    expect(crop.height).toBeGreaterThan(0);
  });
});

describe("reasoner + hero", () => {
  it("emits hero layers for all three formats and rejects leaks", () => {
    const brief = buildNiaFallResetCreativeBrief();
    const system = loadCampaignVisualSystem(NIA_DEFAULT_VISUAL_SYSTEM_ID);
    const heroAssessment = {
      assetId: NIA_PHOTO_ASSET_IDS.windowPortrait,
      contentSha256: "abc",
      mimeType: "image/jpeg",
      widthPx: 1200,
      heightPx: 1600,
      orientation: "portrait" as const,
      technical: { usable: true, failReasons: [], tooSmallForPrint: false },
      subject: {
        focalRegion: { x: 300, y: 200, width: 600, height: 800 },
        safeCropRegion: { x: 100, y: 100, width: 1000, height: 1400 },
        protectedBounds: [],
      },
    };
    const pick = pickRecipeFamily({ brief, heroAssessment, system });
    expect(pick.familyId).toBe("full_bleed_hero");
    expect(resolveHeroMaterialId(brief, [heroAssessment])).toBe(
      NIA_PHOTO_ASSET_IDS.windowPortrait,
    );

    const prepared: Record<string, CampaignMaterialRef> = {
      social_square: {
        materialId: "prep-sq",
        role: "hero",
        relativePath: "x.jpg",
        contentSha256: "1",
      },
      social_vertical: {
        materialId: "prep-v",
        role: "hero",
        relativePath: "y.jpg",
        contentSha256: "2",
      },
      print_handout: {
        materialId: "prep-p",
        role: "hero",
        relativePath: "z.jpg",
        contentSha256: "3",
      },
    };
    const setSpec = reasonCampaignCreativeSetDeterministic({
      brief,
      system,
      heroAssessment,
      materials: [
        {
          materialId: NIA_PHOTO_ASSET_IDS.logo,
          role: "logo",
          relativePath: "logo.svg",
          contentSha256: "logo",
        },
      ],
      preparedHeroByFormat: prepared,
    });
    expect(setSpec.assets).toHaveLength(3);
    for (const asset of setSpec.assets) {
      expect(
        asset.layers.some((l) => l.type === "image" && l.role === "hero"),
      ).toBe(true);
      const hero = asset.layers.find(
        (l) => l.type === "image" && l.role === "hero",
      )!;
      if (hero.type === "image") {
        expect(hero.width * hero.height).toBeGreaterThan(
          asset.canvas.widthPx * asset.canvas.heightPx * 0.28,
        );
      }
    }
    const qa = validateCampaignCreativeSetSpec(setSpec);
    expect(qa.pass).toBe(true);

    expect(() =>
      assertNoInternalLeakInCampaignText("Voice brief: keep it calm"),
    ).toThrow();
    expect(sanitizeCampaignCreativeCopy("Fall Reset")).toContain("Fall Reset");
  });
});

describe("pipeline + revision (synthetic proof assets)", () => {
  it(
    "renders three formats, preserves system on hero swap, bumps version",
    async () => {
      const repoRoot = process.cwd();
      const workRel = `docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/photo-led-build-1/proof-run-${Date.now()}`;
      const workAbs = path.join(repoRoot, workRel);
      temps.push(workAbs);
      const names = await writeSyntheticProofAssets(
        path.join(workAbs, "materials"),
      );

      const brief = buildNiaFallResetCreativeBrief({
        campaignId: "nia-r4b-photo-led-proof",
        primaryPhotoId: NIA_PHOTO_ASSET_IDS.windowPortrait,
      });

      const materials = [
        {
          materialId: NIA_PHOTO_ASSET_IDS.logo,
          role: "logo" as const,
          relativePath: `${workRel}/materials/${names.logoRelName}`,
        },
        {
          materialId: NIA_PHOTO_ASSET_IDS.windowPortrait,
          role: "hero" as const,
          relativePath: `${workRel}/materials/${names.heroPortraitRelName}`,
        },
        {
          materialId: NIA_PHOTO_ASSET_IDS.standingPortrait,
          role: "support" as const,
          relativePath: `${workRel}/materials/${names.heroAltPortraitRelName}`,
        },
      ];

      const v1 = await runCampaignCreativePipeline({
        repoRoot,
        brief,
        systemId: NIA_DEFAULT_VISUAL_SYSTEM_ID,
        materials,
        artifactRootRel: `${workRel}/artifacts`,
      });

      expect(v1.renderVersion).toBe(1);
      expect(v1.qa.pass).toBe(true);
      expect(v1.setSpec.reasoning.heroMaterialId).toBe(
        NIA_PHOTO_ASSET_IDS.windowPortrait,
      );
      expect(Object.keys(v1.overflowByAssetId)).toHaveLength(3);

      const v2 = await applyHeroPhotoRevision({
        repoRoot,
        priorIdentity: v1.identity,
        brief,
        newPrimaryPhotoId: NIA_PHOTO_ASSET_IDS.standingPortrait,
        materials,
        artifactRootRel: `${workRel}/artifacts`,
        systemId: NIA_DEFAULT_VISUAL_SYSTEM_ID,
      });

      expect(v2.renderVersion).toBe(2);
      expect(v2.identity.systemId).toBe(v1.identity.systemId);
      expect(v2.identity.heroMaterialId).toBe(
        NIA_PHOTO_ASSET_IDS.standingPortrait,
      );
      expect(v2.identity.materialFingerprint).not.toBe(
        v1.identity.materialFingerprint,
      );
    },
    120_000,
  );
});
