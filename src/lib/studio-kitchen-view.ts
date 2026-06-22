import {
  kitchenBucketGroups,
  resolveKitchenBucket,
  type KitchenBucketGroupId,
  type KitchenBucketId,
} from "@/config/studio-kitchen-buckets";
import {
  kitchenCampaigns,
  kitchenStageDefinitions,
  kitchenStageIndex,
  type KitchenAlert,
  type KitchenCampaign,
  type KitchenStageId,
} from "@/config/studio-kitchen";

export type KitchenStageVisualState = "completed" | "current" | "pending";

export type KitchenCampaignWithBucket = KitchenCampaign & {
  bucketId: KitchenBucketId;
};

export type KitchenBucketItem = {
  id: KitchenBucketId;
  label: string;
  count: number;
};

export type KitchenBucketGroupView = {
  id: KitchenBucketGroupId;
  title: string;
  buckets: KitchenBucketItem[];
};

export type KitchenBucketBoard = {
  groups: KitchenBucketGroupView[];
};

export type KitchenDashboardView = {
  alerts: KitchenAlert[];
  bucketBoard: KitchenBucketBoard;
  campaigns: KitchenCampaignWithBucket[];
  tableGroups: KitchenTableGroup[];
};

export type KitchenTableGroup = {
  groupId: KitchenBucketGroupId;
  groupTitle: string;
  bucketId: KitchenBucketId;
  bucketLabel: string;
  campaigns: KitchenCampaignWithBucket[];
};

export type KitchenStageRow = {
  stageId: KitchenStageId;
  title: string;
  summary: string;
  state: KitchenStageVisualState;
};

export type KitchenDetailView = {
  campaign: KitchenCampaignWithBucket;
  stages: KitchenStageRow[];
};

export function getKitchenCampaign(campaignId: string): KitchenCampaign | null {
  return kitchenCampaigns.find((c) => c.id === campaignId) ?? null;
}

export function withKitchenBucket(campaign: KitchenCampaign): KitchenCampaignWithBucket {
  return { ...campaign, bucketId: resolveKitchenBucket(campaign) };
}

export function buildKitchenBucketBoard(
  campaigns: KitchenCampaignWithBucket[],
): KitchenBucketBoard {
  return {
    groups: kitchenBucketGroups.map((group) => ({
      id: group.id,
      title: group.title,
      buckets: group.buckets.map((bucket) => ({
        id: bucket.id,
        label: bucket.label,
        count: campaigns.filter((campaign) => campaign.bucketId === bucket.id).length,
      })),
    })),
  };
}

export function buildKitchenTableGroups(
  campaigns: KitchenCampaignWithBucket[],
): KitchenTableGroup[] {
  const groups: KitchenTableGroup[] = [];

  for (const group of kitchenBucketGroups) {
    for (const bucket of group.buckets) {
      const bucketCampaigns = campaigns
        .filter((campaign) => campaign.bucketId === bucket.id)
        .sort((a, b) => b.daysInStage - a.daysInStage);

      if (bucketCampaigns.length === 0) continue;

      groups.push({
        groupId: group.id,
        groupTitle: group.title,
        bucketId: bucket.id,
        bucketLabel: bucket.label,
        campaigns: bucketCampaigns,
      });
    }
  }

  return groups;
}

export function buildKitchenDashboardView(
  campaigns: KitchenCampaign[] = kitchenCampaigns,
): KitchenDashboardView {
  const withBuckets = campaigns.map(withKitchenBucket);

  return {
    alerts: buildKitchenAlerts(campaigns),
    bucketBoard: buildKitchenBucketBoard(withBuckets),
    campaigns: [...withBuckets].sort((a, b) => b.daysInStage - a.daysInStage),
    tableGroups: buildKitchenTableGroups(withBuckets),
  };
}

export function buildKitchenAlerts(campaigns: KitchenCampaign[]): KitchenAlert[] {
  const waitingOnOwner = campaigns.filter(
    (c) => c.alerts?.waitingOnOwner || c.waitingOn === "Tagia",
  ).length;

  const clientStalled = campaigns.filter(
    (c) =>
      c.alerts?.clientStalled ||
      c.priority === "Client Delayed" ||
      (c.currentStageId === "waiting-on-client" && c.daysInStage > 7),
  ).length;

  const revisionOverdue = campaigns.filter((c) => c.alerts?.revisionOverdue).length;

  const deliverablesReady = campaigns.filter(
    (c) =>
      c.alerts?.deliverablesReadyForReview ||
      c.currentStageId === "owner-review" ||
      c.currentStageId === "ready-for-client-review",
  ).length;

  const alerts: KitchenAlert[] = [];

  if (waitingOnOwner > 0) {
    alerts.push({
      id: "waiting-owner",
      message: `${waitingOnOwner} campaign${waitingOnOwner === 1 ? "" : "s"} waiting on owner`,
      tone: "warning",
    });
  }

  if (clientStalled > 0) {
    alerts.push({
      id: "client-stalled",
      message: `${clientStalled} campaign${clientStalled === 1 ? "" : "s"} waiting on client more than 7 days`,
      tone: "warning",
    });
  }

  if (revisionOverdue > 0) {
    alerts.push({
      id: "revision-overdue",
      message: `${revisionOverdue} revision overdue`,
      tone: "warning",
    });
  }

  if (deliverablesReady > 0) {
    alerts.push({
      id: "deliverables-ready",
      message: `${deliverablesReady} deliverable${deliverablesReady === 1 ? "" : "s"} ready for review`,
      tone: "info",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "all-clear",
      message: "No urgent items — kitchen is running smoothly.",
      tone: "info",
    });
  }

  return alerts;
}

export function buildKitchenDetailView(campaign: KitchenCampaign): KitchenDetailView {
  const currentIndex = kitchenStageIndex(campaign.currentStageId);
  const withBucket = withKitchenBucket(campaign);

  const stages: KitchenStageRow[] = kitchenStageDefinitions.map((def, index) => ({
    stageId: def.id,
    title: def.title,
    summary: def.summary,
    state: index < currentIndex ? "completed" : index === currentIndex ? "current" : "pending",
  }));

  return { campaign: withBucket, stages };
}

export function formatKitchenLastUpdated(timestamp: KitchenCampaign["lastUpdated"]): string {
  return `${timestamp.date} ${timestamp.time}`;
}

export function formatKitchenDaysInStage(days: number): string {
  return `${days} Day${days === 1 ? "" : "s"}`;
}

export function formatKitchenWaitingDays(days: number): string {
  return `Waiting: ${formatKitchenDaysInStage(days)}`;
}
