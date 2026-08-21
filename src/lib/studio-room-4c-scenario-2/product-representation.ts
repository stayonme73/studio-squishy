/**
 * Scenario 2 product representation.
 * Authorized contents are three sealed 8-ounce bags. The visual production
 * specification used to create the hero photograph must depict three packaged
 * bags. Post-render alt text is not a substitute.
 */

import {
  HARBOR_ROAST_AUTHORIZED_CONTENTS,
  studioRoom4cScenario2HarborRoastV1 as brief,
} from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";
import {
  assertProductRepresentation,
  buildPackagedUnitVisualPrompt,
  evaluateProductRepresentation,
  type AuthorizedProductRepresentation,
  type ProductRepresentationCheckResult,
  type VisualProductionSpecification,
} from "@/lib/studio-product-representation";

import {
  buildScenario2Caption,
  formatScenario2EmailPasteReady,
} from "./copy";
import { collectScenario2CustomerFactSources } from "./customer-fact-sources";

export const SCENARIO_2_AUTHORIZED_UNIT_COUNT = 3 as const;
export const SCENARIO_2_AUTHORIZED_UNIT_TYPE =
  "sealed 8-ounce coffee bags" as const;
export const SCENARIO_2_VISUAL_UNIT_TYPE = "packaged coffee bags" as const;

export const SCENARIO_2_HERO_STYLING_NOTES =
  "A few decorative beans and autumn leaves on a dark wood table are acceptable only as styling around the three sealed bags. Window light, roast-brown and cream palette, linen cloth, photorealistic food and product photography, no text, no logos, no neon, no watermark." as const;

export const SCENARIO_2_APPROVED_PRODUCT_REPRESENTATION: AuthorizedProductRepresentation =
  {
    unitCount: SCENARIO_2_AUTHORIZED_UNIT_COUNT,
    unitType: SCENARIO_2_AUTHORIZED_UNIT_TYPE,
    packageType: "sealed_bags",
    productDescription: HARBOR_ROAST_AUTHORIZED_CONTENTS,
  };

export const SCENARIO_2_HERO_GENERATION_PROMPT = buildPackagedUnitVisualPrompt({
  productName: brief.offer.name,
  unitCount: SCENARIO_2_AUTHORIZED_UNIT_COUNT,
  unitType: SCENARIO_2_AUTHORIZED_UNIT_TYPE,
  visualUnitType: SCENARIO_2_VISUAL_UNIT_TYPE,
  stylingNotes: SCENARIO_2_HERO_STYLING_NOTES,
});

export const SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC: VisualProductionSpecification =
  {
    specId: "harbor-roast-hero-three-packaged-bags-v1",
    visualUnitCount: SCENARIO_2_AUTHORIZED_UNIT_COUNT,
    visualUnitType: SCENARIO_2_VISUAL_UNIT_TYPE,
    packageType: "packaged_bags",
    productDescription: HARBOR_ROAST_AUTHORIZED_CONTENTS,
    generationPrompt: SCENARIO_2_HERO_GENERATION_PROMPT,
    boundFormatIds: [
      "social_square",
      "social_vertical",
      "print_counter_card",
      "short_vertical_video",
    ],
    forbiddenDepictions: ["single open sack of loose beans"],
  };

export const SCENARIO_2_UNAUTHORIZED_PRODUCT_CLAIM_PATTERNS = [
  "award-winning",
  "ethiopian",
  "colombian",
  "tasting notes",
  "free shipping",
  "50% off",
  String.raw`\blimited\b`,
] as const;

export function scenario2ProductRepresentationInput() {
  return {
    authorized: SCENARIO_2_APPROVED_PRODUCT_REPRESENTATION,
    visualSpec: SCENARIO_2_HERO_VISUAL_PRODUCTION_SPEC,
    copySources: [
      { sourceId: "caption", text: buildScenario2Caption() },
      { sourceId: "email", text: formatScenario2EmailPasteReady() },
      ...collectScenario2CustomerFactSources().map((source) => ({
        sourceId: source.sourceId,
        text: source.text,
      })),
    ],
    unauthorizedClaimPatterns: [...SCENARIO_2_UNAUTHORIZED_PRODUCT_CLAIM_PATTERNS],
  };
}

export function evaluateScenario2ProductRepresentation(): ProductRepresentationCheckResult {
  return evaluateProductRepresentation(scenario2ProductRepresentationInput());
}

export function assertScenario2ProductRepresentation(): void {
  assertProductRepresentation(scenario2ProductRepresentationInput());
}
