import {
  KITCHEN_CLIENT_DELAY_DAYS,
  kitchenIsClientDelayed,
  type KitchenCampaign,
} from "@/config/studio-kitchen";

export const KITCHEN_BUCKET_IDS = [
  "needs-concepts",
  "needs-production",
  "needs-review",
  "needs-delivery",
  "concept-selection",
  "deliverable-review",
  "revision-feedback",
  "concepts-in-progress",
  "deliverables-in-progress",
  "revisions-in-progress",
  "no-response-7-days",
] as const;

export type KitchenBucketId = (typeof KITCHEN_BUCKET_IDS)[number];

export type KitchenBucketGroupId =
  | "my-work"
  | "waiting-on-client"
  | "in-production"
  | "client-delayed";

export type KitchenBucketDefinition = {
  id: KitchenBucketId;
  label: string;
  groupId: KitchenBucketGroupId;
};

export type KitchenBucketGroupDefinition = {
  id: KitchenBucketGroupId;
  title: string;
  buckets: KitchenBucketDefinition[];
};

export const kitchenBucketGroups: KitchenBucketGroupDefinition[] = [
  {
    id: "my-work",
    title: "My Work",
    buckets: [
      { id: "needs-concepts", label: "Needs Concepts", groupId: "my-work" },
      { id: "needs-production", label: "Needs Production", groupId: "my-work" },
      { id: "needs-review", label: "Needs Review", groupId: "my-work" },
      { id: "needs-delivery", label: "Needs Delivery", groupId: "my-work" },
    ],
  },
  {
    id: "waiting-on-client",
    title: "Waiting On Client",
    buckets: [
      { id: "concept-selection", label: "Concept Selection", groupId: "waiting-on-client" },
      { id: "deliverable-review", label: "Deliverable Review", groupId: "waiting-on-client" },
      { id: "revision-feedback", label: "Revision Feedback", groupId: "waiting-on-client" },
    ],
  },
  {
    id: "in-production",
    title: "In Production",
    buckets: [
      { id: "concepts-in-progress", label: "Concepts In Progress", groupId: "in-production" },
      { id: "deliverables-in-progress", label: "Deliverables In Progress", groupId: "in-production" },
      { id: "revisions-in-progress", label: "Revisions In Progress", groupId: "in-production" },
    ],
  },
  {
    id: "client-delayed",
    title: "Client Delayed",
    buckets: [
      { id: "no-response-7-days", label: "No Response > 7 Days", groupId: "client-delayed" },
    ],
  },
];

const bucketById = new Map<KitchenBucketId, KitchenBucketDefinition>(
  kitchenBucketGroups.flatMap((group) => group.buckets.map((bucket) => [bucket.id, bucket])),
);

export function kitchenBucketLabel(bucketId: KitchenBucketId): string {
  return bucketById.get(bucketId)?.label ?? bucketId;
}

export function kitchenBucketGroupTitle(groupId: KitchenBucketGroupId): string {
  return kitchenBucketGroups.find((group) => group.id === groupId)?.title ?? groupId;
}

export function kitchenBucketGroupId(bucketId: KitchenBucketId): KitchenBucketGroupId {
  return bucketById.get(bucketId)?.groupId ?? "my-work";
}

function kitchenHasProductionStarted(campaign: KitchenCampaign): boolean {
  return campaign.auditTrail.some((event) =>
    event.label.toLowerCase().includes("production started"),
  );
}

function kitchenHasRevisionRequested(campaign: KitchenCampaign): boolean {
  return campaign.auditTrail.some((event) =>
    event.label.toLowerCase().includes("revision"),
  );
}

/** Each campaign resolves to exactly one bucket. */
export function resolveKitchenBucket(campaign: KitchenCampaign): KitchenBucketId {
  if (
    campaign.currentStageId === "waiting-on-client" &&
    kitchenIsClientDelayed(campaign)
  ) {
    return "no-response-7-days";
  }

  switch (campaign.currentStageId) {
    case "new-campaign":
      return "needs-production";

    case "needs-directions":
      return campaign.waitingOn === "ChatGPT" ? "concepts-in-progress" : "needs-concepts";

    case "waiting-on-client":
      if (kitchenHasRevisionRequested(campaign)) return "revision-feedback";
      if (kitchenHasProductionStarted(campaign)) return "deliverable-review";
      return "concept-selection";

    case "ready-for-production":
      return "needs-production";

    case "in-production":
      return "deliverables-in-progress";

    case "owner-review":
    case "ready-for-client-review":
      return "needs-review";

    case "revision-requests":
      if (campaign.waitingOn === "ChatGPT") return "revisions-in-progress";
      if (campaign.waitingOn === "Client") return "revision-feedback";
      return "needs-review";

    case "final-delivery":
      return "needs-delivery";

    default:
      return "needs-review";
  }
}
