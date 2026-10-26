/**
 * Customer email for a Courtesy Adjustment.
 * Copy matches the customer panel. The package stays open.
 * Money is described as returned only after Stripe reports succeeded.
 */

import type { CampaignRecord } from "@/config/studio-board";
import { studioResendLifecycleAndWatchdogV1 as cfg } from "@/config/studio-resend-lifecycle-and-watchdog-v1";
import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { resolveLifecycleRecipientEmail } from "@/lib/studio-lifecycle-email/campaign";
import type { LifecycleEmailSend } from "@/lib/studio-lifecycle-email/deliver";
import { sendTransactionalEmail } from "@/lib/transactional-email";

import { courtesyCustomerMessage } from "./customer-view";
import type { CourtesyRefundStage, StudioExtrasCourtesy } from "./types";

const EMAILABLE = new Set<CourtesyRefundStage>(["accepted", "completed", "failed", "uncertain"]);

const TERMINAL_NO_CUSTOMER_EMAIL = new Set([
  "sandbox_payment",
  "payment_intent_missing",
  "live_mode_blocked",
  "payment_not_confirmed",
]);

export type CourtesyEmailDeps = {
  send?: LifecycleEmailSend;
  now?: string;
  writeCampaign?: (campaign: CampaignRecord) => Promise<CampaignRecord>;
  resolveRecipient?: (campaign: CampaignRecord) => Promise<{ email: string | null; userId?: string }>;
};

function emailableStage(courtesy: StudioExtrasCourtesy): CourtesyRefundStage | null {
  const stage = courtesy.paymentExecution;
  if (!EMAILABLE.has(stage)) return null;
  if (TERMINAL_NO_CUSTOMER_EMAIL.has(courtesy.failureReason ?? "")) return null;
  if ((courtesy.refundAmountCents ?? courtesy.totalAdjustmentCents) <= 0) return null;
  if (stage === "failed" && !courtesy.stripeRefundId && !courtesy.providerStatus) return null;
  return stage;
}

function subjectFor(stage: CourtesyRefundStage): string {
  switch (stage) {
    case "completed":
      return "Courtesy Adjustment returned";
    case "accepted":
      return "Courtesy Adjustment accepted";
    case "failed":
      return "Courtesy Adjustment could not be completed";
    case "uncertain":
      return "Courtesy Adjustment could not be confirmed";
    default:
      return "Courtesy Adjustment";
  }
}

function withCourtesy(campaign: CampaignRecord, courtesy: StudioExtrasCourtesy, at: string): CampaignRecord {
  if (!campaign.studioExtras) return campaign;
  return {
    ...campaign,
    studioExtras: { ...campaign.studioExtras, courtesy, updatedAt: at },
    updatedAt: at,
  };
}

async function persist(campaign: CampaignRecord, deps: CourtesyEmailDeps): Promise<CampaignRecord> {
  if (deps.writeCampaign) return deps.writeCampaign(campaign);
  return (await upsertCampaignRecord(campaign)).record;
}

export async function deliverStudioExtrasCourtesyEmail(
  campaign: CampaignRecord,
  deps: CourtesyEmailDeps = {},
): Promise<CampaignRecord> {
  let ownerUserId: string | undefined;
  if (!deps.writeCampaign) {
    try {
      const latest = await readCampaignEnvelope(campaign.campaignId);
      if (latest?.record.studioExtras?.courtesy) campaign = latest.record;
      ownerUserId = latest?.clientUserId;
    } catch {
      // Use the campaign the caller already saved.
    }
  }
  const courtesy = campaign.studioExtras?.courtesy;
  const stage = courtesy ? emailableStage(courtesy) : null;
  if (!courtesy || !stage) return campaign;
  if (
    courtesy.customerEmailStage === stage &&
    (courtesy.customerEmailRefundId ?? null) === (courtesy.stripeRefundId ?? null)
  ) {
    return campaign;
  }

  const attempts = courtesy.customerEmailAttempts ?? 0;
  if (attempts >= cfg.retry.maxAttempts) {
    const marked = markEmailExhausted(campaign, courtesy);
    if (marked === campaign) return campaign;
    return persist(marked, deps);
  }

  const now = deps.now ?? new Date().toISOString();
  if (courtesy.customerEmailLastAttemptAt) {
    const last = Date.parse(courtesy.customerEmailLastAttemptAt);
    const current = Date.parse(now);
    if (Number.isFinite(last) && Number.isFinite(current) && current - last < cfg.retry.minIntervalMs) {
      return campaign;
    }
  }

  const send = deps.send ?? (process.env.NODE_ENV === "test" ? undefined : sendTransactionalEmail);
  if (!send) return campaign;

  const recipient = deps.resolveRecipient
    ? await deps.resolveRecipient(campaign)
    : await resolveLifecycleRecipientEmail({
        campaignId: campaign.campaignId,
        clientUserId: ownerUserId,
      });
  if (!recipient.email) return campaign;

  const text = [courtesyCustomerMessage(courtesy).trim(), "", cfg.customerFooter].join("\n");
  let result: Awaited<ReturnType<LifecycleEmailSend>>;
  try {
    result = await send({
      kind: "customer-lifecycle",
      to: recipient.email,
      subject: subjectFor(stage),
      text,
      userId: recipient.userId,
    });
  } catch {
    result = { ok: false, provider: "resend", code: "delivery_failed" };
  }

  if (result.ok) {
    return persist(
      withCourtesy(
        campaign,
        {
          ...courtesy,
          customerEmailStage: stage,
          customerEmailRefundId: courtesy.stripeRefundId ?? null,
          customerEmailAttempts: attempts + 1,
          customerEmailLastAttemptAt: now,
        },
        now,
      ),
      deps,
    );
  }

  const failed = withCourtesy(
    campaign,
    {
      ...courtesy,
      customerEmailAttempts: attempts + 1,
      customerEmailLastAttemptAt: now,
    },
    now,
  );
  const saved = await persist(
    attempts + 1 >= cfg.retry.maxAttempts ? markEmailExhausted(failed, failed.studioExtras!.courtesy!) : failed,
    deps,
  );
  if (process.env.NODE_ENV !== "test" && attempts + 1 < cfg.retry.maxAttempts) {
    const { scheduleLifecycleRetry } = await import("@/lib/studio-lifecycle-email/lifecycle-retry");
    scheduleLifecycleRetry(campaign.campaignId);
  }
  return saved;
}

function markEmailExhausted(campaign: CampaignRecord, courtesy: StudioExtrasCourtesy): CampaignRecord {
  if (courtesy.ownerNotice?.includes("was not emailed")) return campaign;
  const note =
    "The customer was not emailed after the delivery retries were exhausted. The payment status on the project is unchanged.";
  return withCourtesy(
    campaign,
    {
      ...courtesy,
      ownerAttention: "exception",
      ownerNotice: courtesy.ownerNotice ? `${courtesy.ownerNotice} ${note}` : `Tagia, ${note}`,
    },
    courtesy.customerEmailLastAttemptAt ?? courtesy.computedAt,
  );
}

export async function deliverStudioExtrasCourtesyEmailForCampaign(campaignId: string): Promise<void> {
  const envelope = await readCampaignEnvelope(campaignId);
  if (!envelope?.record) return;
  await deliverStudioExtrasCourtesyEmail(envelope.record);
}
