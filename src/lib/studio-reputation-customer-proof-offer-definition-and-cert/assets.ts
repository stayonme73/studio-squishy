import QRCode from "qrcode";

import { studioReputationCustomerProofOfferDefinitionAndCertV1 as pack } from "@/config/studio-reputation-customer-proof-offer-definition-and-cert-v1";
import type { ReputationProofCopy } from "./copy";
import type { ReputationProofIntake } from "./rights";

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function plateHtml(input: {
  widthPx: number;
  heightPx: number;
  title: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(input.title)}</title>
  <style>
    html, body { margin: 0; padding: 0; }
    .plate {
      width: ${input.widthPx}px;
      height: ${input.heightPx}px;
      box-sizing: border-box;
      padding: 72px;
      background: #f4efe4;
      color: #2a2118;
      font-family: Georgia, "Times New Roman", serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 28px;
    }
    h1 { font-size: 42px; margin: 0; font-weight: 600; }
    p { font-size: 28px; line-height: 1.35; margin: 0; }
    .meta { font-size: 20px; }
  </style>
</head>
<body>
${input.body}
</body>
</html>
`;
}

export async function renderReviewCardHtml(
  intake: ReputationProofIntake,
): Promise<{ html: string; qrDataUrl: string; destination: string }> {
  const destination = intake.reviewDestinationUrl.trim();
  const qrDataUrl = await QRCode.toDataURL(destination, {
    width: 420,
    margin: 1,
    errorCorrectionLevel: "M",
  });
  const html = plateHtml({
    widthPx: pack.graphics.reviewCard.widthPx,
    heightPx: pack.graphics.reviewCard.heightPx,
    title: `${intake.businessName} review card`,
    body: `  <div class="plate" data-destination="${esc(destination)}">
    <h1>${esc(intake.businessName)}</h1>
    <p>Scan to ${esc(intake.cta.toLowerCase())}.</p>
    <img src="${qrDataUrl}" width="420" height="420" alt="QR code for the customer-supplied review link" />
    <p class="meta">${esc(destination)}</p>
    <p class="meta">The Studio does not post this for you.</p>
  </div>
`,
  });
  return { html, qrDataUrl, destination };
}

export function renderQuoteGraphicHtml(
  intake: ReputationProofIntake,
  copy: ReputationProofCopy,
  size: { widthPx: number; heightPx: number },
): string {
  return plateHtml({
    widthPx: size.widthPx,
    heightPx: size.heightPx,
    title: `${intake.businessName} customer quote`,
    body: `  <div class="plate" data-quote="${esc(copy.usedQuote)}">
    <p>“${esc(copy.usedQuote)}”</p>
    <p class="meta">— ${esc(intake.testimonial.reviewerDisplayName)}</p>
    <h1>${esc(intake.businessName)}</h1>
    <p class="meta">${esc(intake.cta)}</p>
  </div>
`,
  });
}
