import { isOwnerUser } from "@/lib/campaign-store/access";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";

import { FAMILY_TASK_PIPELINES } from "./templates";
import { resolveResponsibleRole } from "./roles";
import type { CampaignTaskItem, ProductionRole, ProductionTaskFamilyId } from "./types";

const PRODUCER_ROLE: ProductionRole = "producer_dispatcher";

const CAPABILITY_ROLES = new Set<ProductionRole>([
  PRODUCER_ROLE,
  "strategy",
  "copy",
  "creative_production",
  "qa",
  "owner",
  "client_input",
]);

function parseProductionRoles(roles: readonly string[] | undefined): readonly ProductionRole[] {
  if (!roles) return [];
  return roles.filter((role): role is ProductionRole =>
    CAPABILITY_ROLES.has(role as ProductionRole),
  );
}

/** Roles that may receive work for a task family — derived from pipeline phases. */
export const FAMILY_CAPABLE_ROLES: Record<ProductionTaskFamilyId, readonly ProductionRole[]> = {
  brand_identity_messaging: collectFamilyRoles("brand_identity_messaging"),
  campaign_launch_monthly: collectFamilyRoles("campaign_launch_monthly"),
  social: collectFamilyRoles("social"),
  copy_channels: collectFamilyRoles("copy_channels"),
  video_audio: collectFamilyRoles("video_audio"),
  landing_page: collectFamilyRoles("landing_page"),
  optimization: collectFamilyRoles("optimization"),
  marketing_assets: collectFamilyRoles("marketing_assets"),
};

function collectFamilyRoles(familyId: ProductionTaskFamilyId): readonly ProductionRole[] {
  const pipeline = FAMILY_TASK_PIPELINES[familyId];
  const roles = new Set<ProductionRole>();
  for (const blueprint of pipeline) {
    roles.add(
      resolveResponsibleRole({
        id: `family:${blueprint.phase}`,
        title: blueprint.titleSuffix,
        phase: blueprint.phase,
        status: "not_ready",
        relatedServiceIds: [],
        familyId,
        catalogFamilyId: "social_media",
        serviceName: "Family",
        dependsOn: [],
      }),
    );
  }
  roles.add(PRODUCER_ROLE);
  return [...roles];
}

export function userProductionRoles(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): readonly ProductionRole[] {
  if (isOwnerUser(user)) {
    return [
      PRODUCER_ROLE,
      "strategy",
      "copy",
      "creative_production",
      "qa",
      "owner",
      "client_input",
    ];
  }

  return parseProductionRoles(assignments.staffCapabilities?.[user.id]);
}

export function userIsProducer(user: StudioUser, assignments: CampaignAssignmentsFile): boolean {
  if (isOwnerUser(user)) return true;
  return userProductionRoles(user, assignments).includes(PRODUCER_ROLE);
}

export function userCanPerformRole(
  user: StudioUser,
  role: ProductionRole,
  assignments: CampaignAssignmentsFile,
): boolean {
  return userProductionRoles(user, assignments).includes(role);
}

export function taskRequiredRole(task: CampaignTaskItem): ProductionRole {
  return task.assignedRole ?? task.responsibleRole ?? resolveResponsibleRole(task);
}

export function isRoleCapableForTaskFamily(
  familyId: ProductionTaskFamilyId,
  role: ProductionRole,
): boolean {
  return FAMILY_CAPABLE_ROLES[familyId].includes(role);
}

export function isUserCapableForTaskFamily(
  user: StudioUser,
  task: CampaignTaskItem,
  toRole: ProductionRole,
  assignments: CampaignAssignmentsFile,
): boolean {
  if (!isRoleCapableForTaskFamily(task.familyId, toRole)) {
    return false;
  }
  return userCanPerformRole(user, toRole, assignments);
}

export function canClaimTask(
  user: StudioUser,
  task: CampaignTaskItem,
  assignments: CampaignAssignmentsFile,
): boolean {
  if (task.claimedByUserId && task.claimedByUserId !== user.id) {
    return false;
  }
  if (userIsProducer(user, assignments)) return true;
  return userCanPerformRole(user, taskRequiredRole(task), assignments);
}

export function canSubmitHandoff(
  user: StudioUser,
  task: CampaignTaskItem,
  assignments: CampaignAssignmentsFile,
): boolean {
  if (userIsProducer(user, assignments)) return true;
  if (task.claimedByUserId !== user.id) return false;
  return userCanPerformRole(user, taskRequiredRole(task), assignments);
}

export function canReleaseClaim(
  user: StudioUser,
  task: CampaignTaskItem,
  assignments: CampaignAssignmentsFile,
): boolean {
  if (userIsProducer(user, assignments)) return true;
  return task.claimedByUserId === user.id;
}

export function canPerformQa(
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): boolean {
  if (isOwnerUser(user)) return true;
  return userCanPerformRole(user, "qa", assignments);
}

export function canReassignTask(user: StudioUser, assignments: CampaignAssignmentsFile): boolean {
  return userIsProducer(user, assignments);
}
