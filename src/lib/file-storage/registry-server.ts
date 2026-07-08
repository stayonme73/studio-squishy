import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { listTasksEnvelopes } from "@/lib/campaign-tasks/store";
import { isOwnerUser, isStaffUser } from "@/lib/campaign-store/access";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { isStaffAssignedToCampaign } from "@/lib/file-room/assignments-shared";
import type { StudioFileReference } from "@/lib/file-registry/types";
import type { JobClientDeliveryFile, PurchasedJobRecord } from "@/lib/job-control/types";

export type FileRoomRegistryMatch = {
  campaignEnvelope: ServerCampaignEnvelope | null;
  tasksEnvelope: ServerTasksEnvelope;
  job: PurchasedJobRecord;
  file: StudioFileReference;
  clientDeliveryFile?: JobClientDeliveryFile;
};

export async function findFileRoomRegistryMatch(
  fileId: string,
): Promise<FileRoomRegistryMatch | null> {
  const envelopes = await listTasksEnvelopes();
  for (const tasksEnvelope of envelopes) {
    for (const job of tasksEnvelope.jobRecords ?? []) {
      const file = (job.fileRegistry ?? []).find((entry) => entry.id === fileId);
      if (!file) continue;
      const clientDeliveryFile = (job.clientDeliveryFiles ?? []).find(
        (entry) => entry.registryFileId === file.id,
      );
      return {
        campaignEnvelope: await readCampaignEnvelope(file.campaignId),
        tasksEnvelope,
        job,
        file,
        clientDeliveryFile,
      };
    }
  }

  return null;
}

export function internalCampaignAccessAllowed(
  user: StudioUser | null,
  campaignId: string,
  assignments: CampaignAssignmentsFile,
): boolean {
  if (!user) return false;
  if (isOwnerUser(user)) return true;
  if (!isStaffUser(user)) return false;
  return isStaffAssignedToCampaign(assignments, user.id, campaignId);
}
