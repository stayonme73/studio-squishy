/**
 * CapCut manual-operational boundary documentation.
 * Not proven as Kitchen-ready — records what would be required.
 */

export type CapCutManualOperationalPacket = {
  status: "not_kitchen_proven";
  finding: "integration_required";
  ownerIndependence: "unproven";
  whoOpensCapCut: "creative_production";
  tagiaRoutineEditor: false;
  requiredBeforeManualOperationalReady: readonly string[];
  inputsReceived: readonly string[];
  workPacketSteps: readonly string[];
  templateBrandRules: string;
  mp4ReturnPath: string;
  hashBinding: string;
  qaCorrectionTracking: string;
};

/**
 * Documented target for a future operational package.
 * This package does NOT authorize calling CapCut manual-operational.
 */
export const CAPCUT_MANUAL_OPERATIONAL_TARGET: CapCutManualOperationalPacket = {
  status: "not_kitchen_proven",
  finding: "integration_required",
  ownerIndependence: "unproven",
  whoOpensCapCut: "creative_production",
  tagiaRoutineEditor: false,
  requiredBeforeManualOperationalReady: [
    "Named Creative Production operator role (not Tagia) for CapCut assembly",
    "Work packet with locked scriptVersionId, aspect ratio, asset refs, optional voice hash",
    "Brand/template rules for RTU short video (captions + CTA)",
    "Export checklist: MP4, duration 15–30s, one aspect, captions/CTA present",
    "File Room / Kitchen return path for finished MP4",
    "SHA-256 binding on returned bytes before QA READY",
    "Authorized stock source if customer media absent",
    "Music rights decision (omit until resolved)",
  ],
  inputsReceived: [
    "Campaign Record + SKU v2-rtu-short-video",
    "Locked on-screen text / CTA (scriptVersionId)",
    "Storyboard / shot sequence",
    "Customer footage/photos/logo refs OR authorized Studio visuals",
    "Optional certified voice MP3 path + SHA-256",
    "Must-not-show / disclaimer notes",
  ],
  workPacketSteps: [
    "Open CapCut on operator workstation",
    "Import approved assets + optional voice MP3",
    "Assemble one 15–30s cut in chosen aspect",
    "Add captions + CTA treatment",
    "Omit music unless rights are resolved",
    "Export MP4",
    "Return MP4 to Studio File Room / Kitchen artifact path",
    "Bind path + SHA-256 + metadata",
    "Hand to QA",
  ],
  templateBrandRules:
    "Not yet Kitchen-packaged. Must not invent brand rules in this package.",
  mp4ReturnPath:
    "File Room final_delivery object path or Kitchen launch artifact root — exact operator SOP not yet sealed.",
  hashBinding:
    "registerBoundVideoArtifact + evaluateVideoArtifactBindings before QA READY.",
  qaCorrectionTracking:
    "Existing campaign-tasks QA fail/pass + Kitchen Comms — Creative Production → QA loop; owner_not_required for routine fixes.",
};
