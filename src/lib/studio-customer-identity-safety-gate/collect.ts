import type { CampaignRecord } from "@/config/studio-board";
import { MAYA_PROTECTED_CAMPAIGN_ID } from "@/config/studio-production-team-workforce-v1";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import { readCheckoutSessionBinding } from "@/lib/studio-payment/events-store";

import type {
  CustomerIdentityDispatchSession,
  CustomerIdentitySafetyContext,
} from "./types";

function stampedIntakeCampaignId(campaign: CampaignRecord): string | null {
  const intake = campaign.routeMapIntake as
    | { campaignId?: string }
    | undefined;
  if (!intake && !campaign.routeMapIntakeSubmittedAt) return null;
  const stamped =
    typeof intake?.campaignId === "string" ? intake.campaignId.trim() : "";
  return stamped || campaign.campaignId;
}

/**
 * Read-only identity context for the dispatch boarding pass.
 * Server-only Node I/O. Do not import from client barrels or Board UI.
 * Does not write campaigns, payments, intake, or artifacts.
 */
export async function collectCustomerIdentityDispatchContext(
  campaign: CampaignRecord,
  session?: CustomerIdentityDispatchSession,
): Promise<CustomerIdentitySafetyContext> {
  const envelope = await readCampaignEnvelope(campaign.campaignId);
  const checkoutSessionId = campaign.paymentTruth?.checkoutSessionId;
  const paymentBinding = checkoutSessionId
    ? await readCheckoutSessionBinding(checkoutSessionId)
    : null;
  const materials = await readMaterialsEnvelope(campaign.campaignId);
  const tasks = await readTasksEnvelope(campaign.campaignId);

  const jobPacketCampaignIds = [
    ...(session?.jobPacketCampaignIds ?? []),
    ...(campaign.routingHandoff?.decisions.map((decision) => decision.campaignId) ?? []),
    ...(campaign.dispatchExecution?.records.map((record) => record.campaignId) ?? []),
    ...(tasks?.campaignId ? [tasks.campaignId] : []),
    ...(tasks?.jobRecords?.map((job) => job.campaignId) ?? []),
    ...(tasks?.jobRecords?.flatMap(
      (job) => job.workPackets?.map((packet) => packet.campaignId) ?? [],
    ) ?? []),
  ].filter(Boolean);

  const materialsCertificationCampaignIds = (materials?.items ?? [])
    .map((item) => {
      const certification = item.contentCertification as
        | { campaignId?: string }
        | undefined;
      return certification?.campaignId;
    })
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  return {
    activeCampaignId: campaign.campaignId,
    campaign,
    clientUserId: envelope?.clientUserId ?? null,
    sessionCurrentCampaignId: session?.sessionCurrentCampaignId ?? null,
    sessionClientUserId: session?.sessionClientUserId ?? null,
    paymentBindingCampaignId: paymentBinding?.campaignId ?? campaign.campaignId,
    paymentPayerClientUserId: paymentBinding?.payerClientUserId ?? null,
    paymentSelectedServiceIds:
      paymentBinding?.selectedServiceIds ??
      campaign.paymentTruth?.selectedServiceIds ??
      null,
    intakeCampaignId: session?.intakeCampaignId ?? stampedIntakeCampaignId(campaign),
    materialsCampaignId: materials?.campaignId ?? null,
    materialsCertificationCampaignIds,
    jobPacketCampaignIds,
    frozenProtectedCampaignId: MAYA_PROTECTED_CAMPAIGN_ID,
  };
}
