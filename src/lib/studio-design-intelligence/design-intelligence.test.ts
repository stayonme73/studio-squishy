import { describe, expect, it } from "vitest";
import path from "path";

import { DESIGN_INTELLIGENCE_VERSION } from "@/config/studio-design-intelligence-v1";
import { evaluateFlyerSpecCreativeQuality } from "@/lib/studio-design-renderer/flyer-creative-quality";
import { reasonFlyerDesignSpecDeterministic } from "@/lib/studio-design-renderer/reason";
import type { FlyerProjectTruth } from "@/lib/studio-design-renderer/types";
import { validateFlyerDesignSpec } from "@/lib/studio-design-renderer/validate-spec";

import { evaluateAntiCopy, isMayaLikeDefault } from "./anti-copy";
import { deriveCreativeBrief } from "./derive-brief";
import { paletteForBrief } from "./derive-brief";
import { selectCreativeDirection } from "./select-route";
import { signatureFromSpec } from "./signatures";

const REPO = path.resolve(__dirname, "../../..");

function truthFromBriefSource(input: {
  campaignId: string;
  businessName: string;
  purpose: string;
  mustInclude: string;
  materials: string;
}): FlyerProjectTruth {
  const brief = deriveCreativeBrief({
    businessName: input.businessName,
    flyerPurpose: input.purpose,
    mustInclude: input.mustInclude,
    materials: input.materials,
    intendedUse: "Both print and digital",
    sizeNotes: "",
    cta: "Call or visit",
    headline: input.purpose,
    offerName: input.mustInclude.split("\n")[1] ?? input.businessName,
    body: input.mustInclude
      .split("\n")
      .slice(2)
      .filter(
        (line) =>
          !/\(\d{3}\)/.test(line) &&
          !/\.example/.test(line) &&
          !/\$\d/.test(line),
      )
      .join(" ")
      .slice(0, 280),
    logoAvailable: false,
    suppliedImagery: false,
    requiredFacts: [],
  });
  const direction = selectCreativeDirection({ brief, recent: [] });
  const palette = paletteForBrief(brief);
  const offer = input.mustInclude.split("\n")[1] ?? input.businessName;
  const price = input.mustInclude.match(/\$\s?\d+/)?.[0] ?? "";
  return {
    campaignId: input.campaignId,
    jobId: `${input.campaignId}:v2-rtu-flyer`,
    dispatchId: `dd:${input.campaignId}:v2-rtu-flyer`,
    skuId: "v2-rtu-flyer",
    fixtureId: input.campaignId,
    label: "Design Intelligence QA",
    outputMode: "customer",
    businessName: input.businessName,
    wordmark: input.businessName,
    descriptor: "",
    headline: input.purpose,
    offerName: offer,
    priceDisplay: price.replace(/\s+/g, ""),
    dateWindow: "",
    body: input.mustInclude
      .split("\n")
      .slice(2)
      .filter(
        (line) =>
          !/\(\d{3}\)/.test(line) &&
          !/\.example/.test(line) &&
          !/\$\d/.test(line),
      )
      .join(" ")
      .slice(0, 280),
    cta: "Call or visit",
    phone: input.mustInclude.match(/\(\d{3}\)\s?\d{3}-\d{4}/)?.[0] ?? "",
    webDisplay: input.mustInclude.match(/[a-z0-9.-]+\.example/)?.[0] ?? "",
    webUrl: "",
    disclaimer: "",
    intendedUse: "Both print and digital",
    brandColors: {
      primary: palette.primary,
      secondary: palette.secondary,
      background: palette.background,
      text: palette.text,
      muted: palette.muted,
    },
    approvedLogoVariantId: null,
    materials: [],
    requiredTextTokens: [input.businessName.split(/\s+/)[0]!],
    prohibitedClaimPatterns: ["guarantee"],
    creativeDirection: direction,
  };
}

describe("Design Production creative intelligence", () => {
  it("derives a Studio launch brief as creative/edgy, not choose-for-me navy/gold", () => {
    const brief = deriveCreativeBrief({
      businessName: "The Studio",
      flyerPurpose:
        "Launch announcement for The Studio. Invite small-business owners.",
      mustInclude:
        "THE STUDIO\nOpening October 2026\nCreative services for small businesses and entrepreneurs.",
      materials:
        "No logo yet. Use the business name The Studio as a clean wordmark. The look should feel modern, elevated, polished, editorial, and slightly edgy. Keep it sophisticated, not playful or cartoonish.",
      intendedUse: "Both print and digital",
      sizeNotes: "",
      cta: "Now accepting launch clients",
      headline: "Opening October 2026",
      offerName: "Opening October 2026",
      body: "Creative services for small businesses and entrepreneurs.",
      logoAvailable: false,
      suppliedImagery: false,
      requiredFacts: ["THE STUDIO"],
    });
    expect(brief.industryFamily).toBe("creative_technology");
    expect(brief.moodId).toBe("creative_edgy");
    expect(brief.wordmarkOnly).toBe(true);
    const palette = paletteForBrief(brief);
    expect(palette.primary.toUpperCase()).not.toBe("#1F3A5F");
    expect(palette.familyId).not.toBe("navy_gold_house");
  });

  it("blocks Maya-like navy/gold + centered circle as a default", () => {
    expect(
      isMayaLikeDefault({
        primaryHex: "#1F3A5F",
        secondaryHex: "#C4A574",
        geometryId: "centered_circle",
        layoutFamilyId: "centered_promotional_plate",
      }),
    ).toBe(true);
    const verdict = evaluateAntiCopy({
      route: {
        routeId: "route-A",
        label: "house",
        layoutFamilyId: "centered_promotional_plate",
        paletteFamilyId: "navy_gold_house",
        typeSystemId: "editorial_serif",
        geometryId: "centered_circle",
        rationale: "default",
      },
      recent: [],
    });
    expect(verdict.ok).toBe(false);
  });

  it("three industry routes do not share palette, layout, geometry, or type", () => {
    const trucking = truthFromBriefSource({
      campaignId: "intel-qa-trucking",
      businessName: "Iron Range Freight",
      purpose: "Regional trucking capacity",
      mustInclude:
        "Iron Range Freight\nDedicated lanes\nRegional freight and dedicated trucking lanes for manufacturers.\n(218) 555-0194\nironrangefreight.example\n$240",
      materials: "No logo. Professional and readable. Choose for me.",
    });
    const bakery = truthFromBriefSource({
      campaignId: "intel-qa-bakery",
      businessName: "Hearth & Rye",
      purpose: "Weekend pastry menu",
      mustInclude:
        "Hearth & Rye\nSaturday pastry window\nNeighborhood bakery. Butter croissants and rye loaves.\n(612) 555-0177\nhearthandrye.example\n$12",
      materials: "Warm and welcoming. No photos.",
    });
    const architecture = truthFromBriefSource({
      campaignId: "intel-qa-architecture",
      businessName: "North Line Architects",
      purpose: "Studio open house",
      mustInclude:
        "North Line Architects\nFall studio open house\nResidential architecture for families who want quiet, lasting houses.\n(651) 555-0118\nnorthlinearchitects.example",
      materials: "Elegant, premium, type-led. No logo.",
    });

    const specs = [trucking, bakery, architecture].map((truth) => {
      const spec = reasonFlyerDesignSpecDeterministic(truth);
      const validated = validateFlyerDesignSpec(REPO, spec, truth);
      expect(validated).toEqual({ ok: true });
      const fails = evaluateFlyerSpecCreativeQuality(spec, truth).filter(
        (finding) => finding.severity === "fail",
      );
      expect(fails).toEqual([]);
      expect(spec.layers.some((layer) => layer.id === "offer-medallion")).toBe(
        false,
      );
      expect(spec.colors.primary.toUpperCase()).not.toBe("#1F3A5F");
      expect(spec.creativeDirection?.intelligenceVersion).toBe(
        DESIGN_INTELLIGENCE_VERSION,
      );
      return signatureFromSpec(truth.campaignId, spec, truth.creativeDirection);
    });

    const palettes = new Set(specs.map((item) => item.paletteFamilyId));
    const layouts = new Set(specs.map((item) => item.layoutFamilyId));
    const geometry = new Set(specs.map((item) => item.geometryId));
    const type = new Set(specs.map((item) => item.typeSystemId));
    expect(palettes.size).toBe(3);
    expect(layouts.size).toBe(3);
    expect(geometry.size).toBe(3);
    expect(type.size).toBe(3);
  });
});
