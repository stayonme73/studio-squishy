/**
 * Room 4C Scenario 1 — production routing from one brief.
 */

import { studioRoom4cScenario1CedarLaneV1 as brief } from "@/config/studio-room-4c-scenario-1-cedar-lane-v1";

export type Scenario1Route = {
  deliverableId: string;
  launchNowService: string;
  productionPath: string;
  toolId: string;
  skuId: string;
  note: string;
};

export function routeScenario1Services(): readonly Scenario1Route[] {
  return [
    {
      deliverableId: "campaign-set",
      launchNowService: "campaign-creative",
      productionPath: "studio_campaign_creative_pipeline",
      toolId: "studio_campaign_creative",
      skuId: "campaign-creative",
      note: "Coordinator. One CreativeBrief drives square social, vertical static, and print handout.",
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
      deliverableId: "print-handout",
      launchNowService: "print-collateral",
      productionPath: "studio_campaign_creative_pipeline",
      toolId: "studio_campaign_creative",
      skuId: "v2-rtu-flyer",
      note: "One-page PNG + PDF from the shared campaign set (print_handout). Print CTA is contact/URL, not a web button.",
    },
    {
      deliverableId: "promo-caption",
      launchNowService: "marketing-copy-email",
      productionPath: "scenario_1_copy_from_brief",
      toolId: "studio_copy_quality_gate",
      skuId: "marketing-copy",
      note: "Paste-ready caption assembled from the same campaign facts. Not a full email kit.",
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

export function scenario1RoutingUsesSharedFacts(): boolean {
  return routeScenario1Services().every((r) =>
    brief.facts.headline.includes("Fall Closet Reset"),
  );
}
