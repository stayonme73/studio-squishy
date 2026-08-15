export type {
  JobSpineStatus,
  ProductionControlLane,
  OwnerDeskReason,
  JobCommunicationEventType,
  JobCommunicationChannel,
  JobCommunicationDeliveryStatus,
  JobCommunicationTransportCode,
  JobActivityEventKind,
  JobActivityActor,
  PurchasedJobRecord,
  JobCommunicationRecord,
  JobActivityEvent,
} from "./types";

export {
  buildJobId,
  parseJobId,
  resolveControlLaneForSku,
  mapCatalogLaneToControlLane,
} from "./lane-map";

export {
  mapCampaignStatusToSpine,
  isTerminalSpineStatus,
  occupiesLaneCapacity,
  ACTIVE_LANE_SPINE_STATUSES,
} from "./status-spine";

export {
  isJobIntakeComplete,
  hasProductionStartedForSku,
  buildPurchasedJobRecord,
  syncJobRecordsFromCampaign,
  jobCountsTowardLaneCapacity,
  isJobPaused,
  blockingMaterialsForSku,
} from "./resolve-jobs";

export {
  resolveProductionLaneViews,
  isHeavyLaneFull,
  findHeavyLaneNextUp,
  type LaneJobView,
  type ProductionLaneView,
  type LaneCapacityInput,
} from "./capacity";

export {
  resolveWaitingOnClientReminderStatus,
  shouldMoveJobToWaitingOnClient,
  buildWaitingOnClientTrayItem,
  applyWaitingOnClientPolicies,
  requeueReturnedJob,
  type WaitingOnClientTrayItem,
  type WaitingOnClientReminderStatus,
} from "./waiting-on-client";

export {
  appendJobActivityEvent,
  recordJobStatusChange,
  deriveBaselineActivityEvents,
  mergeActivityEvents,
  sortActivityEvents,
  formatActivityKind,
} from "./activity-log";

export {
  JOB_COMMUNICATION_TEMPLATES,
  enqueueJobCommunicationRecord,
  applyJobCommunicationTransportResult,
  markJobCommunicationTestSent,
  resolveCampaignCommunicationClientId,
  resolveNeedsCommunicationQueue,
  syncJobCommunicationRecords,
  type EnqueueJobCommunicationInput,
  type NeedsCommunicationQueueItem,
} from "./communication";

export { resolveOwnerDeskItems, type OwnerDeskItem, type OwnerDeskInput } from "./owner-desk";

export {
  resolveOwnerControlRoomView,
  resolveOwnerControlRoomFromBundle,
  collectJobRecordUpdates,
  filterBundlesForControlRoom,
  type OwnerControlRoomView,
} from "./control-room-view";

export {
  applyJobSpineStatusChange,
  requestOwnerApprovalBeforeReview,
  requestOwnerApprovalBeforeDelivery,
  type SetJobSpineStatusInput,
} from "./actions";

export {
  canTransitionToBuildingConcepts,
  canSubmitForOwnerApproval,
  canOwnerApproveForReview,
  allRequiredDeliverablesPrepared,
  resolveRequiredDeliverableKeys,
  type GateBlockReason,
} from "./production-workspace-gates";

export {
  applyProductionWorkspacePatch,
  type ProductionWorkspacePatchAction,
  type ProductionWorkspacePatchBody,
  type ProductionWorkspacePatchResult,
} from "./production-workspace-actions";

export {
  resolveProductionWorkspaceView,
  productionWorkspacePageTitle,
  type ProductionWorkspaceView,
  type ProductionWorkspaceDeliverableRow,
  type ProductionWorkspaceMaterialRow,
} from "./production-workspace-view";

export {
  canOwnerFinalRelease,
  canSystemAuthorizeFinalDelivery,
  canMarkJobDelivered,
  allRequiredClientDeliveryFilesPresent,
  allRequiredClientDeliveryFilesAssembled,
  materialContextFromLedger,
  materialContextUnavailable,
  type SystemReleaseMaterialContext,
} from "./final-delivery-gates";

export {
  applyFinalDeliveryPatch,
  applySystemFinalDeliveryAuthorization,
  reevaluateSystemFinalDeliveryAfterMaterialChange,
  addClientDeliveryFile,
  allJobsDelivered,
  syncCampaignStatusAfterDelivery,
  type FinalDeliveryPatchBody,
  type FinalDeliveryPatchResult,
} from "./final-delivery-actions";

export {
  canClientAccessJobDelivery,
  isJobDeliveredToClient,
} from "./final-delivery-access";

export {
  resolveFinalDeliveryView,
  resolveFinalDeliveryBoardSummary,
  type FinalDeliveryView,
  type ClientJobDeliveryView,
  type ClientDeliveryFileView,
  type FinalDeliveryBoardJobSummary,
} from "./final-delivery-view";
