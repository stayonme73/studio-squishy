/**
 * CapCut path after owner-independence FAIL — retained for audit only.
 */

export type CapCutManualOperationalPacket = {
  status: "owner_independence_fail";
  finding: "integration_required";
  ownerIndependence: "fail";
  whoOpensCapCut: "human_desktop_operator_required_unsupported_as_studio_path";
  tagiaRoutineEditor: false;
  tagiaExportSuccessPath: false;
  requiredBeforeManualOperationalReady: readonly string[];
  inputsReceived: readonly string[];
  workPacketSteps: readonly string[];
  templateBrandRules: string;
  mp4ReturnPath: string;
  hashBinding: string;
  qaCorrectionTracking: string;
  recommendedNextPackage: "KITCHEN-VIDEO-PROVIDER-SELECTION-1";
};

export const CAPCUT_MANUAL_OPERATIONAL_TARGET: CapCutManualOperationalPacket = {
  status: "owner_independence_fail",
  finding: "integration_required",
  ownerIndependence: "fail",
  whoOpensCapCut: "human_desktop_operator_required_unsupported_as_studio_path",
  tagiaRoutineEditor: false,
  tagiaExportSuccessPath: false,
  requiredBeforeManualOperationalReady: [
    "Select a replacement provider with programmatic MP4 export (KITCHEN-VIDEO-PROVIDER-SELECTION-1)",
    "Do not resume CapCut Owner/Tagia click-export as the Studio success path",
  ],
  inputsReceived: [
    "Work packets wp-v1/wp-v2",
    "Synthetic assets + sealed voice hash",
    "CapCut Desktop install proven",
  ],
  workPacketSteps: [
    "Work packet remains the decision encoding model",
    "CapCut Desktop export is not Studio-automatable",
    "Bind/QA READY gates await a programmatic exporter",
  ],
  templateBrandRules:
    "docs/launch/kitchen-video-operational-1/work-packet/WORK-PACKET-v1.md",
  mp4ReturnPath:
    "Future provider export → docs/launch/.../artifacts with hash bind",
  hashBinding: "bindCapCutExport renamed conceptually for future provider bind",
  qaCorrectionTracking: "V1→V2 correction model retained; owner_not_required for routine fixes",
  recommendedNextPackage: "KITCHEN-VIDEO-PROVIDER-SELECTION-1",
};
