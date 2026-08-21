import { describe, expect, it } from "vitest";

import {
  assertProductRepresentation,
  buildPackagedUnitVisualPrompt,
  evaluateProductRepresentation,
} from "./evaluate";
import type {
  AuthorizedProductRepresentation,
  VisualProductionSpecification,
} from "./types";

const THREE_SEALED: AuthorizedProductRepresentation = {
  unitCount: 3,
  unitType: "sealed 8-ounce coffee bags",
  packageType: "sealed_bags",
  productDescription: "three 8-ounce bags of whole-bean single-origin coffee",
};

const STYLING =
  "A few decorative beans and autumn leaves on a dark wood table are acceptable only as styling around the three sealed bags. Window light, roast-brown and cream palette, linen cloth, photorealistic food and product photography, no text, no logos, no neon, no watermark.";

function threePackagedSpec(
  overrides: Partial<VisualProductionSpecification> = {},
): VisualProductionSpecification {
  const prompt = buildPackagedUnitVisualPrompt({
    productName: "the Autumn Single-Origin Box",
    unitCount: 3,
    unitType: THREE_SEALED.unitType,
    visualUnitType: "packaged coffee bags",
    stylingNotes: STYLING,
  });
  return {
    specId: "test-three-packaged",
    visualUnitCount: 3,
    visualUnitType: "packaged coffee bags",
    packageType: "packaged_bags",
    productDescription: THREE_SEALED.productDescription,
    generationPrompt: prompt,
    boundFormatIds: [
      "social_square",
      "social_vertical",
      "print_counter_card",
      "short_vertical_video",
    ],
    forbiddenDepictions: ["single open sack of loose beans"],
    ...overrides,
  };
}

describe("product-representation gate", () => {
  it("fails when one depicted bag is specified against an authorized count of three", () => {
    const result = evaluateProductRepresentation({
      authorized: THREE_SEALED,
      visualSpec: threePackagedSpec({
        visualUnitCount: 1,
        generationPrompt:
          "Warm product photo of one sealed 8-ounce coffee bag in a gift box.",
      }),
      postRenderAltText: "three sealed 8-ounce coffee bags",
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain("unit_count_mismatch");
    expect(result.findings.map((f) => f.code)).toContain(
      "post_render_alt_text_cannot_substitute",
    );
  });

  it("fails when loose bulk coffee substitutes for three packaged bags", () => {
    const result = evaluateProductRepresentation({
      authorized: THREE_SEALED,
      visualSpec: threePackagedSpec({
        visualUnitType: "loose bulk coffee",
        packageType: "loose_bulk",
        generationPrompt:
          "Photograph of three scoops of loose bulk coffee beans poured into an open box.",
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      "loose_bulk_substituted_for_packaged_bags",
    );
  });

  it("passes three packaged bags bound to authorized sealed-bag facts", () => {
    const spec = threePackagedSpec();
    const result = evaluateProductRepresentation({
      authorized: THREE_SEALED,
      visualSpec: spec,
    });
    expect(result.ok).toBe(true);
    expect(() =>
      assertProductRepresentation({
        authorized: THREE_SEALED,
        visualSpec: spec,
      }),
    ).not.toThrow();
  });

  it("fails unauthorized product claims in labels or copy", () => {
    const result = evaluateProductRepresentation({
      authorized: THREE_SEALED,
      visualSpec: threePackagedSpec(),
      copySources: [
        {
          sourceId: "caption",
          text: "Award-winning Ethiopian tasting notes with free shipping.",
        },
      ],
      unauthorizedClaimPatterns: [
        "award-winning",
        "ethiopian",
        "tasting notes",
        "free shipping",
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      "unauthorized_product_claim",
    );
  });

  it("fails when the generation prompt is unbound from authorized unit facts", () => {
    const result = evaluateProductRepresentation({
      authorized: THREE_SEALED,
      visualSpec: threePackagedSpec({
        generationPrompt: "Pretty autumn coffee still life, no product count.",
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      "visual_spec_unbound_from_product_facts",
    );
  });
});
