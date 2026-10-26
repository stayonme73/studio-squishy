import { describe, expect, it } from "vitest";

import { evaluateDesignQuality } from "@/lib/studio-kitchen-production/design-quality/evaluate";
import path from "node:path";

import { buildHarborOakFlyerProjectTruth } from "./fixtures";
import {
  composeCustomerOfferLine,
  deriveCustomerFacingCta,
  evaluateDeclaredFlyerCreativeQuality,
  evaluateFlyerSpecCreativeQuality,
  isInstructionalFlyerPurpose,
  liveAreaOccupancy,
  offerCopyFromMustInclude,
  offerNameWithoutRepeatedPrice,
  offerPanelContentFillRatio,
  resolveCustomerOfferHeadlineFromFacts,
} from "./flyer-creative-quality";
import { reasonFlyerDesignSpecDeterministic } from "./reason";
import type { FlyerProjectTruth } from "./types";

describe("flyer creative quality", () => {
  it("treats flyer-for purpose lines as production instructions", () => {
    expect(
      isInstructionalFlyerPurpose(
        "Grand opening flyer for Maya’s Mobile Boutique",
        "Maya’s Mobile Boutique",
      ),
    ).toBe(true);
    expect(
      isInstructionalFlyerPurpose("Promotional flyer for Back-to-School Reset"),
    ).toBe(true);
    expect(isInstructionalFlyerPurpose("Spring neighborhood open house")).toBe(
      false,
    );
    expect(
      isInstructionalFlyerPurpose(
        "Launch announcement for The Studio. Invite small-business owners to use The Studio.",
        "THE STUDIO",
      ),
    ).toBe(true);
  });

  it("reads the offer from mustInclude instead of the intake purpose instruction", () => {
    const must =
      "Grand Opening — first styling appointment $45. Call (804) 555-0142 or visit mayasmobileboutique.example.";
    const copy = offerCopyFromMustInclude(must);
    expect(copy.headline).toMatch(/Grand Opening/i);
    expect(copy.offerName).toMatch(/styling appointment/i);
    expect(copy.headline).not.toMatch(/flyer for/i);

    const headline = resolveCustomerOfferHeadlineFromFacts({
      flyerPurpose: "Grand opening flyer for Maya’s Mobile Boutique",
      mustInclude: must,
      businessName: "Maya’s Mobile Boutique",
    });
    expect(headline).toMatch(/Grand Opening/i);
    expect(headline).not.toMatch(/flyer for/i);
    expect(deriveCustomerFacingCta({ mustInclude: must })).toBe("Call or visit");
  });

  it("fails declared art that still uses intake purpose or generic placeholders", () => {
    const weak = evaluateDeclaredFlyerCreativeQuality(
      [
        "Maya’s Mobile Boutique",
        "Grand opening flyer for Maya’s Mobile Boutique",
        "$45",
        "See offer details",
        "Book online or call",
        "phone (804) 555-0142",
        "Call (804) 555-0142",
        "web mayasmobileboutique.example",
        "mayasmobileboutique.example",
      ].join("\n"),
    );
    expect(weak.map((finding) => finding.id)).toEqual(
      expect.arrayContaining([
        "instructional_purpose_on_art",
        "generic_placeholder_0",
        "duplicate_phone",
        "field_label_leak",
      ]),
    );
  });

  it("lets offer-led art pass the declared-text creative checks", () => {
    const findings = evaluateDeclaredFlyerCreativeQuality(
      [
        "Maya’s Mobile Boutique",
        "Grand Opening",
        "first styling appointment",
        "$45",
        "Call or visit",
        "(804) 555-0142",
        "mayasmobileboutique.example",
      ].join("\n"),
    );
    expect(findings).toEqual([]);
  });

  it("fails the design-quality gate when a live job flyer still prints intake purpose", () => {
    const evaluation = evaluateDesignQuality({
      brief: {
        skuId: "v2-rtu-flyer",
        fixtureId: "job-customer-live",
        requiredTextTokens: ["$45"],
        prohibitedClaimPatterns: [],
        ctaTokens: [],
        requireCta: false,
        maxAssets: 1,
        minAssets: 1,
        allowedExtensions: ["png"],
        requireLogoVariant: false,
        requireMultiAssetConsistency: false,
        requireArtifactBinding: false,
      },
      submission: {
        artifacts: [
          {
            id: "flyer",
            relativePath: "flyer.png",
            version: "final",
            extension: "png",
            declaredText:
              "Grand opening flyer for Maya’s Mobile Boutique\n$45\nSee offer details",
          },
        ],
      },
    });
    expect(evaluation.ok).toBe(false);
    expect(
      evaluation.findings.some((finding) => finding.checkKind === "creative_quality"),
    ).toBe(true);
  });

  it("composes an offer fragment into a readable price sentence", () => {
    expect(
      composeCustomerOfferLine("first styling appointment", "$45"),
    ).toBe("First styling appointment for $45");
    expect(
      composeCustomerOfferLine("Spring Tune-Up + Drain Clear Bundle", "$189"),
    ).toBe("Spring Tune-Up + Drain Clear Bundle for $189");
    expect(offerNameWithoutRepeatedPrice("first styling appointment")).toBe(
      "First styling appointment",
    );
    expect(
      offerNameWithoutRepeatedPrice("first styling appointment for $45"),
    ).toBe("First styling appointment");
  });

  it("fails field-label contact copy even when tokens are present", () => {
    const findings = evaluateDeclaredFlyerCreativeQuality(
      "Maya’s Mobile Boutique\nGrand Opening\n$45\nphone (804) 555-0142\nweb mayasmobileboutique.example",
    );
    expect(findings.map((finding) => finding.id)).toContain("field_label_leak");
  });

  it("reasoned flyer specs occupy a designed offer region instead of a sparse stack", () => {
    const truth = buildHarborOakFlyerProjectTruth({
      repoRoot: path.resolve(__dirname, "../../.."),
    });
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    expect(spec.layers.some((layer) => layer.id === "offer-panel")).toBe(true);
    expect(liveAreaOccupancy(spec)).toBeGreaterThan(0.55);
    expect(
      spec.layers.some(
        (layer) =>
          layer.type === "text" &&
          layer.role === "contact_phone" &&
          !/^phone\b/i.test(layer.content),
      ),
    ).toBe(true);
  });

  it("fails a hollow offer plate even when tokens and occupancy pass", () => {
    const truth = noPhotoBoutiqueTruth();
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    const hollow = {
      ...spec,
      layers: spec.layers
        .filter(
          (layer) =>
            layer.id !== "offer-medallion" &&
            layer.id !== "offer-medallion-inner",
        )
        .map((layer) =>
          layer.id === "offer-panel" && layer.type === "shape"
            ? { ...layer, y: 180, height: 980 }
            : layer,
        ),
    };
    const findings = evaluateFlyerSpecCreativeQuality(hollow, truth);
    expect(findings.map((finding) => finding.id)).toContain("hollow_offer_panel");
  });

  it("fails when headline and CTA repeat the same message", () => {
    const truth = noPhotoBoutiqueTruth();
    const spec = reasonFlyerDesignSpecDeterministic(truth, {
      capDominantGeometry: true,
    });
    const duplicated = {
      ...spec,
      layers: spec.layers.map((layer) =>
        layer.type === "text" && layer.role === "headline"
          ? { ...layer, content: truth.cta }
          : layer,
      ),
    };
    const findings = evaluateFlyerSpecCreativeQuality(duplicated, truth);
    expect(findings.map((finding) => finding.id)).toContain("duplicate_headline_cta");
  });

  it("fails a large unused painted field even when occupancy is gamed", () => {
    const truth = noPhotoBoutiqueTruth();
    const spec = reasonFlyerDesignSpecDeterministic(truth, {
      capDominantGeometry: true,
    });
    const hollowField = {
      ...spec,
      layers: [
        ...spec.layers,
        {
          type: "shape" as const,
          id: "dead-field",
          role: "plate" as const,
          x: 48,
          y: 1490,
          width: 928,
          height: 320,
          fill: "#3A2A24",
        },
      ],
    };
    const findings = evaluateFlyerSpecCreativeQuality(hollowField, truth);
    expect(findings.map((finding) => finding.id)).toContain("hollow_field_plate");
  });

  it("does not paint a second CTA when the headline already is that message", () => {
    const truth = {
      ...noPhotoBoutiqueTruth(),
      headline: "Call or visit",
    };
    const spec = reasonFlyerDesignSpecDeterministic(truth, {
      capDominantGeometry: true,
    });
    const headline = spec.layers.find(
      (layer) => layer.type === "text" && layer.role === "headline",
    );
    const cta = spec.layers.find(
      (layer) => layer.type === "text" && layer.role === "cta",
    );
    expect(headline?.type === "text" && headline.content).toBe("Call or visit");
    expect(cta).toBeUndefined();
    expect(
      evaluateFlyerSpecCreativeQuality(spec, truth).filter(
        (finding) => finding.severity === "fail",
      ),
    ).toEqual([]);
  });

  it("composes a no-photo flyer with a price seal instead of a blank field", () => {
    const truth = noPhotoBoutiqueTruth();
    const spec = reasonFlyerDesignSpecDeterministic(truth);
    expect(spec.layers.some((layer) => layer.id === "offer-medallion")).toBe(
      true,
    );
    expect(spec.layers.some((layer) => layer.id === "footer-band")).toBe(true);
    expect(offerPanelContentFillRatio(spec)).toBeLessThanOrEqual(1.85);
    const offer = spec.layers.find(
      (layer) => layer.type === "text" && layer.role === "offer",
    );
    const price = spec.layers.find(
      (layer) => layer.type === "text" && layer.role === "price",
    );
    expect(offer?.type === "text" && offer.content).toMatch(/styling appointment/i);
    expect(offer?.type === "text" && offer.content).not.toMatch(/\$45/);
    expect(price?.type === "text" && price.content).toMatch(/\$45/);
    const phone = spec.layers.find(
      (layer) => layer.type === "text" && layer.role === "contact_phone",
    );
    expect(phone?.type === "text" && !/^phone\b/i.test(phone.content)).toBe(
      true,
    );
    const medallion = spec.layers.find(
      (layer) => layer.type === "shape" && layer.id === "offer-medallion",
    );
    expect(medallion?.type === "shape" && medallion.height).toBeGreaterThanOrEqual(
      307,
    );
    expect(medallion?.type === "shape" && medallion.height).toBeLessThanOrEqual(
      450,
    );
    expect(
      evaluateFlyerSpecCreativeQuality(spec, truth).filter(
        (finding) => finding.severity === "fail",
      ),
    ).toEqual([]);

    const corrected = reasonFlyerDesignSpecDeterministic(truth, {
      capDominantGeometry: true,
      tightenComposition: true,
      preferOfferLedHierarchy: true,
    });
    const capped = corrected.layers.find(
      (layer) => layer.type === "shape" && layer.id === "offer-medallion",
    );
    expect(capped?.type === "shape" && capped.height).toBeGreaterThanOrEqual(
      307,
    );
    expect(
      evaluateFlyerSpecCreativeQuality(corrected, truth).filter(
        (finding) => finding.severity === "fail",
      ),
    ).toEqual([]);
  });

  it("fails when the offer line and price seal repeat the same price", () => {
    const truth = noPhotoBoutiqueTruth();
    const spec = reasonFlyerDesignSpecDeterministic(truth, {
      capDominantGeometry: true,
      tightenComposition: true,
    });
    const duplicated = {
      ...spec,
      layers: spec.layers.map((layer) =>
        layer.type === "text" && layer.role === "offer"
          ? { ...layer, content: "First styling appointment for $45" }
          : layer,
      ),
    };
    const findings = evaluateFlyerSpecCreativeQuality(duplicated, truth);
    expect(findings.map((finding) => finding.id)).toContain(
      "redundant_price_representation",
    );
  });

  it("packs identity and offer as one lockup on a sparse poster", () => {
    const truth = noPhotoBoutiqueTruth();
    const spec = reasonFlyerDesignSpecDeterministic(truth, {
      capDominantGeometry: true,
      tightenComposition: true,
    });
    const identityRule = spec.layers.find(
      (layer) => layer.type === "shape" && layer.id === "identity-rule",
    );
    const panel = spec.layers.find(
      (layer) => layer.type === "shape" && layer.id === "offer-panel",
    );
    expect(identityRule?.type).toBe("shape");
    expect(panel?.type).toBe("shape");
    if (identityRule?.type !== "shape" || panel?.type !== "shape") return;
    expect(panel.y - (identityRule.y + identityRule.height)).toBeLessThanOrEqual(
      180,
    );
    expect(
      evaluateFlyerSpecCreativeQuality(spec, truth).filter(
        (finding) => finding.severity === "fail",
      ),
    ).toEqual([]);
  });
});

function noPhotoBoutiqueTruth(): FlyerProjectTruth {
  const harbor = buildHarborOakFlyerProjectTruth({
    repoRoot: path.resolve(__dirname, "../../.."),
  });
  return {
    ...harbor,
    outputMode: "customer",
    businessName: "Northside Atelier",
    wordmark: "Northside Atelier",
    descriptor: "",
    headline: "Grand Opening",
    offerName: "first styling appointment",
    priceDisplay: "$45",
    wasPriceDisplay: "",
    dateWindow: "",
    body: "",
    cta: "Call or visit",
    phone: "(804) 555-0142",
    webDisplay: "northsideatelier.example",
    webUrl: "https://northsideatelier.example",
    disclaimer: "",
    approvedLogoVariantId: null,
    materials: [],
    requiredTextTokens: ["$45", "Grand Opening", "styling"],
    prohibitedClaimPatterns: [
      "See offer details",
      "Book online or call",
      "flyer for",
    ],
  };
}
