import type { CustomerInteractionKind } from "@/decision-core";

import type { CampaignExceptionStatus } from "./exceptions-types";

/** Owner decision desk — client interaction folders (complaint, etc.). */
export type OwnerDecisionInteractionRecord = {
  id: string;
  campaignId: string;
  jobId?: string;
  interactionKind: CustomerInteractionKind;
  status: Extract<
    CampaignExceptionStatus,
    "waiting_owner" | "waiting_internal" | "waiting_client" | "resolved"
  >;
  clientMessage: string;
  createdAt: string;
  updatedAt: string;
  resolutionNotes?: string;
};
