import type { ServiceId } from "@/catalog/types";
import type { TaskPhase } from "@/lib/campaign-tasks/types";

export const CAMPAIGN_PRODUCTION_SCHEMA_VERSION = 1;

export const KITCHEN_V1_SERVICE_ID = "sm-001" as const satisfies ServiceId;

export const KITCHEN_V1_PRODUCTION_PHASES = [
  "strategy_content_direction",
  "copy",
  "creative",
] as const satisfies readonly TaskPhase[];

export type KitchenV1ProductionPhase = (typeof KITCHEN_V1_PRODUCTION_PHASES)[number];

export type ProductionWorkUnitStatus = "active" | "blocked_plan_change" | "superseded" | "complete";

export type ProductionVersionReason =
  | "initial"
  | "internal_revision"
  | "qa_revision"
  | "client_revision";

export type ProductionContentKind = "plain_text";

export type ProductionQaPin = {
  workVersionId: string;
  qaRecordId: string;
  action: "qa_pass" | "qa_fail";
  pinnedAt: string;
};

export type ProductionVersion = {
  id: string;
  workUnitId: string;
  taskId: string;
  stage: KitchenV1ProductionPhase;
  reason: ProductionVersionReason;
  contentKind: ProductionContentKind;
  body: string;
  createdAt: string;
  createdByUserId: string;
  createdByDisplayName: string;
  qaPin?: ProductionQaPin;
};

export type StageLineageEntry = {
  stage: KitchenV1ProductionPhase;
  taskId: string;
  currentVersionId: string | null;
};

export type ProductionWorkUnit = {
  id: string;
  serviceId: typeof KITCHEN_V1_SERVICE_ID;
  deliverableKeys: readonly string[];
  planFingerprint: string;
  status: ProductionWorkUnitStatus;
  currentStage: KitchenV1ProductionPhase;
  currentTaskId: string;
  stageLineage: readonly StageLineageEntry[];
  createdAt: string;
  updatedAt: string;
};

export type CampaignProductionRecord = {
  campaignId: string;
  version: typeof CAMPAIGN_PRODUCTION_SCHEMA_VERSION;
  planFingerprint: string;
  workUnits: ProductionWorkUnit[];
  /** Append-only version ledger — never edit or remove entries. */
  versions: ProductionVersion[];
  updatedAt: string;
};

export type ServerProductionEnvelope = CampaignProductionRecord & {
  syncedAt: string;
};
