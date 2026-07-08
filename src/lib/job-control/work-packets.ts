import type { CampaignRecord } from "@/config/studio-board";
import { teamOfficePath, teamOfficeRoleLabels } from "@/config/team-offices";
import { filterProductionPlanLineItems } from "@/lib/deliverable-scope";
import { taskRequiredRole } from "@/lib/campaign-tasks/capabilities";
import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";
import { redactWorkingFileRefForClient } from "@/lib/file-storage/redact";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import type { RouteMapProductionBrief } from "@/lib/route-map-production-brief";

import { resolveRequiredDeliverableKeys } from "./production-workspace-gates";
import type {
  JobInternalNote,
  JobWorkPacket,
  JobWorkPacketRole,
  JobWorkingFileRef,
  PurchasedJobRecord,
} from "./types";

export const WORK_PACKET_ROLE_ORDER: readonly JobWorkPacketRole[] = [
  "strategy",
  "copy",
  "creative_production",
  "qa",
  "producer_dispatcher",
];

const WORK_PACKET_ROLE_SET = new Set<JobWorkPacketRole>(WORK_PACKET_ROLE_ORDER);

export type WorkPacketRoleRow = {
  role: JobWorkPacketRole;
  roleLabel: string;
  officeHref: string;
  taskIds: readonly string[];
  taskTitles: readonly string[];
  nextResponsibleLabel: string;
  statusLabel: string;
  packetId: string | null;
  assignedAt: string | null;
  returnedAt: string | null;
  returnedFileCount: number;
  canAssign: boolean;
};

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

export type JobWorkPacketSummaryView = {
  jobId: string;
  campaignId: string;
  serviceName: string;
  productionBriefAvailable: boolean;
  requiredDeliverables: readonly { key: string; label: string; prepared: boolean }[];
  materials: readonly { id: string; label: string; status: string }[];
  internalNotes: readonly JobInternalNote[];
  workingFileRefs: readonly JobWorkingFileRef[];
  roleRows: readonly WorkPacketRoleRow[];
  returnedFiles: readonly WorkPacketReturnFileRow[];
  ownerApprovalRequirement: string;
  returnLocationLabel: string;
  integrationStatusLabel: string;
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
};

export function isJobWorkPacketRole(role: string): role is JobWorkPacketRole {
  return WORK_PACKET_ROLE_SET.has(role as JobWorkPacketRole);
}

function roleSortIndex(role: JobWorkPacketRole): number {
  const index = WORK_PACKET_ROLE_ORDER.indexOf(role);
  return index === -1 ? WORK_PACKET_ROLE_ORDER.length : index;
}

export function workPacketId(jobId: string, role: JobWorkPacketRole): string {
  return `packet:${jobId}:${role}`;
}

export function tasksForJob(
  tasks: readonly CampaignTaskItem[],
  job: PurchasedJobRecord,
): CampaignTaskItem[] {
  return tasks.filter((task) => task.relatedServiceIds.includes(job.skuId));
}

export function resolveWorkPacketRolesForJob(
  tasks: readonly CampaignTaskItem[],
  job: PurchasedJobRecord,
): JobWorkPacketRole[] {
  const roles = new Set<JobWorkPacketRole>();
  for (const task of tasksForJob(tasks, job)) {
    const role = taskRequiredRole(task);
    if (isJobWorkPacketRole(role)) roles.add(role);
  }
  return [...roles].sort((a, b) => roleSortIndex(a) - roleSortIndex(b));
}

export function resolveWorkPacketTasksForRole(
  tasks: readonly CampaignTaskItem[],
  job: PurchasedJobRecord,
  role: JobWorkPacketRole,
): CampaignTaskItem[] {
  return tasksForJob(tasks, job).filter((task) => taskRequiredRole(task) === role);
}

function lineDeliverables(campaign: CampaignRecord, job: PurchasedJobRecord): readonly string[] {
  if (!campaign.approvedStudioPlan) return [];
  const line = filterProductionPlanLineItems(campaign.approvedStudioPlan).find(
    (item) => (item.skuId ?? item.serviceId) === job.skuId,
  );
  return line?.deliverables ?? [];
}

function formatActor(actor: { displayName?: string; role: string }): string {
  return actor.displayName ?? actor.role;
}

function packetStatusLabel(packet: JobWorkPacket | undefined): string {
  if (!packet) return "Not assigned";
  return packet.status === "returned" ? "Returned file reference" : "Assigned";
}

function returnedFileRows(
  packets: readonly JobWorkPacket[] | undefined,
): WorkPacketReturnFileRow[] {
  return (packets ?? []).flatMap((packet) =>
    packet.returnedFileRefs.map((ref) => ({
      id: ref.id,
      kind: ref.kind,
      label: ref.label,
      url: ref.url,
      returnedAt: ref.returnedAt,
      returnedByLabel: formatActor(ref.returnedBy),
      deliverableLabel: ref.deliverableLabel ?? null,
      note: ref.note ?? null,
    })),
  );
}

function materialRows(job: PurchasedJobRecord, materials: readonly CampaignMaterialItem[]) {
  return materials
    .filter((item) => item.relatedServiceIds.includes(job.skuId))
    .map((item) => ({
      id: item.id,
      label: item.label,
      status: item.submittedAt ? "received" : item.uploadStatus ?? item.reviewStatus,
    }));
}

export function resolveJobWorkPacketSummaryView(input: {
  campaign: CampaignRecord;
  job: PurchasedJobRecord;
  tasks: readonly CampaignTaskItem[];
  materials: readonly CampaignMaterialItem[];
  productionBrief: RouteMapProductionBrief | null;
}): JobWorkPacketSummaryView {
  const { campaign, job, tasks, materials, productionBrief } = input;
  const packets = job.workPackets ?? [];
  const packetByRole = new Map(packets.map((packet) => [packet.role, packet]));
  const roles = resolveWorkPacketRolesForJob(tasks, job);
  const deliverables = resolveRequiredDeliverableKeys(lineDeliverables(campaign, job)).map((def) => ({
    key: def.key,
    label: def.label,
    prepared: Boolean(
      (job.deliverablePrep ?? []).find(
        (entry) => entry.deliverableKey === def.key && entry.preparedAt,
      ),
    ),
  }));

  const roleRows: WorkPacketRoleRow[] = roles.map((role) => {
    const roleTasks = resolveWorkPacketTasksForRole(tasks, job, role);
    const claimed = roleTasks.find((task) => task.claimedByDisplayName);
    const packet = packetByRole.get(role);
    const lastReturn = packet?.returnedFileRefs.at(-1);
    return {
      role,
      roleLabel: teamOfficeRoleLabels[role],
      officeHref: teamOfficePath(job.campaignId, role),
      taskIds: roleTasks.map((task) => task.id),
      taskTitles: roleTasks.map((task) => task.title),
      nextResponsibleLabel: claimed?.claimedByDisplayName ?? `${teamOfficeRoleLabels[role]} Office`,
      statusLabel: packetStatusLabel(packet),
      packetId: packet?.id ?? null,
      assignedAt: packet?.assignmentEvents.at(-1)?.assignedAt ?? null,
      returnedAt: lastReturn?.returnedAt ?? null,
      returnedFileCount: packet?.returnedFileRefs.length ?? 0,
      canAssign: !packet,
    };
  });

  return {
    jobId: job.jobId,
    campaignId: job.campaignId,
    serviceName: job.serviceName,
    productionBriefAvailable: Boolean(productionBrief),
    requiredDeliverables: deliverables,
    materials: materialRows(job, materials),
    internalNotes: job.internalNotes ?? [],
    workingFileRefs: (job.workingFileRefs ?? []).map(redactWorkingFileRefForClient),
    roleRows,
    returnedFiles: returnedFileRows(packets),
    ownerApprovalRequirement:
      "Production is responsible for returning client-ready work; Owner support is only for escalations or business judgment.",
    returnLocationLabel: "Return draft/final file refs to Production Workspace.",
    integrationStatusLabel: "Manual file links only — no external tool connection.",
  };
}

export function resolveTeamOfficeWorkPacketView(input: {
  campaign: CampaignRecord;
  job: PurchasedJobRecord;
  tasks: readonly CampaignTaskItem[];
  materials: readonly CampaignMaterialItem[];
  productionBrief: RouteMapProductionBrief | null;
  selectedTaskId: string;
}): TeamOfficeWorkPacketView | null {
  const { campaign, job, tasks, materials, productionBrief, selectedTaskId } = input;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  if (!selectedTask || !selectedTask.relatedServiceIds.includes(job.skuId)) return null;

  const role = taskRequiredRole(selectedTask);
  if (!isJobWorkPacketRole(role)) return null;

  const packet = (job.workPackets ?? []).find((entry) => entry.role === role);
  if (!packet) return null;

  const summary = resolveJobWorkPacketSummaryView({
    campaign,
    job,
    tasks,
    materials,
    productionBrief,
  });

  return {
    packetId: packet.id,
    jobId: job.jobId,
    campaignId: job.campaignId,
    serviceName: job.serviceName,
    role,
    roleLabel: teamOfficeRoleLabels[role],
    taskTitle: selectedTask.title,
    statusLabel: packetStatusLabel(packet),
    productionBriefAvailable: Boolean(productionBrief),
    productionBrief,
    requiredDeliverables: summary.requiredDeliverables,
    materials: summary.materials,
    internalNotes: summary.internalNotes,
    workingFileRefs: summary.workingFileRefs,
    returnedFiles: returnedFileRows([packet]),
    ownerApprovalRequirement: summary.ownerApprovalRequirement,
    returnLocationLabel: summary.returnLocationLabel,
    integrationStatusLabel: summary.integrationStatusLabel,
  };
}
