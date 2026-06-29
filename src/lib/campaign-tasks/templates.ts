import type { ProductionTaskFamilyId, TaskPhase } from "./types";

export type TaskBlueprint = {
  phase: TaskPhase;
  titleSuffix: string;
};

const BRAND_PIPELINE: readonly TaskBlueprint[] = [
  { phase: "strategy", titleSuffix: "Strategy" },
  { phase: "creative_copy", titleSuffix: "Creative & copy" },
  { phase: "qa", titleSuffix: "QA review" },
  { phase: "delivery_prep", titleSuffix: "Delivery prep" },
];

const CAMPAIGN_PIPELINE: readonly TaskBlueprint[] = [
  { phase: "strategy", titleSuffix: "Campaign strategy" },
  { phase: "qa", titleSuffix: "QA review" },
  { phase: "delivery_prep", titleSuffix: "Delivery prep" },
];

const SOCIAL_PIPELINE: readonly TaskBlueprint[] = [
  { phase: "strategy_content_direction", titleSuffix: "Content direction" },
  { phase: "copy", titleSuffix: "Copy" },
  { phase: "creative", titleSuffix: "Creative" },
  { phase: "qa", titleSuffix: "QA review" },
  { phase: "delivery_prep", titleSuffix: "Delivery prep" },
];

const COPY_PIPELINE: readonly TaskBlueprint[] = [
  { phase: "copy", titleSuffix: "Copy" },
  { phase: "qa", titleSuffix: "QA review" },
  { phase: "delivery_prep", titleSuffix: "Delivery prep" },
];

const VIDEO_PIPELINE: readonly TaskBlueprint[] = [
  { phase: "creative_production", titleSuffix: "Creative & production" },
  { phase: "qa", titleSuffix: "QA review" },
  { phase: "delivery_prep", titleSuffix: "Delivery prep" },
];

const LANDING_PAGE_PIPELINE: readonly TaskBlueprint[] = [
  { phase: "strategy", titleSuffix: "Strategy & creative direction" },
  { phase: "copy", titleSuffix: "Copy" },
  { phase: "qa", titleSuffix: "QA review" },
  { phase: "delivery_prep", titleSuffix: "Delivery prep" },
];

const OPTIMIZATION_PIPELINE: readonly TaskBlueprint[] = [
  { phase: "review_strategy", titleSuffix: "Review & strategy" },
  { phase: "qa", titleSuffix: "QA review" },
  { phase: "delivery_prep", titleSuffix: "Delivery prep" },
];

const ASSETS_PIPELINE: readonly TaskBlueprint[] = [
  { phase: "creative", titleSuffix: "Creative" },
  { phase: "qa", titleSuffix: "QA review" },
  { phase: "delivery_prep", titleSuffix: "Delivery prep" },
];

export const FAMILY_TASK_PIPELINES: Record<
  ProductionTaskFamilyId,
  readonly TaskBlueprint[]
> = {
  brand_identity_messaging: BRAND_PIPELINE,
  campaign_launch_monthly: CAMPAIGN_PIPELINE,
  social: SOCIAL_PIPELINE,
  copy_channels: COPY_PIPELINE,
  video_audio: VIDEO_PIPELINE,
  landing_page: LANDING_PAGE_PIPELINE,
  optimization: OPTIMIZATION_PIPELINE,
  marketing_assets: ASSETS_PIPELINE,
};

export const CAMPAIGN_LEVEL_TASKS = {
  producerKickoff: {
    id: "campaign:producer-kickoff",
    title: "Producer kickoff",
    phase: "strategy" as const,
  },
  finalPackageAssembly: {
    id: "campaign:final-package-assembly",
    title: "Final package assembly",
    phase: "delivery_prep" as const,
  },
} as const;
