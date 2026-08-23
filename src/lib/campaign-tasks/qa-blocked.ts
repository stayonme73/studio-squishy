import type { CampaignTaskItem } from "./types";

export function isQaBlockedReason(task: CampaignTaskItem): boolean {
  const reason = task.workflowBlockedReason ?? "";
  return reason.includes("compliance_hold") || reason.includes("owner_escalation");
}
