/**
 * Truthful short-video production chain.
 * CapCut assembly/export is named but not Studio-integrated.
 */

import type { VideoProductionSku } from "./contracts";

export type VideoChainStepId =
  | "customer_brief_assets"
  | "script_copy_lock"
  | "storyboard_shot_sequence"
  | "asset_preparation"
  | "optional_certified_voice_mp3"
  | "video_assembly"
  | "captions_text_timing"
  | "audio_music_handling"
  | "render_export"
  | "artifact_persistence"
  | "video_qa"
  | "correction"
  | "review_delivery";

export type VideoChainStep = {
  id: VideoChainStepId;
  ownerRole:
    | "client_input"
    | "copy"
    | "creative_production"
    | "qa"
    | "producer_dispatcher"
    | "system";
  kitchenStateLabel: string;
  operationalStatus:
    | "defined"
    | "reuse_certified_capability"
    | "integration_required"
    | "unresolved_rights"
    | "ready_when_file_exists";
  notes: string;
};

export const VIDEO_PRODUCTION_CHAIN: readonly VideoChainStep[] = [
  {
    id: "customer_brief_assets",
    ownerRole: "client_input",
    kitchenStateLabel: "assets ready",
    operationalStatus: "defined",
    notes:
      "Intake captures purpose, one aspect, footage/materials description, on-screen text/CTA. Missing usable media fails honestly when no authorized Studio/stock source exists.",
  },
  {
    id: "script_copy_lock",
    ownerRole: "copy",
    kitchenStateLabel: "script ready",
    operationalStatus: "reuse_certified_capability",
    notes: "Lock on-screen text / spoken script version via copy capability. scriptVersionId binds later.",
  },
  {
    id: "storyboard_shot_sequence",
    ownerRole: "creative_production",
    kitchenStateLabel: "storyboard ready",
    operationalStatus: "defined",
    notes: "Shot sequence / assembly plan for one 15–30s cut. No second workflow.",
  },
  {
    id: "asset_preparation",
    ownerRole: "creative_production",
    kitchenStateLabel: "assets ready",
    operationalStatus: "defined",
    notes:
      "Prepare customer footage/photos/logo. Insufficient resolution or missing media fails — do not fabricate footage The Studio did not film.",
  },
  {
    id: "optional_certified_voice_mp3",
    ownerRole: "creative_production",
    kitchenStateLabel: "assets ready",
    operationalStatus: "reuse_certified_capability",
    notes:
      "May reference an already-approved bound voice MP3 by path/hash. Does not re-run ElevenLabs. Voice cert ≠ video cert.",
  },
  {
    id: "video_assembly",
    ownerRole: "creative_production",
    kitchenStateLabel: "production started",
    operationalStatus: "integration_required",
    notes:
      "CapCut is the named assembly tool. Studio has no CapCut API. Human CapCut work is required until an approved integration/operational packet exists.",
  },
  {
    id: "captions_text_timing",
    ownerRole: "creative_production",
    kitchenStateLabel: "production started",
    operationalStatus: "integration_required",
    notes: "On-screen captions + CTA treatment are contract-required. Timing is human CapCut work today.",
  },
  {
    id: "audio_music_handling",
    ownerRole: "creative_production",
    kitchenStateLabel: "production started",
    operationalStatus: "unresolved_rights",
    notes:
      "Voice-over may reuse certified MP3. Background music rights UNRESOLVED — omit music until authorized source/rights are certain.",
  },
  {
    id: "render_export",
    ownerRole: "creative_production",
    kitchenStateLabel: "render pending",
    operationalStatus: "integration_required",
    notes:
      "MP4 export happens in CapCut (or future approved tool), not in Studio runtime. Render failed cannot become QA READY. States: render pending / render failed / video artifact produced.",
  },
  {
    id: "artifact_persistence",
    ownerRole: "system",
    kitchenStateLabel: "video artifact produced",
    operationalStatus: "ready_when_file_exists",
    notes:
      "Persist exact MP4 path + SHA-256 + byte size + campaign/SKU + scriptVersionId + source refs + optional voice hash + dimensions/duration metadata.",
  },
  {
    id: "video_qa",
    ownerRole: "qa",
    kitchenStateLabel: "QA ready",
    operationalStatus: "ready_when_file_exists",
    notes:
      "Deterministic checks + human visual/listening judgment. Metadata alone cannot QA PASS.",
  },
  {
    id: "correction",
    ownerRole: "creative_production",
    kitchenStateLabel: "QA correction required",
    operationalStatus: "integration_required",
    notes:
      "Routine: Creative Production → QA → Creative Production → QA. Owner not required for ordinary timing/text/crop/caption/audio/render fixes.",
  },
  {
    id: "review_delivery",
    ownerRole: "producer_dispatcher",
    kitchenStateLabel: "review ready",
    operationalStatus: "ready_when_file_exists",
    notes:
      "After video QA PASS only. Client distributes. NOT CUSTOMER READY — this package does not certify.",
  },
] as const;

export function kitchenVideoStatesForSku(_sku: VideoProductionSku): readonly string[] {
  return [
    "assets ready",
    "script ready",
    "storyboard ready",
    "production started",
    "render pending",
    "render failed",
    "video artifact produced",
    "QA ready",
    "QA correction required",
    "QA pass",
    "review ready",
  ] as const;
}
