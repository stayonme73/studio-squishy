/**
 * KITCHEN-VIDEO-PRODUCTION-1 — short-video capability inventory.
 * CapCut exists as a named tool only. No CapCut API. No invented automation.
 */

export type VideoCapabilityClass =
  | "present_and_usable"
  | "present_manual_operational"
  | "present_but_not_exportable"
  | "integration_required"
  | "unsupported"
  | "unresolved";

export type VideoCapabilityFinding = {
  id: string;
  label: string;
  classification: VideoCapabilityClass;
  evidencePaths: readonly string[];
  notes: string;
};

/** Inventory at KITCHEN-VIDEO-PRODUCTION-1 (base seal cert-voice 5348ba7). */
export const VIDEO_CAPABILITY_INVENTORY: readonly VideoCapabilityFinding[] = [
  {
    id: "capcut_named_tool",
    label: "CapCut (named short-video edit tool)",
    classification: "integration_required",
    evidencePaths: [
      "src/lib/studio-kitchen-production/family-baselines.ts",
      "src/lib/studio-kitchen-production/sku-overrides.ts",
      "docs/studio-production-capability-doctrine-v1-locked.md",
    ],
    notes:
      "Named primary tool for v2-rtu-short-video. integrationState=not_integrated; toolReadiness=tool_integration_required. No CapCut API/SDK/webhook in repo. No browser UI automation approved. Do not claim autonomous CapCut production.",
  },
  {
    id: "capcut_manual_operational_path",
    label: "CapCut manual-operational Creative Production path",
    classification: "integration_required",
    evidencePaths: [
      "src/lib/job-control/work-packets.ts",
      "src/lib/studio-kitchen-production/sku-overrides.ts",
    ],
    notes:
      "Doctrine allows a human CapCut path outside the app in principle, but Kitchen has not proven a work packet, template/brand rules packet, export-return path, or hash-binding handoff for CapCut. Work packets state manual file links only — no live CapCut connection. Not classified present_manual_operational until that path is proven without Tagia as routine editor.",
  },
  {
    id: "mp4_render_export",
    label: "Studio-side MP4 render/export",
    classification: "unsupported",
    evidencePaths: ["src/lib/studio-kitchen-production/"],
    notes:
      "No ffmpeg, CapCut render adapter, or other Studio-side MP4 generator exists. Phantom MP4s must not be invented.",
  },
  {
    id: "file_room_mp4_storage",
    label: "File Room / materials accept MP4 storage",
    classification: "present_but_not_exportable",
    evidencePaths: [
      "src/lib/file-room/",
      "src/components/materials/MaterialsIntakePanel.tsx",
    ],
    notes:
      "MP4 can be stored/downloaded as a file once a human (or future integration) produces it. Storage ≠ production capability.",
  },
  {
    id: "certified_voice_mp3_reuse",
    label: "Certified voice MP3 as optional video input",
    classification: "present_and_usable",
    evidencePaths: [
      "docs/launch/kitchen-production-cert-voice-1/",
      "src/lib/studio-kitchen-production/voice-production/",
      "src/lib/studio-kitchen-production/cert-voice/",
    ],
    notes:
      "Sealed MP3 voice path may be referenced by hash as an input when the video job uses voice-over. Voice certification does not certify video. Do not reimplement ElevenLabs here.",
  },
  {
    id: "stock_media_source",
    label: "Approved stock / Studio / AI visual source",
    classification: "unresolved",
    evidencePaths: [
      "src/catalog/v2/batch2-ready-to-use.ts",
      "src/catalog/intake/schemas.ts",
    ],
    notes:
      "Catalog/intake name approved Studio/stock/AI visuals, but no authorized provider, license registry, or asset library is wired. Fabricating customer footage is forbidden. Gap blocks honest production when customer media is missing/unusable.",
  },
  {
    id: "music_licensing",
    label: "Background music / CapCut music commercial rights",
    classification: "unresolved",
    evidencePaths: ["src/catalog/v2/batch2-ready-to-use.ts"],
    notes:
      "MUSIC CAPABILITY = UNRESOLVED. Exclusion bars music licensing outside approved tools, but approved music source/rights are not established in-repo. Do not assume CapCut library tracks are commercially safe for customer deliverables. Prefer omit music until rights are certain.",
  },
  {
    id: "copy_capability_reuse",
    label: "Copy production capability (on-screen text / CTA lock)",
    classification: "present_and_usable",
    evidencePaths: [
      "src/lib/studio-kitchen-production/copy-quality/",
      "docs/launch/kitchen-production-cert-copy-1/",
    ],
    notes: "Certified copy path can lock on-screen text / CTA copy before assembly.",
  },
  {
    id: "static_design_capability_reuse",
    label: "Static design capability (stills / end-card treatment)",
    classification: "present_and_usable",
    evidencePaths: [
      "src/lib/studio-kitchen-production/design-quality/",
      "docs/launch/kitchen-production-cert-design-1/",
    ],
    notes:
      "Certified static design can supply stills/end cards when contract allows. Does not create motion/video by itself.",
  },
  {
    id: "studio_voice_ui",
    label: "Studio Voice (browser conversation TTS)",
    classification: "present_but_not_exportable",
    evidencePaths: ["src/lib/studio-conversation-speech.ts"],
    notes: "Untouched. Not a short-video production tool.",
  },
] as const;

export type CapCutFindingClass =
  | "automated_integrated"
  | "manual_operational"
  | "integration_required"
  | "unsupported";

export function classifyCapCutFinding(): {
  finding: CapCutFindingClass;
  toolTruth: VideoCapabilityClass;
  canCreateCustomerReadyMp4WithoutHumanCapCut: false;
  canCreateCustomerReadyMp4WithoutTagia: "unproven";
  notes: string;
} {
  return {
    finding: "integration_required",
    toolTruth: "integration_required",
    canCreateCustomerReadyMp4WithoutHumanCapCut: false,
    canCreateCustomerReadyMp4WithoutTagia: "unproven",
    notes:
      "No CapCut API in stack. Manual CapCut by Creative Production may become the path later, but it is not Kitchen-proven. Tagia must not be assumed as routine editor — and must not be required either without an operational packet that names Creative Production ownership.",
  };
}

export function summarizeVideoCapabilityInventory(): {
  canGenerateCustomerDeliverableMp4InStudio: false;
  capCutFinding: CapCutFindingClass;
  musicCapability: "unresolved";
  stockMediaCapability: "unresolved";
  studioVoiceUntouched: true;
  customerReady: false;
  blockingGaps: readonly string[];
  findings: readonly VideoCapabilityFinding[];
} {
  const capCut = classifyCapCutFinding();
  return {
    canGenerateCustomerDeliverableMp4InStudio: false,
    capCutFinding: capCut.finding,
    musicCapability: "unresolved",
    stockMediaCapability: "unresolved",
    studioVoiceUntouched: true,
    customerReady: false,
    blockingGaps: [
      "CapCut has no Studio-side API/automation path",
      "Manual CapCut operational packet (inputs → CapCut → MP4 return → hash bind → QA) is not Kitchen-proven",
      "Authorized stock/Studio/AI visual source is unresolved",
      "Music/licensing capability is unresolved — do not rely on music for readiness",
      "Numeric resolution/fps not specified in catalog (document at export time; do not invent promises)",
      "Intake lead duration (45s) disagrees with catalog authority (15–30s)",
    ],
    findings: VIDEO_CAPABILITY_INVENTORY,
  };
}
