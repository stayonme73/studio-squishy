import {
  COPY_REVIEW_CUSTOMER_LABELS,
  COPY_REVIEW_CUSTOMER_LEAK_PATTERNS,
  studioCopyReviewBindV1,
} from "@/config/studio-copy-review-bind-v1";
import type { CopyReviewProofMember } from "./types";

export function customerFacingCopyReviewTextLeaks(text: string): string | null {
  const hay = String(text ?? "");
  for (const pattern of COPY_REVIEW_CUSTOMER_LEAK_PATTERNS) {
    if (pattern.test(hay)) return pattern.source;
  }
  return null;
}

export function copyReviewDeliverableKey(memberId: string): string {
  return `${studioCopyReviewBindV1.proofKeyPrefix}:${memberId}`;
}

export function isCopyReviewDeliverableKey(key: string | undefined): boolean {
  return Boolean(key?.startsWith(`${studioCopyReviewBindV1.proofKeyPrefix}:`));
}

export function copyReviewProofFilename(input: {
  formatLabel: string;
  renderVersion: number;
}): string {
  const slug = input.formatLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}-version-${input.renderVersion}.html`;
}

export function emailMemberLabel(index: number): string {
  return COPY_REVIEW_CUSTOMER_LABELS.email(index);
}

export function smsMemberLabel(index: number): string {
  return COPY_REVIEW_CUSTOMER_LABELS.sms(index);
}

export function isCopyReviewProofFile(fileType: string, filename = ""): boolean {
  const hay = `${fileType} ${filename}`.toLowerCase();
  return (
    hay.startsWith("text/") ||
    hay.includes("text/html") ||
    hay.includes("text/plain") ||
    /\.html?$/i.test(filename)
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function field(label: string, value: string, asHeading = false): string {
  if (!value.trim()) return "";
  const inner = asHeading
    ? `<h1>${escapeHtml(value)}</h1>`
    : `<p>${escapeHtml(value)}</p>`;
  return `<div class="field"><p class="label">${escapeHtml(label)}</p>${inner}</div>`;
}

/** Customer-readable proof HTML. No hashes, prompts, or producer internals. */
export function renderCustomerCopyProofHtml(member: CopyReviewProofMember): string {
  const title = escapeHtml(member.customerFormatLabel);
  const fields =
    member.memberKind === "email"
      ? [
          field(COPY_REVIEW_CUSTOMER_LABELS.subject, member.subject ?? "", true),
          field(COPY_REVIEW_CUSTOMER_LABELS.preview, member.previewText ?? ""),
          field(COPY_REVIEW_CUSTOMER_LABELS.body, member.body),
          field(COPY_REVIEW_CUSTOMER_LABELS.cta, member.cta ?? ""),
        ].join("")
      : field(COPY_REVIEW_CUSTOMER_LABELS.message, member.body);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body { margin: 0; padding: 1.15rem 1.35rem; font-family: Georgia, "Times New Roman", serif; background: #faf7f2; color: #1f1b16; }
  .kicker { font-family: system-ui, sans-serif; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 0.65rem; }
  h1 { font-size: 1.28rem; line-height: 1.25; margin: 0; }
  .field { margin: 0 0 0.9rem; }
  .label { font-family: system-ui, sans-serif; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 0.28rem; opacity: 0.72; }
  p { margin: 0; white-space: pre-wrap; line-height: 1.45; font-size: 0.98rem; }
</style>
</head>
<body>
<article>
<p class="kicker">${title}</p>
${fields}
</article>
</body>
</html>
`;
}
