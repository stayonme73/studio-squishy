/**
 * Deliver authorized job-control notices through the existing Resend adapter.
 * Copy comes only from JOB_COMMUNICATION_TEMPLATES already stored on the record.
 */

import { studioResendLifecycleAndWatchdogV1 as cfg } from "@/config/studio-resend-lifecycle-and-watchdog-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import {
  applyJobCommunicationTransportResult,
  AUTHORIZED_LIFECYCLE_EMAIL_EVENT_TYPES,
} from "@/lib/job-control/communication";
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
  return (AUTHORIZED_LIFECYCLE_EMAIL_EVENT_TYPES as readonly string[]).includes(
    record.eventType,
  );
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

const CERTIFICATION_CAMPAIGN_PREFIX = "studio-email-cert-";
const CERTIFICATION_BANNER =
  "This is a Studio delivery test. It is not a customer project, and it has no project link.";

export function composeCustomerEmail(record: JobCommunicationRecord): {
  subject: string;
  text: string;
  html: string;
} {
  const certification = record.campaignId.startsWith(CERTIFICATION_CAMPAIGN_PREFIX);
  const links = lifecycleCustomerSurfaceAbsoluteLinks(record.eventType);
  const linkText = links.length
    ? ["", ...links.map((link) => `${link.label}: ${link.url}`)].join("\n")
    : "";
  const subject = certification ? `Studio test — ${record.reason}` : record.reason;
  const text = [
    certification ? CERTIFICATION_BANNER : null,
    record.messageContent.trim(),
    linkText,
    "",
    cfg.customerFooter,
    "",
    "— The Studio",
  ]
    .filter((part) => part != null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
  const html = [
    certification ? `<p>${escapeHtml(CERTIFICATION_BANNER)}</p>` : "",
    `<p>${escapeHtml(record.messageContent.trim())}</p>`,
    ...links.map(
      (link) =>
        `<p><a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a></p>`,
    ),
    `<p>${escapeHtml(cfg.customerFooter)}</p>`,
    "<p>— The Studio</p>",
  ].join("");
  return { subject, text, html };
}

export async function deliverAuthorizedLifecycleNotices(input: {
  envelope: ServerTasksEnvelope;
  toEmail: string | null;
  userId?: string;
  nowMs?: number;
  send?: LifecycleEmailSend;
  /** When set, a false result is left untouched and is not sent. */
  noticeMaySend?: (record: JobCommunicationRecord) => boolean;
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
    if (input.noticeMaySend && !input.noticeMaySend(record)) {
      continue;
    }
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
