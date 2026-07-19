/**
 * Resend transactional provider — isolated behind the adapter.
 * Do not import this from Sign-in / claim UI.
 */

import type {
  SendTransactionalEmailInput,
  SendTransactionalEmailResult,
  TransactionalEmailAdapter,
} from "@/lib/transactional-email/types";

type ResendSendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

export function createResendTransactionalAdapter(options?: {
  apiKey?: string;
  from?: string;
}): TransactionalEmailAdapter {
  const apiKey = options?.apiKey ?? process.env.RESEND_API_KEY?.trim() ?? "";
  const from =
    options?.from ??
    process.env.TRANSACTIONAL_EMAIL_FROM?.trim() ??
    "";

  return {
    providerId: "resend",
    async send(input: SendTransactionalEmailInput): Promise<SendTransactionalEmailResult> {
      if (!apiKey || !from) {
        return { ok: false, provider: "resend", code: "not_configured" };
      }

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [input.to],
            subject: input.subject,
            text: input.text,
            html: input.html,
            reply_to: process.env.TRANSACTIONAL_EMAIL_REPLY_TO?.trim() || undefined,
          }),
        });

        const body = (await response.json().catch(() => ({}))) as ResendSendResponse;
        if (!response.ok) {
          return { ok: false, provider: "resend", code: "provider_error" };
        }
        return {
          ok: true,
          provider: "resend",
          providerMessageId: typeof body.id === "string" ? body.id : undefined,
        };
      } catch {
        return { ok: false, provider: "resend", code: "delivery_failed" };
      }
    },
  };
}
