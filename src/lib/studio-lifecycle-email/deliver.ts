/**
 * Deliver authorized job-control notices through the existing Resend adapter.
 * Copy comes only from JOB_COMMUNICATION_TEMPLATES already stored on the record.
 */

import { studioResendLifecycleAndWatchdogV1 as cfg } from "@/config/studio-resend-lifecycle-and-watchdog-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { applyJobCommunicationTransportResult } from "@/lib/job-control/communication";
import { isJobControlTemplateCommunicationEventType } from "@/lib/studio-kitchen-comms/outbox-disposition";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import type {
  SendTransactionalEmailResult,
  TransactionalEmailKind,
} from "@/lib/transactional-email/types";
import type { JobCommunicationRecord } from "@/lib/job-control/types";

import { lifecycleCustomerSurfaceAbsoluteLinks } from "./surfaces";

export type LifecycleEmailSend = (input: {
  kind: TransactionalEmailKind;
  to: string;
  subject: string;
  text: string;
  html?: string;
  userId?: string;
}) => Promise<SendTransactionalEmailResult>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isAuthorizedLifecycleNotice(
  record: JobCommunicationRecord,
): boolean {
  if (record.channel !== "in_app_outbox") return false;
  if (record.deliveryStatus === "cancelled" || record.deliveryStatus === "test_sent") {
    return false;
  }
  return isJobControlTemplateCommunicationEventType(record.eventType);
}

export function isLifecycleTransportDue(
  record: JobCommunicationRecord,
  nowMs: number,
): boolean {
  if (!isAuthorizedLifecycleNotice(record)) return false;
  if (record.deliveryStatus === "sent") return false;
  if (
    record.deliveryStatus !== "pending_owner_send" &&
    record.deliveryStatus !== "delivery_failed"
  ) {
    return false;
  }
  const attempts = record.transportAttempts ?? 0;
  if (attempts >= cfg.retry.maxAttempts) return false;
  if (!record.lastTransportAt) return true;
  const last = new Date(record.lastTransportAt).getTime();
  if (!Number.isFinite(last)) return true;
  return nowMs - last >= cfg.retry.minIntervalMs;
}

export function composeCustomerEmail(record: JobCommunicationRecord): {
  subject: string;
  text: string;
  html: string;
} {
  const links = lifecycleCustomerSurfaceAbsoluteLinks(record.eventType);
  const linkText = links.length
    ? ["", ...links.map((link) => `${link.label}: ${link.url}`)].join("\n")
    : "";
  const text = [
    record.messageContent.trim(),
    linkText,
    "",
    cfg.customerFooter,
    "",
    "— The Studio",
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  const html = [
    `<p>${escapeHtml(record.messageContent.trim())}</p>`,
    ...links.map(
      (link) =>
        `<p><a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a></p>`,
    ),
    `<p>${escapeHtml(cfg.customerFooter)}</p>`,
    "<p>— The Studio</p>",
  ].join("");
  return { subject: record.reason, text, html };
}

export async function deliverAuthorizedLifecycleNotices(input: {
  envelope: ServerTasksEnvelope;
  toEmail: string | null;
  userId?: string;
  nowMs?: number;
  send?: LifecycleEmailSend;
}): Promise<{
  envelope: ServerTasksEnvelope;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  ownerActionRequired: false;
}> {
  const nowMs = input.nowMs ?? Date.now();
  const send = input.send ?? sendTransactionalEmail;
  let envelope = input.envelope;
  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const record of envelope.jobCommunicationRecords ?? []) {
    if (!isLifecycleTransportDue(record, nowMs)) {
      if (isAuthorizedLifecycleNotice(record) && record.deliveryStatus !== "sent") {
        skipped += 1;
      }
      continue;
    }
    attempted += 1;
    if (!input.toEmail) {
      envelope = applyJobCommunicationTransportResult(envelope, record.id, {
        ok: false,
        code: "missing_recipient",
        occurredAt: new Date(nowMs).toISOString(),
      });
      failed += 1;
      continue;
    }
    const body = composeCustomerEmail(record);
    const result = await send({
      kind: cfg.emailKind,
      to: input.toEmail,
      subject: body.subject,
      text: body.text,
      html: body.html,
      userId: input.userId,
    });
    envelope = applyJobCommunicationTransportResult(envelope, record.id, {
      ok: result.ok,
      code: result.ok ? "ok" : result.code,
      providerMessageId: result.ok ? result.providerMessageId : undefined,
      occurredAt: new Date(nowMs).toISOString(),
    });
    if (result.ok) sent += 1;
    else failed += 1;
  }

  return {
    envelope,
    attempted,
    sent,
    failed,
    skipped,
    ownerActionRequired: false,
  };
}
