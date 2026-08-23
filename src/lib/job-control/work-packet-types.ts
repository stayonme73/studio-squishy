import type { RouteMapProductionBrief } from "@/lib/route-map-production-brief";
import type { KitchenProductionContractSummary } from "@/lib/studio-kitchen-production/types";

import type {
  JobInternalNote,
  JobWorkPacketRole,
  JobWorkingFileRef,
} from "./types";

export type WorkPacketReturnFileRow = {
  id: string;
  kind: "draft" | "final";
  label: string;
  url: string;
  returnedAt: string;
  returnedByLabel: string;
  deliverableLabel: string | null;
  note: string | null;
};

export type TeamOfficeWorkPacketView = {
  packetId: string;
  jobId: string;
  campaignId: string;
  serviceName: string;
  role: JobWorkPacketRole;
  roleLabel: string;
  taskTitle: string;
  statusLabel: string;
  productionBriefAvailable: boolean;
  productionBrief: RouteMapProductionBrief | null;
  requiredDeliverables: readonly { key: string; label: string; prepared: boolean }[];
  materials: readonly { id: string; label: string; status: string }[];
  internalNotes: readonly JobInternalNote[];
  workingFileRefs: readonly JobWorkingFileRef[];
  returnedFiles: readonly WorkPacketReturnFileRow[];
  ownerApprovalRequirement: string;
  returnLocationLabel: string;
  integrationStatusLabel: string;
  productionContract: KitchenProductionContractSummary | null;
};
