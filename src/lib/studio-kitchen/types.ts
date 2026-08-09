import type { KitchenExceptionTrayId, KitchenFileBucketId } from "@/config/studio-kitchen-file-room";
import type {
  ProductionControlLane,
  JobSpineStatus,
} from "@/lib/job-control/types";
import type {
  ProductionRole,
  TaskEffectiveStatus,
  TaskWorkflowState,
} from "@/lib/campaign-tasks/types";
import type { KitchenProductionContractSummary } from "@/lib/studio-kitchen-production";

/** Where a Kitchen folder's data came from. Fixtures never masquerade as live. */
export type KitchenDataSource = "live_production" | "fixture_demo";

export type KitchenQaState =
  | "not_started"
  | "passed"
  | "failed"
  | "blocked"
  | "unavailable";

export type KitchenHonestyFlags = {
  tasksRecorded: boolean;
  jobsRecorded: boolean;
  dueDateRecorded: boolean;
  assigneeRecorded: boolean;
  materialsRecorded: boolean;
};

export type KitchenJobProjection = {
  jobId: string;
  skuId: string;
  serviceName: string;
  spineStatus: JobSpineStatus;
  spineStatusLabel: string;
  lane: ProductionControlLane | null;
  ownerApprovalPending: "before_review" | "before_delivery" | null;
  intakeComplete: boolean;
  /** Read-only production contract summary — null when SKU has no active-set contract. */
  productionContract: KitchenProductionContractSummary | null;
};

export type KitchenTaskProjection = {
  id: string;
  title: string;
  effectiveStatus: TaskEffectiveStatus | null;
  effectiveStatusLabel: string;
  workflowState: TaskWorkflowState | null;
  responsibleRole: ProductionRole | null;
  responsibleRoleLabel: string | null;
  claimedByDisplayName: string | null;
  blockedReason: string | null;
  qaState: KitchenQaState;
  latestHandoffSummary: string | null;
};

export type KitchenProjectedPlacement = {
  folderLocation: "bucket" | "tray";
  homeBucketId: KitchenFileBucketId;
  trayId: KitchenExceptionTrayId | null;
  /** Presentation-only — derived from job spine / blockers, not a Kitchen write model. */
  projectionKind: "job_spine" | "waiting_client" | "fixture";
};

export type KitchenProductionFolder = {
  source: KitchenDataSource;
  campaignId: string;
  campaignName: string;
  clientLabel: string;
  campaignStatusLabel: string;
  fileRoomHref: string;
  ownerConsoleHref: string;
  jobs: readonly KitchenJobProjection[];
  primaryJob: KitchenJobProjection | null;
  tasks: readonly KitchenTaskProjection[];
  openExceptionCount: number;
  blockingMaterialCount: number;
  pendingOutboxCount: number;
  placement: KitchenProjectedPlacement;
  nextActionLabel: string;
  waitingOnLabel: string;
  assignedToLabel: string;
  dueLabel: string;
  honesty: KitchenHonestyFlags;
  updatedAt: string | null;
};

export type KitchenProjectionBoard = {
  sourceMode: "live_production" | "fixture_demo" | "empty";
  folders: readonly KitchenProductionFolder[];
  liveCampaignCount: number;
  fixtureCampaignCount: number;
  fixtureDemoActive: boolean;
  refreshedAt: string;
};

export type KitchenProjectionDetail =
  | { kind: "ok"; folder: KitchenProductionFolder }
  | { kind: "unavailable"; campaignId: string; reason: "not_found" | "forbidden" | "unknown" };
