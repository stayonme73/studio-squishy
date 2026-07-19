/**
 * Resolve the active transactional-email adapter.
 * Postmark is documented fallback only — not selected in V1.
 */

import { recordTransactionalDeliveryAttempt } from "@/lib/transactional-email/delivery-log";
import { createResendTransactionalAdapter } from "@/lib/transactional-email/providers/resend";
import type {
  SendTransactionalEmailInput,
  SendTransactionalEmailResult,
  TransactionalEmailAdapter,
} from "@/lib/transactional-email/types";

const noneAdapter: TransactionalEmailAdapter = {
  providerId: "none",
  async send(): Promise<SendTransactionalEmailResult> {
    return { ok: false, provider: "none", code: "not_configured" };
  },
};

export function getTransactionalEmailAdapter(): TransactionalEmailAdapter {
  const provider = (process.env.TRANSACTIONAL_EMAIL_PROVIDER ?? "resend")
    .trim()
    .toLowerCase();

  if (provider === "none") return noneAdapter;
  if (provider === "postmark") {
    // Fallback reserved — not integrated in V1.
    return noneAdapter;
  }
  return createResendTransactionalAdapter();
}

/**
 * Send via adapter and record safe delivery metadata.
 * Callers must map failures to safe customer copy (retry path).
 */
export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<SendTransactionalEmailResult> {
  const adapter = getTransactionalEmailAdapter();
  const result = await adapter.send(input);
  await recordTransactionalDeliveryAttempt(input, result);
  return result;
}
