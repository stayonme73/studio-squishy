/**
 * Optional transactional email for project claim recovery (guest pay → later claim).
 * Never logs the raw token.
 */

import { buildProjectClaimUrl, resolvePublicAppOrigin } from "@/lib/auth/public-app-url";
import { sendTransactionalEmail } from "@/lib/transactional-email";
import type { SendTransactionalEmailResult } from "@/lib/transactional-email/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendProjectClaimRecoveryEmail(input: {
  toEmail: string;
  campaignId: string;
  rawClaimToken: string;
}): Promise<SendTransactionalEmailResult> {
  if (!resolvePublicAppOrigin()) {
    return {
      ok: false,
      provider: "none",
      code: "not_configured",
    };
  }
  const claimUrl = buildProjectClaimUrl(
    input.rawClaimToken,
    input.campaignId,
  );
  if (!claimUrl) {
    return {
      ok: false,
      provider: "none",
      code: "not_configured",
    };
  }

  const subject = "Your Studio project claim link";
  const text = [
    "Thanks for your payment.",
    "",
    "To open this exact Studio project later — including from another device — sign in and open this claim link:",
    claimUrl,
    "",
    "This link is for your paid project only. Do not share it.",
    "",
    "— The Studio",
  ].join("\n");
  const html = [
    "<p>Thanks for your payment.</p>",
    "<p>To open this exact Studio project later — including from another device — sign in and open this claim link:</p>",
    `<p><a href="${escapeHtml(claimUrl)}">Claim my Studio project</a></p>`,
    "<p>This link is for your paid project only. Do not share it.</p>",
    "<p>— The Studio</p>",
  ].join("");

  return sendTransactionalEmail({
    kind: "project-claim-recovery",
    to: input.toEmail,
    subject,
    text,
    html,
  });
}
