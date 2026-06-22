/**
 * Studio Kitchen V2 — owner operations center (Phase 1).
 * Layout + workflow visualization only — no automation, email, or AI wiring.
 */

import { kitchenCampaignSeed } from "@/config/studio-kitchen-campaigns";
import { KITCHEN_CLIENT_DELAY_DAYS } from "@/config/studio-kitchen-campaigns";
import type { KitchenExceptionTrayId, KitchenFileBucketId } from "@/config/studio-kitchen-file-room";

export type { KitchenExceptionTrayId, KitchenFileBucketId };

export { KITCHEN_CLIENT_DELAY_DAYS };

export const KITCHEN_STAGES = [
  "new-campaign",
  "needs-directions",
  "waiting-on-client",
  "ready-for-production",
  "in-production",
  "owner-review",
  "ready-for-client-review",
  "revision-requests",
  "final-delivery",
] as const;

export type KitchenStageId = (typeof KITCHEN_STAGES)[number];

export type KitchenTimestamp = {
  date: string;
  time: string;
};

export type KitchenPriority = "Normal" | "Rush" | "Waiting" | "Client Delayed" | "Overdue";

export type KitchenDeliverableLine = {
  key: "SOCIAL" | "EMAIL" | "SMS" | "CALENDAR" | "VIDEO";
  complete: number;
  total: number;
};

export type KitchenAuditEvent = {
  label: string;
  timestamp: KitchenTimestamp;
  responsible: string;
};

/** @deprecated Use auditTrail — kept for migration */
export type KitchenHistoryEventId =
  | "campaign-record-submitted"
  | "direction-selected"
  | "production-started"
  | "review-notice-sent"
  | "revision-requested"
  | "revision-completed"
  | "final-delivery-published";

export type KitchenHistoryEvent = {
  id: KitchenHistoryEventId;
  label: string;
  timestamp: KitchenTimestamp;
};

export type KitchenAction = {
  label: string;
  href?: string;
  phase1Stub?: boolean;
};

export type KitchenStageDefinition = {
  id: KitchenStageId;
  title: string;
  summary: string;
  action?: KitchenAction;
};

export type KitchenCampaign = {
  id: string;
  folderNumber: string;
  campaignName: string;
  clientName: string;
  currentStageId: KitchenStageId;
  /** Active bucket queue or exception tray — folder exists in exactly one. */
  folderLocation: "bucket" | "tray";
  homeBucketId?: KitchenFileBucketId;
  queueOrder?: number;
  trayId?: KitchenExceptionTrayId;
  /** Set when a folder re-enters its home bucket at the back of the queue. */
  returnedToQueueAt?: KitchenTimestamp;
  assignedTo: string;
  waitingOn: string;
  daysInStage: number;
  lastUpdated: KitchenTimestamp;
  statusLabel: string;
  stageEnteredAt: KitchenTimestamp;
  nextAction: string;
  priority: KitchenPriority;
  revisionsUsed: number;
  revisionsTotal: number;
  deliverables: KitchenDeliverableLine[];
  ownerNotes: string[];
  auditTrail: KitchenAuditEvent[];
  selectedDirection?: string;
  reviewNoticeSent?: KitchenTimestamp;
  lastContactDate?: KitchenTimestamp;
  reminderCount?: string;
  history?: KitchenHistoryEvent[];
  alerts?: {
    waitingOnOwner?: boolean;
    clientStalled?: boolean;
    revisionOverdue?: boolean;
    deliverablesReadyForReview?: boolean;
  };
};

export type KitchenAlert = {
  id: string;
  message: string;
  tone: "warning" | "info";
};

export const kitchenStageDefinitions: KitchenStageDefinition[] = [
  {
    id: "new-campaign",
    title: "New Campaign",
    summary: "Fresh intake — campaign record needed.",
    action: { label: "Open Campaign Record", href: "/studio-board?record=open" },
  },
  {
    id: "needs-directions",
    title: "Needs Directions",
    summary: "Brief ready — direction concepts needed.",
    action: { label: "Copy Campaign Brief", phase1Stub: true },
  },
  {
    id: "waiting-on-client",
    title: "Waiting On Client",
    summary: "Directions sent — client is reviewing.",
  },
  {
    id: "ready-for-production",
    title: "Ready For Production",
    summary: "Direction chosen — ready to build.",
    action: { label: "Copy Production Brief", phase1Stub: true },
  },
  {
    id: "in-production",
    title: "In Production",
    summary: "Deliverables are being built.",
  },
  {
    id: "owner-review",
    title: "Owner Review",
    summary: "Owner quality check before client sees work.",
    action: { label: "Review Deliverables", href: "/deliverables?preview=delivered" },
  },
  {
    id: "ready-for-client-review",
    title: "Ready For Client Review",
    summary: "Deliverables approved — notify the client.",
    action: { label: "Send Review Notice", phase1Stub: true },
  },
  {
    id: "revision-requests",
    title: "Revision Requests",
    summary: "Client requested changes — track the round.",
    action: { label: "Open Revision Notes", href: "/feedback-studio" },
  },
  {
    id: "final-delivery",
    title: "Final Delivery",
    summary: "Approved work ready to publish.",
    action: { label: "Publish Final Delivery", href: "/deliverables" },
  },
];

export const kitchenCampaigns: KitchenCampaign[] = kitchenCampaignSeed;

export const studioKitchen = {
  route: "/studio-kitchen",

  page: {
    eyebrow: "Owner operations",
    title: "Studio Kitchen",
    lead:
      "Workflow control center — see every campaign, who owns the next step, and what needs attention.",
    phaseNote:
      "V5 — one folder, one bucket. Open folder → perform action → move folder. History holds completed stages.",
    backLabel: "← Studio Board",
    backHref: "/studio-board",
    dashboardBackLabel: "← All Campaigns",
  },

  alerts: {
    title: "Needs Your Attention",
    icon: "🚨",
  },

  fileRoom: {
    title: "Campaign File Room",
    queueLabel: "Queue",
    trayLabel: "Exception Tray",
    returnedToQueueLabel: "RETURNED TO QUEUE",
    openFolderLabel: "Open Folder",
    actionCenterLabel: "Folder Actions",
    movesToLabel: "When complete →",
    historyNote: "Completed stages appear in Workflow History and Audit Trail only — not in active buckets.",
  },

  buckets: {
    title: "Campaign Buckets",
  },

  table: {
    title: "All Campaigns",
    groupedByBucketNote: "Each campaign belongs to one bucket — grouped below.",
    columns: {
      priority: "Priority",
      bucket: "Bucket",
      campaignName: "Campaign Name",
      clientName: "Client Name",
      currentStage: "Current Stage",
      nextAction: "Next Action",
      assignedTo: "Assigned To",
      waitingOn: "Waiting On",
      deliverables: "Deliverables",
      revisionStatus: "Revision Status",
      clientContact: "Client Contact",
      daysInStage: "Days In Stage",
      stageEntered: "Entered Stage",
      lastUpdated: "Last Updated",
      open: "Open Campaign",
    },
    openLabel: "Open",
    clientDelayedBadge: "CLIENT DELAYED",
  },

  detail: {
    workflowTitle: "Campaign Workflow",
    auditTitle: "Campaign Audit Trail",
    ownerNotesTitle: "Owner Notes",
    ownerNotesEmpty: "No internal notes yet.",
    waitingLabel: "Waiting On",
    daysLabel: "Days In Stage",
    daysWaitingPrefix: "Waiting:",
    revisionStatusLabel: "Revision Status",
    revisionRemainingLabel: "Remaining Revisions",
    priorityLabel: "Priority",
    bucketLabel: "Bucket",
    nextActionLabel: "Next Action",
    stageEnteredLabel: "Entered Current Stage",
    deliverablesTitle: "Deliverables",
    clientContactTitle: "Client Contact",
    reviewNoticeSentLabel: "Review Notice Sent",
    lastContactLabel: "Last Contact",
    reminderCountLabel: "Reminder Count",
    drawerFullViewLabel: "Open Full Campaign View →",
  },

  drawer: {
    title: "Campaign Detail",
    auditTitle: "Workflow History",
    closeLabel: "Close",
  },
} as const;

export function kitchenCampaignHref(campaignId: string): string {
  return `${studioKitchen.route}/${campaignId}`;
}

export function kitchenStageIndex(stageId: KitchenStageId): number {
  return KITCHEN_STAGES.indexOf(stageId);
}

export function kitchenStageTitle(stageId: KitchenStageId): string {
  return kitchenStageDefinitions.find((s) => s.id === stageId)?.title ?? stageId;
}

export function kitchenFormatRevisionStatus(campaign: KitchenCampaign): string {
  const { revisionsUsed, revisionsTotal } = campaign;
  if (revisionsUsed >= revisionsTotal) {
    return `${revisionsTotal} / ${revisionsTotal} Used (Locked)`;
  }
  return `${revisionsUsed} / ${revisionsTotal} Used`;
}

export function kitchenRemainingRevisions(campaign: KitchenCampaign): number {
  return Math.max(0, campaign.revisionsTotal - campaign.revisionsUsed);
}

export function kitchenIsClientDelayed(campaign: KitchenCampaign): boolean {
  if (campaign.priority === "Client Delayed") return true;
  return (
    campaign.currentStageId === "waiting-on-client" && campaign.daysInStage >= KITCHEN_CLIENT_DELAY_DAYS
  );
}

export function kitchenDeliverableComplete(line: KitchenDeliverableLine): boolean {
  return line.complete >= line.total;
}

export function kitchenDeliverablesBlocking(campaign: KitchenCampaign): KitchenDeliverableLine[] {
  return campaign.deliverables.filter((line) => line.total > 0 && line.complete < line.total);
}

export function kitchenShowClientContact(campaign: KitchenCampaign): boolean {
  return campaign.currentStageId === "waiting-on-client" || Boolean(campaign.reviewNoticeSent);
}
