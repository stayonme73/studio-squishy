/**
 * Common Studio Job Contract — one cross-SKU production record.
 * Lanes may extend this. They must not invent a second orchestration brain.
 */

import type {
  StudioJobType,
  StudioProductionRoute,
  StudioCreativeDomain,
} from "@/config/studio-studio-wide-orchestration-v1";

export type StudioRightsState =
  | "certified"
  | "pending"
  | "missing"
  | "not_required";

export type StudioJobContract = {
  jobType: StudioJobType;
  campaignId: string;
  customerId: string;
  sku: string;
  creativeBrief: {
    businessName: string;
    industry: string;
    audience: string;
    objective: string;
    mood: string;
    whatIsPromoted: string;
    chooseForMe: boolean;
    suppliedImagery: boolean;
  };
  requiredFacts: readonly string[];
  brandRecord: Record<string, string> | null;
  customerAssets: readonly string[];
  rightsState: StudioRightsState;
  intendedUse: string;
  format: string;
  deadline: string | null;
  availableCapabilities: readonly string[];
  selectedProductionRoute: StudioProductionRoute | null;
  creativeQualityGate: StudioCreativeDomain | "print_file";
  technicalQualityGate: "print_file" | "copy_text" | "video_export" | "document_pages";
  customerRevisionState: {
    roundsUsed: number;
    unused: boolean;
  };
  internalAttemptCount: number;
  ownerEscalationRequired: boolean;
  qaFindings?: readonly string[];
  currentArtifactKind?: "png" | "pdf" | "mp4" | "text" | "pages" | "spec";
  question?: string;
};

export function jobTypeForSku(sku: string): StudioJobType {
  if (
    sku === "v2-rtu-flyer" ||
    sku === "v2-rtu-menu" ||
    sku === "v2-rtu-service-sheet" ||
    sku === "v2-rtu-business-card" ||
    sku === "v2-rtu-social-posts" ||
    sku === "v2-rtu-promotion-graphics" ||
    sku === "sm-001" ||
    sku === "sm-001-monthly" ||
    sku === "ma-001"
  ) {
    return "static_design";
  }
  if (sku === "v2-rtu-short-video") return "motion_video";
  if (sku === "v2-rtu-email-kit" || sku === "v2-rtu-sms-kit") return "copy";
  if (sku === "v2-rtu-voice") return "voice_audio";
  if (
    sku.includes("form") ||
    sku.includes("worksheet") ||
    sku.includes("checklist") ||
    sku.includes("pdf-document")
  ) {
    return "form_document";
  }
  return "unknown";
}

export function domainForJobType(jobType: StudioJobType): StudioCreativeDomain | "print_file" {
  if (jobType === "copy") return "copy";
  if (jobType === "motion_video" || jobType === "voice_audio") return "video";
  if (jobType === "form_document") return "document";
  if (jobType === "print_file") return "print_file";
  return "design";
}

export function technicalGateForJobType(
  jobType: StudioJobType,
): StudioJobContract["technicalQualityGate"] {
  if (jobType === "copy") return "copy_text";
  if (jobType === "motion_video" || jobType === "voice_audio") return "video_export";
  if (jobType === "form_document") return "document_pages";
  return "print_file";
}
