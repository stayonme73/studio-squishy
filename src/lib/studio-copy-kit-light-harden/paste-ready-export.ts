/**
 * Paste-ready customer files for email-kit and SMS-kit.
 * JSON stays the Machine artifact. These files are what the menu promises.
 */

import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import {
  EMAIL_KIT_SKU,
  SMS_KIT_SKU,
} from "@/config/studio-copy-kit-light-harden-v1";
import type { CopyQualitySubmission } from "@/lib/studio-kitchen-production/copy-quality";

export type PasteReadyCopyFile = {
  relativePath: string;
  label: string;
  format: "txt" | "html";
  sha256: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderEmailPasteReadyText(
  email: NonNullable<CopyQualitySubmission["emails"]>[number],
  index: number,
): string {
  const subject = email.subjectOptions[0]?.trim() ?? "";
  return [
    `Email ${index}`,
    "",
    `Subject: ${subject}`,
    `Preview: ${email.previewText.trim()}`,
    "",
    email.body.trim(),
    "",
    `Call to action: ${email.cta.trim()}`,
    "",
  ].join("\n");
}

export function renderEmailPasteReadyHtml(
  email: NonNullable<CopyQualitySubmission["emails"]>[number],
  index: number,
): string {
  const subject = escapeHtml(email.subjectOptions[0]?.trim() ?? "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Email ${index}</title>
</head>
<body>
<p><strong>Subject:</strong> ${subject}</p>
<p><strong>Preview:</strong> ${escapeHtml(email.previewText.trim())}</p>
<p>${escapeHtml(email.body.trim()).replace(/\n/g, "<br>\n")}</p>
<p><strong>Call to action:</strong> ${escapeHtml(email.cta.trim())}</p>
</body>
</html>
`;
}

export function renderSmsPasteReadyText(
  messages: NonNullable<CopyQualitySubmission["smsMessages"]>,
): string {
  const lines = ["Text message campaign", "", "Suggested sending order:", ""];
  messages.forEach((message, index) => {
    lines.push(`Message ${index + 1}`);
    lines.push(message.body.trim());
    lines.push("");
  });
  return lines.join("\n");
}

export function writePasteReadyCopyFiles(input: {
  repoRoot: string;
  artifactRootRel: string;
  skuId: string;
  submission: CopyQualitySubmission;
}): readonly PasteReadyCopyFile[] {
  const rootAbs = path.join(input.repoRoot, input.artifactRootRel);
  mkdirSync(rootAbs, { recursive: true });
  const written: PasteReadyCopyFile[] = [];

  const write = (filename: string, label: string, format: "txt" | "html", body: string) => {
    const relativePath = `${input.artifactRootRel.replace(/\\/g, "/")}/${filename}`;
    writeFileSync(path.join(input.repoRoot, relativePath), body, "utf8");
    written.push({
      relativePath,
      label,
      format,
      sha256: createHash("sha256").update(body).digest("hex"),
    });
  };

  if (input.skuId === EMAIL_KIT_SKU) {
    (input.submission.emails ?? []).slice(0, 2).forEach((email, index) => {
      const n = index + 1;
      write(
        `email-${n}.txt`,
        `Email ${n} — paste-ready text`,
        "txt",
        renderEmailPasteReadyText(email, n),
      );
      write(
        `email-${n}.html`,
        `Email ${n} — simple HTML-ready file`,
        "html",
        renderEmailPasteReadyHtml(email, n),
      );
    });
  }

  if (input.skuId === SMS_KIT_SKU) {
    write(
      "sms-kit.txt",
      "Plain-text message file with suggested sending order",
      "txt",
      renderSmsPasteReadyText(input.submission.smsMessages ?? []),
    );
  }

  return written;
}
