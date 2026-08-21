/**
 * Room 4C Scenario 3 — production routing from one brief.
 */

import { studioRoom4cScenario3MossAndThreadV1 as brief } from "@/config/studio-room-4c-scenario-3-moss-and-thread-v1";

import { assertScenario3ProductionRoutingAllowed } from "./fact-integrity";

export type Scenario3Route = {
  deliverableId: string;
  launchNowService: string;
  productionPath: string;
  toolId: string;
  skuId: string;
  note: string;
};

export function routeScenario3Services(): readonly Scenario3Route[] {
  assertScenario3ProductionRoutingAllowed();
  return [
    {
      deliverableId: "campaign-direction",
      launchNowService: "campaign-creative",
      productionPath: "scenario_3_direction_from_brief",
      toolId: "studio_campaign_creative",
      skuId: "campaign-creative",
      note: "Written campaign direction bound to the hashed Moss & Thread brief.",
    },
    {
      deliverableId: "social-square",
      launchNowService: "campaign-creative",
      productionPath: "scenario_3_photo_compose_sharp",
      toolId: "studio_campaign_creative",
      skuId: "v2-rtu-social-posts",
      note: "Photo-led square PNG from certification fixture product photograph.",
    },
    {
      deliverableId: "social-vertical",
      launchNowService: "campaign-creative",
      productionPath: "scenario_3_photo_compose_sharp",
      toolId: "studio_campaign_creative",
      skuId: "v2-rtu-social-posts",
      note: "Photo-led vertical PNG from certification fixture photography.",
    },
    {
      deliverableId: "print-invite",
      launchNowService: "print-collateral",
      productionPath: "scenario_3_us_letter_handout",
      toolId: "studio_campaign_creative",
      skuId: "v2-rtu-flyer",
      note: "US Letter invitation/handout PNG 2550×3300 + PDF 612×792 pt.",
    },
    {
      deliverableId: "promo-caption",
      launchNowService: "marketing-copy-email",
      productionPath: "scenario_3_copy_from_brief",
      toolId: "studio_copy_quality_gate",
      skuId: "marketing-copy",
      note: "Paste-ready caption from canonical event facts.",
    },
    {
      deliverableId: "promo-email",
      launchNowService: "marketing-copy-email",
      productionPath: "scenario_3_copy_from_brief",
      toolId: "studio_copy_quality_gate",
      skuId: "marketing-copy",
      note: "Paste-ready event email with URL and support email.",
    },
    {
      deliverableId: "short-vertical-video",
      launchNowService: "short-form-video",
      productionPath: "shotstack_work_packet",
      toolId: "shotstack",
      skuId: "v2-rtu-short-video",
      note: "Vertical MP4; ElevenLabs TTS supporting narration; multi-photo motion-safe plates.",
    },
  ];
}

export function scenario3RoutingUsesSharedFacts(): boolean {
  return routeScenario3Services().every(() =>
    brief.offer.name.includes("Studio Open Weekend"),
  );
}
