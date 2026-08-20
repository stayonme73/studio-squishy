/**
 * Scenario 1 collectors for the generic customer-fact source gate.
 * Social, caption, print, video plate, and narration are named sources.
 */

import { studioRoom4cScenario1CedarLaneV1 as brief } from "@/config/studio-room-4c-scenario-1-cedar-lane-v1";
import {
  CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1,
  emitAssetLayers,
  getLayoutRecipe,
} from "@/lib/studio-campaign-creative";
import type { CampaignDesignLayer } from "@/lib/studio-campaign-creative";
import {
  assertCustomerFactSourceGate,
  evaluateCustomerFactSourceGate,
  type CustomerFactSource,
  type CustomerFactSourceGateResult,
} from "@/lib/studio-customer-facts";

import { buildCedarLaneCreativeBrief } from "./brief";
import { buildScenario1Caption, buildScenario1NarrationScript } from "./copy";
import {
  scenario1CanonicalCustomerFacts,
  SCENARIO_1_APPROVED_CUSTOMER_FACT_RECORD,
} from "./fact-integrity";
import { scenario1VideoCtaPlateCopy, scenario1VideoPlateCopy } from "./video-plates";

function joinTextLayers(layers: readonly CampaignDesignLayer[]): string {
  return layers
    .filter(
      (layer): layer is Extract<CampaignDesignLayer, { type: "text" }> =>
        layer.type === "text",
    )
    .map((layer) => layer.content)
    .join("\n");
}

function emitCedarLayers(formatId: "social_square" | "print_handout") {
  const creative = buildCedarLaneCreativeBrief();
  const recipe = getLayoutRecipe(
    "full_bleed_hero",
    formatId,
    formatId === "print_handout" ? creative.printHandoutContractId : undefined,
  );
  return emitAssetLayers({
    recipe,
    brief: creative,
    system: CEDAR_LANE_HOME_ORGANIZING_VISUAL_SYSTEM_V1,
    heroPreparedMaterialId: "hero",
    logoMaterialId: "logo",
  });
}

export function collectScenario1CustomerFactSources(): CustomerFactSource[] {
  const squareLayers = emitCedarLayers("social_square");
  const printLayers = emitCedarLayers("print_handout");
  const contact = printLayers.find(
    (layer) => layer.type === "text" && layer.role === "contact",
  );
  const contactText = contact?.type === "text" ? contact.content : "";
  const ctaPlate = scenario1VideoCtaPlateCopy();
  const offerPlate = scenario1VideoPlateCopy()[1];
  if (!offerPlate) throw new Error("SCENARIO_1_OFFER_PLATE_MISSING");

  return [
    {
      sourceId: "social-square-layers",
      text: joinTextLayers(squareLayers),
      requireExact: ["offerName", "datesDisplay", "cta"],
    },
    {
      sourceId: "caption",
      text: buildScenario1Caption(),
      requireExact: [
        "offerName",
        "datesDisplay",
        "cta",
        "phoneDisplay",
        "bookingUrl",
        "businessName",
      ],
    },
    {
      sourceId: "print-contact-layer",
      text: contactText,
      requireExact: ["phoneDisplay", "bookingUrl", "bookingContact"],
    },
    {
      sourceId: "print-handout-layers",
      text: joinTextLayers(printLayers),
      requireExact: ["offerName", "datesDisplay", "cta"],
    },
    {
      sourceId: "video-cta-plate",
      text: `${ctaPlate.line1}\n${ctaPlate.line2 ?? ""}`,
      requireExact: ["phoneDisplay", "bookingUrl"],
    },
    {
      sourceId: "video-offer-plate",
      text: [offerPlate.eyebrow, offerPlate.line1, offerPlate.line2, offerPlate.line3]
        .filter(Boolean)
        .join("\n"),
      requireExact: ["offerName"],
    },
    {
      sourceId: "narration",
      text: buildScenario1NarrationScript(),
      requireExact: ["offerName", "businessName"],
      forbidExact: ["phoneDisplay", "bookingUrl"],
      forbidSubstrings: [brief.cta.phoneSpoken, brief.cta.bookingUrlSpoken],
    },
  ];
}

export function evaluateScenario1CustomerFactSourceGate(): CustomerFactSourceGateResult {
  return evaluateCustomerFactSourceGate({
    approvedRecord: SCENARIO_1_APPROVED_CUSTOMER_FACT_RECORD,
    candidateValues: scenario1CanonicalCustomerFacts().values,
    sources: collectScenario1CustomerFactSources(),
  });
}

export function assertScenario1CustomerFactSourceGate(): void {
  assertCustomerFactSourceGate({
    approvedRecord: SCENARIO_1_APPROVED_CUSTOMER_FACT_RECORD,
    candidateValues: scenario1CanonicalCustomerFacts().values,
    sources: collectScenario1CustomerFactSources(),
  });
}
