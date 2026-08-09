/**
 * Render approved Studio structure → self-contained HTML (no per-customer eng).
 */

import { readFileSync } from "fs";
import path from "path";
import QRCode from "qrcode";

import { lightEditLandingBodyCopy } from "./copy-edit";
import { STUDIO_CAMPAIGN_PAGE_STRUCTURE } from "./structure";
import type { LandingPageDefinition, LandingPageWorkPacket } from "./types";
import { LANDING_PAGE_MECHANISM_VERSION } from "./types";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function mimeFor(rel: string): string {
  if (rel.endsWith(".png")) return "image/png";
  if (rel.endsWith(".jpg") || rel.endsWith(".jpeg")) return "image/jpeg";
  if (rel.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function dataUri(repoRoot: string, rel: string): string {
  const abs = path.join(repoRoot, rel);
  const buf = readFileSync(abs);
  return `data:${mimeFor(rel)};base64,${buf.toString("base64")}`;
}

/** Preserve wording; at narrow breakpoints CSS stacks parts into centered lines. */
function formatSubheadlineHtml(subheadline: string): string {
  const sep = " · ";
  const idx = subheadline.indexOf(sep);
  if (idx < 0) return esc(subheadline);
  const left = subheadline.slice(0, idx);
  const right = subheadline.slice(idx + sep.length);
  return `<span class="sub-a">${esc(left)}</span><span class="sub-sep">${esc(sep)}</span><span class="sub-b">${esc(right)}</span>`;
}

export function buildLandingPageDefinition(
  packet: LandingPageWorkPacket,
): LandingPageDefinition {
  return {
    definitionVersion: `def-${packet.workPacketVersion}`,
    structureId: packet.structureId,
    mechanismVersion: LANDING_PAGE_MECHANISM_VERSION,
    workPacketVersion: packet.workPacketVersion,
    campaignId: packet.campaignId,
    skuId: packet.skuId,
    sections: packet.sectionOrder,
    headline: packet.headline,
    subheadline: packet.subheadline,
    ctaText: packet.ctaText,
    ctaHref: packet.ctaHref,
    needsQr: packet.needsQr,
  };
}

export async function renderLandingPageHtml(
  repoRoot: string,
  packet: LandingPageWorkPacket,
): Promise<{ html: string; definition: LandingPageDefinition }> {
  const definition = buildLandingPageDefinition(packet);
  const logo = packet.assets.find((a) => a.role === "logo")!;
  const hero = packet.assets.find((a) => a.role === "hero")!;
  const logoUri = dataUri(repoRoot, logo.relativePath);
  const heroUri = dataUri(repoRoot, hero.relativePath);

  const qrHref = (packet.qrHref ?? packet.ctaHref).trim();
  let qrBlock = "";
  if (packet.needsQr) {
    const qrDataUrl = await QRCode.toDataURL(qrHref, {
      margin: 1,
      width: 160,
      errorCorrectionLevel: "M",
    });
    const qrLabel =
      qrHref !== packet.ctaHref.trim()
        ? "Scan to open booking link"
        : `Scan to ${packet.ctaText}`;
    qrBlock = `
      <div class="qr" aria-label="QR code for booking destination" data-qr-href="${esc(qrHref)}">
        <img src="${qrDataUrl}" width="160" height="160" alt="${esc(qrLabel)}" />
        <p>${esc(qrLabel)}</p>
      </div>`;
  }

  const details = packet.detailBullets
    .map((b) => `<li>${esc(b)}</li>`)
    .join("\n");

  // Catalog light-edit of customer-supplied wording — strip awkward generated phrasing.
  const bodyForPage = lightEditLandingBodyCopy(packet.bodyCopy).text;

  // Smarter content choice: omit standalone deadline banner when hero already carries the deadline.
  const deadlineAlreadyInHero = /book by|before\s+/i.test(packet.subheadline);
  const deadline =
    packet.limitedTime && packet.deadlineText && !deadlineAlreadyInHero
      ? `<p class="deadline">Limited time — ${esc(packet.deadlineText)}</p>`
      : "";

  const contactBits = [
    packet.phoneDisplay ? `<span>${esc(packet.phoneDisplay)}</span>` : "",
    packet.emailDisplay ? `<span>${esc(packet.emailDisplay)}</span>` : "",
    packet.addressDisplay ? `<span>${esc(packet.addressDisplay)}</span>` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const rules = STUDIO_CAMPAIGN_PAGE_STRUCTURE.designRules;
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(packet.businessName)} — ${esc(packet.headline)}</title>
  <meta name="description" content="${esc(packet.offerSummary)}" />
  <meta name="generator" content="${LANDING_PAGE_MECHANISM_VERSION}" />
  <style>
    :root {
      --bg: ${packet.brand.background};
      --text: ${packet.brand.text};
      --muted: ${packet.brand.muted};
      --primary: ${packet.brand.primary};
      --accent: ${packet.brand.accent};
      --max: ${STUDIO_CAMPAIGN_PAGE_STRUCTURE.responsive.maxContentWidthPx}px;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text);
      font-family: Georgia, "Times New Roman", serif; overflow-x: hidden; }
    img { max-width: 100%; height: auto; display: block; }
    .wrap { width: min(100%, var(--max)); margin: 0 auto; padding: 0 ${rules.spacing.contentPadXPx}px; }
    header.hero { padding: ${rules.spacing.sectionYPx}px 0 24px; text-align: center; }
    .logo { width: 96px; height: 96px; object-fit: contain; margin: 0 auto 20px; }
    .hero-img { width: 100%; max-height: 420px; object-fit: cover; border-radius: 20px; margin: 24px 0; }
    h1 { font-size: clamp(28px, 5vw, ${rules.typography.heroHeadlinePx}px); line-height: 1.15; margin: 0 0 12px; color: var(--primary); }
    .sub {
      font-family: system-ui, sans-serif; font-size: ${rules.typography.subheadlinePx}px;
      color: var(--muted); margin: 0 auto 8px; max-width: 100%;
      line-height: 1.35; overflow-wrap: anywhere; text-wrap: balance;
    }
    .sub-sep { white-space: pre; }
    .biz { font-family: system-ui, sans-serif; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); }
    section { padding: ${rules.spacing.sectionYPx}px 0; }
    .offer h2, .details h2, .cta-block h2 { font-size: 28px; color: var(--primary); margin: 0 0 16px; }
    .body { font-size: ${rules.typography.bodyPx}px; line-height: 1.55; color: var(--text); }
    .deadline { font-family: system-ui, sans-serif; font-weight: 700; color: var(--accent); }
    ul { padding-left: 1.2em; font-size: ${rules.typography.bodyPx}px; line-height: 1.5; }
    .cta-block { text-align: center; background: #fff; border-radius: 24px; padding: 32px 20px; }
    a.cta {
      display: inline-flex; align-items: center; justify-content: center;
      min-height: ${rules.button.minHeightPx}px; padding: 0 28px;
      border-radius: ${rules.button.borderRadiusPx}px; background: var(--primary); color: #fff;
      font-family: system-ui, sans-serif; font-size: ${rules.typography.ctaPx}px;
      font-weight: ${rules.button.fontWeight}; text-decoration: none;
    }
    a.cta:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
    .qr { margin-top: 24px; }
    .qr p { font-family: system-ui, sans-serif; font-size: 14px; color: var(--muted); }
    .qr img { margin: 0 auto 8px; }
    footer { padding: 32px 0 48px; text-align: center; font-family: system-ui, sans-serif; font-size: 13px; color: var(--muted); }
    footer .contact { margin-bottom: 8px; color: var(--text); }
    @media (max-width: 768px) {
      h1 { font-size: 32px; }
      .hero-img { max-height: 280px; }
      a.cta { width: 100%; }
    }
    @media (max-width: 480px) {
      /* Narrow screens: deadline / session line becomes two centered rows — wording unchanged. */
      .sub {
        display: flex; flex-direction: column; align-items: center; gap: 4px;
        font-size: 18px; padding: 0 4px;
      }
      .sub-sep { display: none; }
    }
    @media (max-width: 420px) {
      h1 { font-size: 28px; }
    }
  </style>
</head>
<body>
  <main>
    <header class="hero wrap" data-section="hero">
      <img class="logo" src="${logoUri}" alt="${esc(packet.businessName)} logo" />
      <p class="biz">${esc(packet.businessName)}</p>
      <h1>${esc(packet.headline)}</h1>
      <p class="sub">${formatSubheadlineHtml(packet.subheadline)}</p>
      <img class="hero-img" src="${heroUri}" alt="${esc(packet.businessName)} portrait session" />
    </header>
    <section class="offer wrap" data-section="offer">
      <h2>The offer</h2>
      <p class="body">${esc(packet.offerSummary)}</p>
      ${deadline}
      <p class="body">${esc(bodyForPage)}</p>
    </section>
    <section class="details wrap" data-section="details">
      <h2>Details</h2>
      <ul>
        ${details}
      </ul>
    </section>
    <section class="cta-block wrap" data-section="cta">
      <h2>Next step</h2>
      <a class="cta" href="${esc(packet.ctaHref)}">${esc(packet.ctaText)}</a>
      ${qrBlock}
    </section>
    <footer class="wrap" data-section="footer">
      ${contactBits ? `<p class="contact">${contactBits}</p>` : ""}
      ${
        packet.outputMode === "certification_fixture"
          ? `<p data-cert-disclaimer="1">${esc(packet.footerLegal)}</p>`
          : packet.footerLegal.trim()
            ? `<p>${esc(packet.footerLegal)}</p>`
            : ""
      }
      ${
        packet.outputMode === "certification_fixture"
          ? `<p data-cert-purpose="1">${esc(packet.pagePurpose)}</p>`
          : ""
      }
    </footer>
  </main>
</body>
</html>
`;

  return { html, definition };
}
