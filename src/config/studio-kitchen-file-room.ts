/**
 * Studio Kitchen V5 — physical file room workflow.
 * One folder → one active bucket (or its exception tray). Completed stages live in history only.
 */

import {
  kitchenIsClientDelayed,
  type KitchenAction,
  type KitchenCampaign,
} from "@/config/studio-kitchen";

export const KITCHEN_FILE_BUCKET_IDS = [
  "intake-received",
  "needs-concepts",
  "client-reviewing-concepts",
  "production-ready",
  "in-production",
  "owner-review",
  "client-reviewing-deliverables",
  "revision-queue",
  "final-delivery",
] as const;

export type KitchenFileBucketId = (typeof KITCHEN_FILE_BUCKET_IDS)[number];

export const KITCHEN_EXCEPTION_TRAY_IDS = ["client-delayed"] as const;

export type KitchenExceptionTrayId = (typeof KITCHEN_EXCEPTION_TRAY_IDS)[number];

export type KitchenFolderSticker = "active" | "waiting" | "delayed";

export type KitchenBucketAlertLevel = "green" | "yellow" | "orange" | "red";

export type KitchenFileBucketDefinition = {
  id: KitchenFileBucketId;
  label: string;
  summary: string;
  ownerAction: boolean;
  movesTo?: KitchenFileBucketId;
  actions: KitchenAction[];
  ownerReviewChecklist?: string[];
  trayId?: KitchenExceptionTrayId;
  trayLabel?: string;
};

export type KitchenExceptionTrayDefinition = {
  id: KitchenExceptionTrayId;
  label: string;
};

export const kitchenFileBuckets: KitchenFileBucketDefinition[] = [
  {
    id: "intake-received",
    label: "Intake Received",
    summary: "Client completed intake — open the campaign brief.",
    ownerAction: true,
    movesTo: "needs-concepts",
    actions: [
      { label: "Open Campaign Brief", href: "/studio-board?record=open" },
      { label: "Copy Campaign Brief", phase1Stub: true },
      { label: "Send to ChatGPT", phase1Stub: true },
    ],
  },
  {
    id: "needs-concepts",
    label: "Needs Concepts",
    summary: "ChatGPT builds Concept A, B, and C — owner pastes and sends to client.",
    ownerAction: true,
    movesTo: "client-reviewing-concepts",
    actions: [
      { label: "Paste Concepts", phase1Stub: true },
      { label: "Send Concepts To Client", phase1Stub: true },
    ],
  },
  {
    id: "client-reviewing-concepts",
    label: "Client Reviewing Concepts",
    summary: "Client chooses Concept A, B, or C.",
    ownerAction: false,
    movesTo: "production-ready",
    trayId: "client-delayed",
    trayLabel: "Client Delayed",
    actions: [
      { label: "View Selected Concept", phase1Stub: true },
      { label: "Copy Production Brief", phase1Stub: true },
    ],
  },
  {
    id: "production-ready",
    label: "Production Ready",
    summary: "Concept selected — send production brief to ChatGPT.",
    ownerAction: true,
    movesTo: "in-production",
    actions: [
      { label: "Open Production Brief", phase1Stub: true },
      { label: "Copy Production Brief", phase1Stub: true },
      { label: "Send To ChatGPT", phase1Stub: true },
    ],
  },
  {
    id: "in-production",
    label: "In Production",
    summary: "ChatGPT builds social, email, SMS, video scripts, and calendar.",
    ownerAction: false,
    movesTo: "owner-review",
    actions: [{ label: "View Production Brief", phase1Stub: true }],
  },
  {
    id: "owner-review",
    label: "Owner Review",
    summary: "Verify every deliverable type is present before client sees work.",
    ownerAction: true,
    movesTo: "client-reviewing-deliverables",
    ownerReviewChecklist: ["Social present", "Email present", "SMS present", "Video present", "Calendar present"],
    actions: [{ label: "Approve Deliverables", href: "/deliverables?preview=delivered", phase1Stub: true }],
  },
  {
    id: "client-reviewing-deliverables",
    label: "Client Reviewing Deliverables",
    summary: "Client approves or requests revisions.",
    ownerAction: false,
    movesTo: "final-delivery",
    trayId: "client-delayed",
    trayLabel: "Client Delayed",
    actions: [],
  },
  {
    id: "revision-queue",
    label: "Revision Queue",
    summary: "Owner sends revision notes to ChatGPT — folder returns to client deliverable review.",
    ownerAction: true,
    movesTo: "client-reviewing-deliverables",
    actions: [
      { label: "Open Revision Notes", href: "/feedback-studio" },
      { label: "Copy Revision Notes", phase1Stub: true },
      { label: "Send To ChatGPT", phase1Stub: true },
    ],
  },
  {
    id: "final-delivery",
    label: "Final Delivery",
    summary: "Approved — ready for download and archive.",
    ownerAction: true,
    actions: [
      { label: "Open Deliverables", href: "/deliverables" },
      { label: "Publish Final Delivery", href: "/deliverables", phase1Stub: true },
    ],
  },
];

export const kitchenExceptionTrays: KitchenExceptionTrayDefinition[] = [
  { id: "client-delayed", label: "Client Delayed" },
];

const bucketById = new Map(kitchenFileBuckets.map((bucket) => [bucket.id, bucket]));

export type KitchenFolderPlacement = {
  folderLocation: "bucket" | "tray";
  homeBucketId: KitchenFileBucketId;
  queueOrder: number | null;
  trayId: KitchenExceptionTrayId | null;
};

export function kitchenFileBucketLabel(bucketId: KitchenFileBucketId): string {
  return bucketById.get(bucketId)?.label ?? bucketId;
}

export function kitchenFileBucketDefinition(bucketId: KitchenFileBucketId): KitchenFileBucketDefinition | undefined {
  return bucketById.get(bucketId);
}

export function kitchenExceptionTrayLabel(trayId: KitchenExceptionTrayId): string {
  return kitchenExceptionTrays.find((tray) => tray.id === trayId)?.label ?? trayId;
}

export function kitchenBucketActions(bucketId: KitchenFileBucketId): KitchenAction[] {
  return bucketById.get(bucketId)?.actions ?? [];
}

export function kitchenBucketMoveToLabel(bucketId: KitchenFileBucketId): string | null {
  const next = bucketById.get(bucketId)?.movesTo;
  return next ? kitchenFileBucketLabel(next) : null;
}

export function kitchenFolderSticker(campaign: KitchenCampaign): KitchenFolderSticker {
  if (campaign.folderLocation === "tray" || kitchenIsClientDelayed(campaign)) return "delayed";
  if (campaign.waitingOn === "Client" || campaign.priority === "Waiting") return "waiting";
  return "active";
}

export function kitchenShowReturnedToQueue(campaign: KitchenCampaign): boolean {
  return Boolean(campaign.returnedToQueueAt);
}

function kitchenIsConceptClientReview(campaign: KitchenCampaign): boolean {
  if (campaign.homeBucketId === "client-reviewing-concepts") return true;
  if (campaign.homeBucketId === "client-reviewing-deliverables") return false;
  if (campaign.currentStageId === "waiting-on-client") {
    return !campaign.auditTrail.some((event) => event.label.toLowerCase().includes("production started"));
  }
  return campaign.currentStageId === "needs-directions" || campaign.currentStageId === "new-campaign";
}

/** Map legacy stage to V5 bucket when homeBucketId is not set on seed data. */
export function resolveHomeBucket(campaign: KitchenCampaign): KitchenFileBucketId {
  if (campaign.homeBucketId) return campaign.homeBucketId;

  switch (campaign.currentStageId) {
    case "new-campaign":
      return "intake-received";
    case "needs-directions":
      return "needs-concepts";
    case "waiting-on-client":
      return kitchenIsConceptClientReview(campaign)
        ? "client-reviewing-concepts"
        : "client-reviewing-deliverables";
    case "ready-for-production":
      return "production-ready";
    case "in-production":
      return "in-production";
    case "owner-review":
      return "owner-review";
    case "ready-for-client-review":
      return "client-reviewing-deliverables";
    case "revision-requests":
      return "revision-queue";
    case "final-delivery":
      return "final-delivery";
    default:
      return "owner-review";
  }
}

export function inferExceptionTray(campaign: KitchenCampaign): KitchenExceptionTrayId | null {
  if (campaign.trayId) return campaign.trayId;

  const home = resolveHomeBucket(campaign);
  if (
    (home === "client-reviewing-concepts" || home === "client-reviewing-deliverables") &&
    kitchenIsClientDelayed(campaign)
  ) {
    return "client-delayed";
  }

  return null;
}

export function resolveFolderPlacement(campaign: KitchenCampaign): KitchenFolderPlacement {
  const homeBucketId = resolveHomeBucket(campaign);

  if (campaign.folderLocation === "tray") {
    const trayId = campaign.trayId ?? inferExceptionTray(campaign) ?? "client-delayed";
    return {
      folderLocation: "tray",
      homeBucketId: campaign.homeBucketId ?? homeBucketId,
      queueOrder: null,
      trayId,
    };
  }

  if (campaign.folderLocation === "bucket") {
    return {
      folderLocation: "bucket",
      homeBucketId,
      queueOrder: campaign.queueOrder ?? null,
      trayId: null,
    };
  }

  const inferredTray = inferExceptionTray(campaign);
  if (inferredTray) {
    return {
      folderLocation: "tray",
      homeBucketId,
      queueOrder: null,
      trayId: inferredTray,
    };
  }

  return {
    folderLocation: "bucket",
    homeBucketId,
    queueOrder: campaign.queueOrder ?? null,
    trayId: null,
  };
}

export function sortBucketQueue<T extends { queueOrder: number | null }>(folders: T[]): T[] {
  return [...folders].sort((a, b) => {
    const orderA = a.queueOrder ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.queueOrder ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
}

export function reenterFolderAtQueueBack(
  campaign: KitchenCampaign,
  activeQueue: KitchenCampaign[],
): KitchenCampaign {
  const homeBucketId = resolveHomeBucket(campaign);
  const maxOrder = activeQueue.reduce((max, folder) => {
    if (resolveHomeBucket(folder) !== homeBucketId) return max;
    return Math.max(max, folder.queueOrder ?? 0);
  }, 0);

  return {
    ...campaign,
    folderLocation: "bucket",
    trayId: undefined,
    homeBucketId,
    queueOrder: maxOrder + 1,
    returnedToQueueAt: campaign.returnedToQueueAt ?? { date: "June 21, 2026", time: "Now" },
  };
}

export function kitchenBucketAlertLevel(
  bucketId: KitchenFileBucketId,
  folderCount: number,
  hasOverdue: boolean,
): KitchenBucketAlertLevel {
  const bucket = bucketById.get(bucketId);
  if (!bucket) return "green";
  if (folderCount === 0) return "green";
  if (hasOverdue) return "red";
  if (bucket.ownerAction) return folderCount >= 3 ? "orange" : "orange";
  if (folderCount >= 4) return "yellow";
  return "green";
}

export function kitchenTrayAlertLevel(trayCount: number): KitchenBucketAlertLevel {
  if (trayCount === 0) return "green";
  if (trayCount >= 3) return "red";
  return "orange";
}

export type KitchenPriorityAlert = {
  id: string;
  message: string;
  level: KitchenBucketAlertLevel;
  bucketId?: KitchenFileBucketId;
  trayId?: KitchenExceptionTrayId;
};

export function formatPriorityAlert(count: number, singular: string, plural: string): string {
  const noun = count === 1 ? singular : plural;
  return `🚨 ${count} ${noun}`;
}
