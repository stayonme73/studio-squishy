/**
 * Safe delivery metadata — never passwords or raw tokens.
 */

import { promises as fs } from "fs";
import path from "path";

import type {
  SendTransactionalEmailInput,
  SendTransactionalEmailResult,
} from "@/lib/transactional-email/types";

const LOG_PATH = path.join(process.cwd(), "data", "transactional-email-delivery.jsonl");

export type TransactionalDeliveryLogEntry = {
  at: string;
  kind: SendTransactionalEmailInput["kind"];
  provider: SendTransactionalEmailResult["provider"];
  success: boolean;
  code?: string;
  userId?: string;
  /** Recipient domain only — not full email — to limit PII in logs. */
  toDomain?: string;
  providerMessageId?: string;
};

function recipientDomain(to: string): string | undefined {
  const at = to.lastIndexOf("@");
  if (at < 0) return undefined;
  return to.slice(at + 1).toLowerCase();
}

export async function recordTransactionalDeliveryAttempt(
  input: SendTransactionalEmailInput,
  result: SendTransactionalEmailResult,
): Promise<void> {
  const entry: TransactionalDeliveryLogEntry = {
    at: new Date().toISOString(),
    kind: input.kind,
    provider: result.provider,
    success: result.ok,
    code: result.ok ? undefined : result.code,
    userId: input.userId,
    toDomain: recipientDomain(input.to),
    providerMessageId: result.ok ? result.providerMessageId : undefined,
  };

  try {
    await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
    await fs.appendFile(LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // Delivery logging must not break auth flows.
  }
}
