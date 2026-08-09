/**
 * KITCHEN-VIDEO-OPERATIONAL-1 — CapCut manual-operational work packet + QA READY types.
 * QA READY ≠ QA PASS ≠ CUSTOMER READY.
 */

export type VideoWorkPacketScene = {
  sceneNumber: number;
  assetId: string;
  relativePath: string;
  startSeconds: number;
  endSeconds: number;
  caption: string;
};

export type VideoWorkPacket = {
  workPacketId: string;
  workPacketVersion: string;
  storyboardVersion: string;
  scriptVersionId: string;
  campaignId: string;
  skuId: string;
  label: string;
  durationMinSeconds: number;
  durationMaxSeconds: number;
  durationTargetSeconds: number;
  aspectRatio: "vertical" | "square" | "landscape";
  width: number;
  height: number;
  exportFormat: "mp4";
  musicAllowed: false;
  stockAllowed: false;
  productionMethod: "capcut";
  productionRoleOwner: "creative_production";
  temporaryPhysicalOperator?: "tagia_one_time_desktop_gui";
  voiceArtifact?: {
    relativePath: string;
    contentSha256: string;
  };
  exportRelativePath: string;
  scenes: readonly VideoWorkPacketScene[];
  supersedesWorkPacketVersion?: string;
  correctionReason?: string;
  ownerEscalation?: "owner_not_required";
  preserveV1RelativePath?: string;
};

export type CapCutSetupTruth = {
  installed: boolean;
  version: string;
  executablePath: string;
  wingetId: string;
  proRequiredForThisPath: false;
  musicUsed: false;
  stockUsed: false;
  accountNote: string;
  projectStorageNote: string;
  exportLocationNote: string;
};

export type VideoOperationalExportMeta = {
  relativePath: string;
  contentSha256: string;
  byteLength: number;
  durationSeconds: number;
  width: number;
  height: number;
  frameRate?: number;
  codec?: string;
  workPacketVersion: string;
  storyboardVersion: string;
  scriptVersionId: string;
  campaignId: string;
  skuId: string;
  voiceArtifactSha256?: string;
  productionMethod: "capcut";
  qaState: "qa_ready" | "qa_correction_required" | "qa_pass_blocked_until_cert";
  label: string;
};

export type VideoOperationalQaReadyGate = {
  ok: boolean;
  qaReady: boolean;
  qaPass: false;
  customerReady: false;
  findings: readonly string[];
};
