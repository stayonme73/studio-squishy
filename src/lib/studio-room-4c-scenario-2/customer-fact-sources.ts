/**
 * Scenario 2 collectors for the generic customer-fact source gate.
 */

import {
  emitAssetLayers,
  getLayoutRecipe,
  HARBOR_ROAST_COFFEE_VISUAL_SYSTEM_V1,
} from "@/lib/studio-campaign-creative";
import type { CampaignDesignLayer } from "@/lib/studio-campaign-creative";
import {
  assertCustomerFactSourceGate,
  evaluateCustomerFactSourceGate,
  type CustomerFactSource,
  type CustomerFactSourceGateResult,
} from "@/lib/studio-customer-facts";

import { buildHarborRoastCreativeBrief } from "./brief";
import {
  buildScenario2Caption,
  buildScenario2NarrationScript,
  formatScenario2EmailPasteReady,
} from "./copy";
import {
  scenario2CanonicalCustomerFacts,
  SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD,
  SCENARIO_2_STALE_BOOKING_URL,
  SCENARIO_2_STALE_PHONE,
} from "./fact-integrity";
import { scenario2VideoCtaPlateCopy, scenario2VideoPlateCopy } from "./video-plates";

function joinTextLayers(layers: readonly CampaignDesignLayer[]): string {
  return layers
    .filter(
      (layer): layer is Extract<CampaignDesignLayer, { type: "text" }> =>
        layer.type === "text",
    )
    .map((layer) => layer.content)
    .join("\n");
}

function emitHarborLayers(
  formatId: "social_square" | "social_vertical" | "print_counter_card",
) {
  const creative = buildHarborRoastCreativeBrief();
  const recipe = getLayoutRecipe("full_bleed_hero", formatId);
  return emitAssetLayers({
    recipe,
    brief: creative,
    system: HARBOR_ROAST_COFFEE_VISUAL_SYSTEM_V1,
    heroPreparedMaterialId: "hero",
    logoMaterialId: "logo",
  });
}

export function collectScenario2CustomerFactSources(): CustomerFactSource[] {
  const squareLayers = emitHarborLayers("social_square");
  const verticalLayers = emitHarborLayers("social_vertical");
  const printLayers = emitHarborLayers("print_counter_card");
  const ctaPlate = scenario2VideoCtaPlateCopy();
  const offerPlate = scenario2VideoPlateCopy()[1];
  const pricePlate = scenario2VideoPlateCopy()[2];
  if (!offerPlate) throw new Error("SCENARIO_2_OFFER_PLATE_MISSING");
  if (!pricePlate) throw new Error("SCENARIO_2_PRICE_PLATE_MISSING");

  const socialRequired = [
    "offerName",
    "datesDisplay",
    "priceDisplay",
    "contentsDisplay",
    "cta",
    "bookingUrl",
  ] as const;

  return [
    {
      sourceId: "social-square-layers",
      text: joinTextLayers(squareLayers),
      requireExact: socialRequired,
    },
    {
      sourceId: "social-vertical-layers",
      text: joinTextLayers(verticalLayers),
      requireExact: socialRequired,
    },
    {
      sourceId: "caption",
      text: buildScenario2Caption(),
      requireExact: [
        "offerName",
        "datesDisplay",
        "priceDisplay",
        "contentsDisplay",
        "cta",
        "businessName",
        "bookingUrl",
      ],
    },
    {
      sourceId: "email",
      text: formatScenario2EmailPasteReady(),
      requireExact: [
        "offerName",
        "datesDisplay",
        "priceDisplay",
        "contentsDisplay",
        "cta",
        "businessName",
        "bookingUrl",
        "emailDisplay",
      ],
    },
    {
      sourceId: "print-counter-card-layers",
      text: joinTextLayers(printLayers),
      requireExact: [
        "offerName",
        "datesDisplay",
        "priceDisplay",
        "contentsDisplay",
        "cta",
        "bookingUrl",
      ],
    },
    {
      sourceId: "video-cta-plate",
      text: [ctaPlate.line1, ctaPlate.line2, ctaPlate.line3]
        .filter(Boolean)
        .join("\n"),
      requireExact: ["priceDisplay", "cta", "bookingUrl"],
    },
    {
      sourceId: "video-offer-plate",
      text: [offerPlate.eyebrow, offerPlate.line1, offerPlate.line2, offerPlate.line3]
        .filter(Boolean)
        .join("\n"),
      requireExact: ["offerName", "contentsDisplay"],
    },
    {
      sourceId: "video-price-plate",
      text: [pricePlate.line1, pricePlate.line2, pricePlate.line3]
        .filter(Boolean)
        .join("\n"),
      requireExact: ["priceDisplay", "datesDisplay"],
    },
    {
      sourceId: "narration",
      text: buildScenario2NarrationScript(),
      requireExact: ["businessName", "offerName", "contentsDisplay"],
      forbidExact: ["bookingUrl", "emailDisplay"],
      forbidSubstrings: [SCENARIO_2_STALE_PHONE, SCENARIO_2_STALE_BOOKING_URL],
    },
  ];
}

export function evaluateScenario2CustomerFactSourceGate(): CustomerFactSourceGateResult {
  return evaluateCustomerFactSourceGate({
    approvedRecord: SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD,
    candidateValues: scenario2CanonicalCustomerFacts().values,
    sources: collectScenario2CustomerFactSources(),
  });
}

export function assertScenario2CustomerFactSourceGate(): void {
  assertCustomerFactSourceGate({
    approvedRecord: SCENARIO_2_APPROVED_CUSTOMER_FACT_RECORD,
    candidateValues: scenario2CanonicalCustomerFacts().values,
    sources: collectScenario2CustomerFactSources(),
  });
}
