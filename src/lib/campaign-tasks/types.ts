import type { ServiceFamilyId, ServiceId } from "@/catalog/types";

export type TaskPhase =
  | "strategy"
  | "strategy_content_direction"
  | "review_strategy"
  | "copy"
  | "creative"
  | "creative_copy"
  | "creative_production"
  | "qa"
  | "delivery_prep";

export type TaskStatus = "not_ready" | "ready" | "blocked";

/** Template family — maps catalog families to shared production pipelines. */
export type ProductionTaskFamilyId =
  | "brand_identity_messaging"
  | "campaign_launch_monthly"
  | "social"
  | "copy_channels"
  | "video_audio"
  | "landing_page"
  | "optimization"
  | "marketing_assets";

export type CampaignTaskItem = {
  id: string;
  title: string;
  phase: TaskPhase;
  status: TaskStatus;
  relatedServiceIds: readonly ServiceId[];
  familyId: ProductionTaskFamilyId;
  catalogFamilyId: ServiceFamilyId;
  serviceName: string;
  dependsOn: readonly string[];
  blockedReason?: string;
  /** Present for monthly-cycle SKUs — one current-cycle set in Slice 3a. */
  cycleLabel?: string;
};

export type CampaignTasksRecord = {
  campaignId: string;
  tasks: CampaignTaskItem[];
  planFingerprint: string;
  updatedAt: string;
  version: number;
};

export type ServerTasksEnvelope = CampaignTasksRecord & {
  syncedAt: string;
};

export type TaskReadinessContext = {
  hasApprovedPlan: boolean;
  directionApproved: boolean;
  projectDetailsSubmitted: boolean;
};
