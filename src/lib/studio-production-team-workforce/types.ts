import type {
  ProductionAttemptKind,
  ProductionTeamCapabilityId,
  studioProductionTeamWorkforceV1,
} from "@/config/studio-production-team-workforce-v1";

export type ProductionTeamJobPacket = {
  packageId: typeof studioProductionTeamWorkforceV1.packageId;
  packetId: string;
  campaignId: string;
  jobId: string;
  dispatchId: string;
  skuId: string;
  capability: ProductionTeamCapabilityId;
  supportingCapabilities: readonly ProductionTeamCapabilityId[];
  attemptKind: ProductionAttemptKind;
  intakeFacts: Record<string, string>;
  brandRecordAvailable: boolean;
  authorizedMaterialIds: readonly string[];
  requestedFormat: string | null;
  intendedUse: string | null;
  customerInstructions: string | null;
  priorWorkVersionId: string | null;
  currentWorkVersionId: string | null;
  createdAt: string;
};

export type ProductionTeamReportKind =
  | "produced"
  | "status"
  | "qa_result"
  | "correction_request"
  | "missing_material"
  | "blocker"
  | "escalation";

export type ProductionTeamReport = {
  packageId: typeof studioProductionTeamWorkforceV1.packageId;
  reportId: string;
  packetId: string;
  campaignId: string;
  jobId: string;
  skuId: string;
  from: ProductionTeamCapabilityId | "MACHINE";
  to: ProductionTeamCapabilityId | "MACHINE" | "OWNER";
  kind: ProductionTeamReportKind;
  status: string;
  artifactRelativePath?: string;
  qaPassed?: boolean;
  message: string;
  attemptKind: ProductionAttemptKind;
  createdAt: string;
};

export type ProductionTeamLog = {
  packageId: typeof studioProductionTeamWorkforceV1.packageId;
  campaignId: string;
  packets: readonly ProductionTeamJobPacket[];
  reports: readonly ProductionTeamReport[];
  updatedAt: string;
};

export type PrintFileCertification =
  | {
      ok: true;
      skuId: string;
      pngRelativePath?: string;
      pdfRelativePath?: string;
      widthPx?: number;
      heightPx?: number;
      intendedUse: "print_digital" | "digital_only";
      physicalPrint: false;
      shipping: false;
    }
  | {
      ok: false;
      skuId: string;
      code:
        | "MISSING_PNG"
        | "MISSING_PDF"
        | "INVALID_FILE"
        | "DIMENSION_MISMATCH"
        | "FORMAT_UNSUPPORTED";
      message: string;
    };
