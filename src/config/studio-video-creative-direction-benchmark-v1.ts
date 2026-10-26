/**
 * STUDIO-VIDEO-CREATIVE-DIRECTION-BENCHMARK-1
 * Inventory / architecture only. Does not build Clip. Does not public-switch $349.
 */

export const STUDIO_VIDEO_CREATIVE_DIRECTION_BENCHMARK_PACKAGE_ID =
  "STUDIO-VIDEO-CREATIVE-DIRECTION-BENCHMARK-1" as const;

export type VideoCapabilityStatus =
  | "HAVE"
  | "PARTIAL"
  | "ABSENT"
  | "INTENTIONALLY_OUT_OF_CURRENT_LAUNCH_SCOPE";

export type VideoCapabilityProduct =
  | "short_form_content_pack_349"
  | "clip_repurposing_549"
  | "future_ad_creative"
  | "intentionally_out_of_launch_scope";

export type VideoCapabilityRow = {
  id: string;
  label: string;
  status: VideoCapabilityStatus;
  products: readonly VideoCapabilityProduct[];
};

export const studioVideoCreativeDirectionBenchmarkV1 = {
  packageId: STUDIO_VIDEO_CREATIVE_DIRECTION_BENCHMARK_PACKAGE_ID,
  authorizedAt: "2026-09-27" as const,
  kind: "inventory_architecture" as const,
  protected349State: "FACTORY_READY_WITH_EXPLICIT_LIMITS" as const,
  publicCatalogSwitched: false as const,
  publicPriceCentsUnchanged: 34900 as const,
  clipPriceCentsUnchanged: 54900 as const,
  doNotBuildClip: true as const,
  doNotAddVendors: true as const,
  doNotSubscribeToCompetitors: true as const,
  doNotCopyAnotherProduct: true as const,
  doNotChangePublicPrices: true as const,
  doNotChangePublicCatalog: true as const,
  doNotWeaken349ReviewLoop: true as const,
  doNotSendRoutine349ClipsToOwner: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  qualityJudgesRenderedMp4: true as const,
  architecture: [
    "customer_goal_and_material",
    "creative_direction",
    "machine",
    "production",
    "quality",
    "correction_loop",
    "final_delivery",
  ] as const,
  missingObject: "durable_creative_direction_contract" as const,
  stampDir:
    "docs/launch/studio-video-creative-direction-benchmark-1" as const,
  capabilities: [
    {
      id: "rough_cut_filler",
      label: "intelligent rough cut / filler removal",
      status: "PARTIAL",
      products: ["short_form_content_pack_349", "clip_repurposing_549"],
    },
    {
      id: "complete_thought",
      label: "complete-thought editing",
      status: "HAVE",
      products: ["short_form_content_pack_349", "clip_repurposing_549"],
    },
    {
      id: "context_broll",
      label: "context-aware B-roll",
      status: "PARTIAL",
      products: ["short_form_content_pack_349"],
    },
    {
      id: "word_synced_captions",
      label: "word-synced captions",
      status: "HAVE",
      products: ["short_form_content_pack_349", "clip_repurposing_549"],
    },
    {
      id: "kinetic_captions",
      label: "motion / kinetic captions",
      status: "INTENTIONALLY_OUT_OF_CURRENT_LAUNCH_SCOPE",
      products: ["future_ad_creative", "intentionally_out_of_launch_scope"],
    },
    {
      id: "reframe",
      label: "vertical / square / horizontal reframing",
      status: "INTENTIONALLY_OUT_OF_CURRENT_LAUNCH_SCOPE",
      products: ["intentionally_out_of_launch_scope", "future_ad_creative"],
    },
    {
      id: "punch_ins",
      label: "punch-ins / zooms / simple camera moves",
      status: "PARTIAL",
      products: ["short_form_content_pack_349"],
    },
    {
      id: "transitions",
      label: "transitions",
      status: "INTENTIONALLY_OUT_OF_CURRENT_LAUNCH_SCOPE",
      products: ["intentionally_out_of_launch_scope", "future_ad_creative"],
    },
    {
      id: "voice_cleanup",
      label: "voice cleanup / denoise",
      status: "PARTIAL",
      products: ["short_form_content_pack_349", "clip_repurposing_549"],
    },
    {
      id: "music_fit",
      label: "music selection / mix",
      status: "PARTIAL",
      products: ["short_form_content_pack_349"],
    },
    {
      id: "meaning_sfx",
      label: "sound effects tied to meaning",
      status: "INTENTIONALLY_OUT_OF_CURRENT_LAUNCH_SCOPE",
      products: ["future_ad_creative", "intentionally_out_of_launch_scope"],
    },
    {
      id: "brand_kit",
      label: "customer brand kit",
      status: "ABSENT",
      products: ["future_ad_creative"],
    },
    {
      id: "cta_ending",
      label: "CTA / ending treatment",
      status: "HAVE",
      products: ["short_form_content_pack_349", "clip_repurposing_549"],
    },
    {
      id: "conversational_revision",
      label: "conversational revision instructions",
      status: "PARTIAL",
      products: ["short_form_content_pack_349", "clip_repurposing_549"],
    },
    {
      id: "one_source_several_shorts",
      label: "one source → several finished shorts",
      status: "PARTIAL",
      products: ["short_form_content_pack_349", "clip_repurposing_549"],
    },
    {
      id: "platform_variants",
      label: "platform-specific output variants",
      status: "INTENTIONALLY_OUT_OF_CURRENT_LAUNCH_SCOPE",
      products: ["future_ad_creative", "intentionally_out_of_launch_scope"],
    },
    {
      id: "quality_rendered_mp4",
      label: "Quality review of actual rendered MP4",
      status: "HAVE",
      products: ["short_form_content_pack_349", "clip_repurposing_549"],
    },
    {
      id: "machine_correction_loop",
      label: "Machine-driven internal correction loop",
      status: "HAVE",
      products: ["short_form_content_pack_349", "clip_repurposing_549"],
    },
  ] satisfies readonly VideoCapabilityRow[],
  smallestNextImplementationPackage:
    "STUDIO-VIDEO-CREATIVE-DIRECTION-CONTRACT-WIRE-1" as const,
  nextIsNotClipBuild: true as const,
  ownerFinal349CertRequiredBeforePublicSwitch: true as const,
} as const;
