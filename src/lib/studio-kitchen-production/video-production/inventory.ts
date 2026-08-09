/**
 * KITCHEN-VIDEO-OPERATIONAL-1 — CapCut owner-independence FAIL inventory.
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

export const VIDEO_CAPABILITY_INVENTORY: readonly VideoCapabilityFinding[] = [
  {
    id: "shotstack_edit_ingest",
    label: "Shotstack Edit + Ingest API (owner-independent MP4 proven)",
    classification: "present_and_usable",
    evidencePaths: [
      "docs/launch/kitchen-video-integration-1/",
      "src/lib/studio-kitchen-production/video-integration/",
      "docs/launch/kitchen-video-provider-selection-1/KITCHEN-VIDEO-PROVIDER-SELECTION-1-REPORT.md",
    ],
    notes:
      "KITCHEN-PRODUCTION-CERT-VIDEO-1: CUSTOMER READY WITH LIMITS — MP4. Owner-independent Shotstack Production proven (V5). Final A/V beat sync remains mandatory per-artifact QA.",
  },
  {
    id: "capcut_named_tool",
    label: "CapCut Desktop (installed; owner-independence FAIL)",
    classification: "unsupported",
    evidencePaths: [
      "docs/launch/kitchen-video-operational-1/CAPCUT-OWNER-INDEPENDENCE.md",
      "docs/launch/kitchen-video-operational-1/CAPCUT-SETUP.md",
      "src/lib/studio-kitchen-production/family-baselines.ts",
    ],
    notes:
      "CLOSED — OWNER-INDEPENDENCE FAIL. Not an active production provider. Historical evaluation only.",
  },
  {
    id: "capcut_manual_operational_path",
    label: "CapCut human desktop operator path",
    classification: "unsupported",
    evidencePaths: [
      "docs/launch/kitchen-video-operational-1/CAPCUT-OPERATOR-RUNBOOK.md",
      "docs/launch/kitchen-video-operational-1/CAPCUT-OWNER-INDEPENDENCE.md",
    ],
    notes:
      "Owner/Tagia CapCut export withdrawn as success path. Manual runbook ≠ automation. Not owner-independent Studio production.",
  },
  {
    id: "mp4_render_export",
    label: "Studio owner-free CapCut MP4 export",
    classification: "unsupported",
    evidencePaths: ["docs/launch/kitchen-video-operational-1/CAPCUT-OWNER-INDEPENDENCE.md"],
    notes: "No supported CapCut non-interactive export from Studio/Scout.",
  },
  {
    id: "work_packet_model",
    label: "Creative Production video work packet + bind gates",
    classification: "present_and_usable",
    evidencePaths: [
      "docs/launch/kitchen-video-operational-1/work-packet/",
      "src/lib/studio-kitchen-production/video-operational/",
    ],
    notes:
      "Work packet, asset truth, and QA READY bind contracts remain valid for a future provider. Not CapCut export proof.",
  },
  {
    id: "timeline_preassembly_signal",
    label: "Programmatic timeline preassembly signal (not CapCut; not selected provider)",
    classification: "present_but_not_exportable",
    evidencePaths: [
      "docs/launch/kitchen-video-operational-1/source-assets/capcut-import-preassembly/",
      "docs/launch/kitchen-video-operational-1/REPLACEMENT-CAPABILITY-SPEC.md",
    ],
    notes:
      "ffmpeg preassembly proves packet→scenes→voice→MP4 is mechanically possible outside CapCut. Not a provider selection. Not CapCut certification.",
  },
  {
    id: "file_room_mp4_storage",
    label: "File Room / materials accept MP4 storage",
    classification: "present_but_not_exportable",
    evidencePaths: ["src/lib/file-room/"],
    notes: "Storage ≠ production capability.",
  },
  {
    id: "certified_voice_mp3_reuse",
    label: "Certified voice MP3 as optional video input",
    classification: "present_and_usable",
    evidencePaths: ["docs/launch/kitchen-production-cert-voice-1/"],
    notes: "Reference by exact path/hash. Voice cert ≠ video cert.",
  },
  {
    id: "stock_media_source",
    label: "Approved stock / Studio / AI visual source",
    classification: "unresolved",
    evidencePaths: ["src/catalog/v2/batch2-ready-to-use.ts"],
    notes: "UNRESOLVED. Unused in this package.",
  },
  {
    id: "music_licensing",
    label: "Background music commercial rights",
    classification: "unresolved",
    evidencePaths: ["src/catalog/v2/batch2-ready-to-use.ts"],
    notes: "MUSIC CAPABILITY = UNRESOLVED. Unused in this package.",
  },
  {
    id: "studio_voice_ui",
    label: "Studio Voice (browser conversation TTS)",
    classification: "present_but_not_exportable",
    evidencePaths: ["src/lib/studio-conversation-speech.ts"],
    notes: "Untouched.",
  },
] as const;

export type CapCutFindingClass =
  | "automated_integrated"
  | "manual_operational"
  | "integration_required"
  | "unsupported";

export type CapCutOwnerIndependence = "pass" | "fail";

export function classifyCapCutFinding(): {
  finding: CapCutFindingClass;
  toolTruth: VideoCapabilityClass;
  ownerIndependence: CapCutOwnerIndependence;
  canCreateCustomerReadyMp4WithoutHumanCapCut: false;
  canCreateCustomerReadyMp4WithoutTagia: false;
  notes: string;
} {
  return {
    finding: "integration_required",
    toolTruth: "integration_required",
    ownerIndependence: "fail",
    canCreateCustomerReadyMp4WithoutHumanCapCut: false,
    canCreateCustomerReadyMp4WithoutTagia: false,
    notes:
      "CAPCUT OWNER-INDEPENDENCE: FAIL. Installed Desktop app without supported owner-free export. Next: KITCHEN-VIDEO-PROVIDER-SELECTION-1.",
  };
}

export function summarizeVideoCapabilityInventory(): {
  canGenerateCustomerDeliverableMp4InStudio: true;
  shotstackIntegrationProven: true;
  capCutFinding: CapCutFindingClass;
  capCutOwnerIndependence: CapCutOwnerIndependence;
  musicCapability: "unresolved";
  stockMediaCapability: "unresolved";
  studioVoiceUntouched: true;
  /** Unlimited CUSTOMER READY is false — status is WITH LIMITS. */
  customerReady: false;
  customerReadyWithLimits: true;
  customerReadyStatus: "CUSTOMER READY WITH LIMITS — MP4";
  blockingGaps: readonly string[];
  findings: readonly VideoCapabilityFinding[];
  recommendedNextPackage: "ROUTINE_PRODUCTION_AV_SYNC_QA";
} {
  const capCut = classifyCapCutFinding();
  return {
    canGenerateCustomerDeliverableMp4InStudio: true,
    shotstackIntegrationProven: true,
    capCutFinding: capCut.finding,
    capCutOwnerIndependence: "fail",
    musicCapability: "unresolved",
    stockMediaCapability: "unresolved",
    studioVoiceUntouched: true,
    customerReady: false,
    customerReadyWithLimits: true,
    customerReadyStatus: "CUSTOMER READY WITH LIMITS — MP4",
    blockingGaps: [
      "CUSTOMER READY WITH LIMITS — MP4: final A/V beat synchronization is mandatory per-artifact QA before delivery (topic cards may lag narration slightly)",
      "Stock source unresolved for jobs without customer media",
      "Music rights unresolved — omit music",
    ],
    findings: VIDEO_CAPABILITY_INVENTORY,
    recommendedNextPackage: "ROUTINE_PRODUCTION_AV_SYNC_QA",
  };
}
