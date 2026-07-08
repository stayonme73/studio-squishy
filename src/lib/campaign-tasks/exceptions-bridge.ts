import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";

import {
  bridgeExceptionFromMissingClientFact,
  bridgeExceptionFromQaBlock,
  bridgeExceptionFromRevisionExhausted,
  wouldExceedRevisionAllowance,
} from "./exceptions-actions";
import type { QaBlockCategory, QaFailCategory, QaRecord, ServerTasksEnvelope } from "./types";

/** Auto-bridge QA outcomes to exceptions — no double entry for the same problem. */
export function bridgeExceptionsAfterQaBlock(
  envelope: ServerTasksEnvelope,
  qaRecord: QaRecord,
  category: QaBlockCategory,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ServerTasksEnvelope {
  return bridgeExceptionFromQaBlock(envelope, qaRecord, category, user, assignments);
}

export function bridgeExceptionsAfterQaFail(
  envelope: ServerTasksEnvelope,
  qaRecord: QaRecord,
  category: QaFailCategory,
  routedTaskId: string,
  campaign: CampaignRecord,
  user: StudioUser,
  assignments: CampaignAssignmentsFile,
): ServerTasksEnvelope {
  let next = envelope;

  if (category === "missing_client_fact") {
    next = bridgeExceptionFromMissingClientFact(
      next,
      qaRecord,
      routedTaskId,
      user,
      assignments,
    );
  }

  if (
    category === "production_correction" &&
    wouldExceedRevisionAllowance(campaign, next.qaRecords, routedTaskId)
  ) {
    next = bridgeExceptionFromRevisionExhausted(
      next,
      routedTaskId,
      campaign,
      user,
      assignments,
    );
  }

  return next;
}
