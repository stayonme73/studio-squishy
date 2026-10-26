/**
 * Review Request Kit card: one printable 4x6 card with a QR code that opens
 * the customer's own review link. PNG + PDF via the Studio capture path.
 */

import { existsSync, mkdirSync, statSync, writeFileSync } from "fs";
import path from "path";
import QRCode from "qrcode";

import { captureFlyerExports } from "@/lib/studio-design-renderer/capture";

import type { StudioExtraArtifact } from "./types";

const WIDTH = 1200;
const HEIGHT = 1800;

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The QR payload is exactly the customer's link — nothing appended. */
export function reviewCardQrPayloadMatches(link: string): boolean {
  const qr = QRCode.create(link, { errorCorrectionLevel: "M" });
  const encoded = qr.segments
    .map((segment) => {
      const data = (segment as unknown as { data: unknown }).data;
      if (typeof data === "string") return data;
      if (data instanceof Uint8Array) return Buffer.from(data).toString("utf8");
      return String(data ?? "");
    })
    .join("");
  return encoded === link;
}

export function reviewCardHtml(input: {
  businessName: string;
  headline: string;
  line: string;
  qrDataUrl: string;
  variant: "designed" | "simple";
}): string {
  const designed = input.variant === "designed";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden}
.canvas{width:${WIDTH}px;height:${HEIGHT}px;position:relative;background:${designed ? "#F7F4EF" : "#FFFFFF"};font-family:Georgia,'Times New Roman',serif;color:#1A1A1A;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:120px 110px}
.frame{position:absolute;inset:44px;border:${designed ? "6px solid #C4A574" : "0"};border-radius:28px;pointer-events:none}
.name{font-family:'Helvetica Neue',Arial,sans-serif;font-size:46px;letter-spacing:6px;text-transform:uppercase;color:#1F3A5F;text-align:center;max-width:960px;line-height:1.2}
.headline{font-size:${designed ? 92 : 80}px;line-height:1.1;text-align:center;max-width:980px;color:#1F3A5F}
.line{font-family:'Helvetica Neue',Arial,sans-serif;font-size:42px;line-height:1.35;text-align:center;max-width:940px;color:#3A4550}
.qr{width:620px;height:620px;background:#fff;padding:26px;border-radius:24px;${designed ? "box-shadow:0 8px 30px rgba(31,58,95,.18)" : "border:4px solid #1A1A1A"}}
.qr img{width:100%;height:100%;display:block;image-rendering:pixelated}
.scan{font-family:'Helvetica Neue',Arial,sans-serif;font-size:40px;letter-spacing:3px;text-transform:uppercase;color:#1F3A5F}
</style></head><body><div class="canvas"><div class="frame"></div>
<div class="name">${esc(input.businessName)}</div>
${designed ? `<div class="headline">${esc(input.headline)}</div><div class="line">${esc(input.line)}</div>` : `<div class="headline">${esc(input.headline)}</div>`}
<div class="qr"><img src="${input.qrDataUrl}" alt="QR code"/></div>
<div class="scan">Scan to leave a review</div>
</div></body></html>`;
}

export type ReviewCardResult =
  | { ok: true; artifacts: StudioExtraArtifact[] }
  | { ok: false; reasons: string[] };

export async function renderReviewCard(input: {
  repoRoot: string;
  artifactRootRel: string;
  businessName: string;
  headline: string;
  line: string;
  reviewLink: string;
  variant: "designed" | "simple";
  attempt: number;
}): Promise<ReviewCardResult> {
  const reasons: string[] = [];
  if (!/^https?:\/\/\S+\.\S+/i.test(input.reviewLink)) reasons.push("review link is not a web link");
  if (!reviewCardQrPayloadMatches(input.reviewLink)) reasons.push("QR payload does not match the review link");
  if (!input.businessName.trim() || input.businessName.length > 60) reasons.push("business name must be 1–60 characters");
  if (input.headline.length > 40 || input.line.length > 110) reasons.push("card text is too long to fit");
  if (reasons.length) return { ok: false, reasons };

  const qrDataUrl = await QRCode.toDataURL(input.reviewLink, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 1200,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  const dirRel = `${input.artifactRootRel}/review-card/v${input.attempt}`;
  const dirAbs = path.join(input.repoRoot, dirRel);
  mkdirSync(dirAbs, { recursive: true });
  const htmlAbs = path.join(dirAbs, "review-card.html");
  writeFileSync(htmlAbs, reviewCardHtml({ ...input, qrDataUrl }), "utf8");
  const pngRel = `${dirRel}/review-request-card.png`;
  const pdfRel = `${dirRel}/review-request-card.pdf`;
  const capture = await captureFlyerExports({
    htmlAbsolutePath: htmlAbs,
    pngAbsolutePath: path.join(input.repoRoot, pngRel),
    pdfAbsolutePath: path.join(input.repoRoot, pdfRel),
    widthPx: WIDTH,
    heightPx: HEIGHT,
    pdfPage: { width: "4in", height: "6in" },
  });
  if (!capture.overflowOk) return { ok: false, reasons: [`layout overflow: ${capture.overflowDetail}`] };
  for (const rel of [pngRel, pdfRel]) {
    const abs = path.join(input.repoRoot, rel);
    if (!existsSync(abs) || statSync(abs).size < 5_000) return { ok: false, reasons: [`export missing or empty: ${rel}`] };
  }
  return {
    ok: true,
    artifacts: [
      { path: pngRel, label: "Review-request card (PNG)", mimeType: "image/png" },
      { path: pdfRel, label: "Review-request card, 4x6 print (PDF)", mimeType: "application/pdf" },
    ],
  };
}
