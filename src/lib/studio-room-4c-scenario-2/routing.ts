/**
 * Room 4C Scenario 2 — production routing from one brief.
 * Routing cannot begin until required launch facts are approved.
 */

import { studioRoom4cScenario2HarborRoastV1 as brief } from "@/config/studio-room-4c-scenario-2-harbor-roast-v1";

import { assertScenario2ProductionRoutingAllowed } from "./fact-integrity";

export type Scenario2Route = {
  deliverableId: string;
  launchNowService: string;
  productionPath: string;
  toolId: string;
  skuId: string;
  note: string;
};

export function routeScenario2Services(): readonly Scenario2Route[] {
  assertScenario2ProductionRoutingAllowed();
  return [
    {
      deliverableId: "campaign-direction",
      launchNowService: "campaign-creative",
      productionPath: "scenario_2_direction_from_brief",
      toolId: "studio_campaign_creative",
      skuId: "campaign-creative",
      note: "Written campaign direction bound to the hashed Harbor Roast brief.",
    },
    {
      deliverableId: "campaign-set",
      launchNowService: "campaign-creative",
      productionPath: "studio_campaign_creative_pipeline",
      toolId: "studio_campaign_creative",
      skuId: "campaign-creative",
      note: "Coordinator. One CreativeBrief drives square social, vertical social, and 5×7 counter card.",
    },
    {
      deliverableId: "social-square",
      launchNowService: "social-graphics",
      productionPath: "studio_campaign_creative_pipeline",
      toolId: "studio_campaign_creative",
      skuId: "v2-rtu-social-posts",
      note: "Square PNG from the shared campaign set (social_square).",
    },
    {
      deliverableId: "social-vertical",
      launchNowService: "social-graphics",
      productionPath: "studio_campaign_creative_pipeline",
      toolId: "studio_campaign_creative",
      skuId: "v2-rtu-social-posts",
      note: "Vertical PNG from the shared campaign set (social_vertical).",
    },
    {
      deliverableId: "print-counter-card",
      launchNowService: "print-collateral",
      productionPath: "studio_campaign_creative_pipeline",
      toolId: "studio_campaign_creative",
      skuId: "v2-rtu-flyer",
      note: "5×7 counter card PNG + PDF. Print CTA and authorized product URL.",
    },
    {
      deliverableId: "promo-caption",
      launchNowService: "marketing-copy-email",
      productionPath: "scenario_2_copy_from_brief",
      toolId: "studio_copy_quality_gate",
      skuId: "marketing-copy",
      note: "Paste-ready caption assembled from the same campaign facts.",
    },
    {
      deliverableId: "promo-email",
      launchNowService: "marketing-copy-email",
      productionPath: "scenario_2_copy_from_brief",
      toolId: "studio_copy_quality_gate",
      skuId: "marketing-copy",
      note: "Paste-ready promotional email with authorized product URL and support email.",
    },
    {
      deliverableId: "short-vertical-video",
      launchNowService: "short-form-video",
      productionPath: "shotstack_work_packet",
      toolId: "shotstack",
      skuId: "v2-rtu-short-video",
      note: "Vertical MP4 from the same facts and visual system. ElevenLabs TTS is supporting narration, not a sold voice SKU.",
    },
  ];
}

export function scenario2RoutingUsesSharedFacts(): boolean {
  return routeScenario2Services().every((r) =>
    brief.facts.headline.includes("Autumn Single-Origin Box"),
  );
}
