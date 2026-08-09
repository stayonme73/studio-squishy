import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

import { assertSectionOrder } from "./structure";
import type { LandingPageWorkPacket } from "./types";
import { LANDING_PAGE_SKU, LANDING_PAGE_STRUCTURE_ID } from "./types";

const PLACEHOLDER_RE = /^(#|about:blank|javascript:|TODO|TBD|placeholder)/i;

export function sha256File(abs: string): string {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

export function validateLandingPageWorkPacket(
  repoRoot: string,
  packet: LandingPageWorkPacket,
): { ok: boolean; findings: string[] } {
  const findings: string[] = [];
  if (packet.skuId !== LANDING_PAGE_SKU) findings.push("sku_must_be_rm_j005");
  if (packet.structureId !== LANDING_PAGE_STRUCTURE_ID) {
    findings.push("structure_must_be_studio_campaign_page_v1");
  }
  if (!packet.businessName.trim()) findings.push("business_name_required");
  if (!packet.headline.trim()) findings.push("headline_required");
  if (!packet.ctaText.trim()) findings.push("cta_text_required");
  if (!packet.ctaHref.trim()) findings.push("cta_href_required");
  if (PLACEHOLDER_RE.test(packet.ctaHref.trim())) {
    findings.push("cta_href_placeholder_forbidden");
  }
  const href = packet.ctaHref.trim();
  const hrefOk =
    href.startsWith("tel:") ||
    href.startsWith("mailto:") ||
    href.startsWith("https://") ||
    href.startsWith("http://");
  if (!hrefOk) findings.push("cta_href_scheme_invalid");
  // Fixture/internal hosts may use .example — forbid empty hosts.
  if (/^https?:\/\/$/i.test(href)) findings.push("cta_href_empty_host");

  if (packet.needsQr) {
    const qr = packet.qrHref?.trim() ?? "";
    if (!qr) findings.push("qr_href_required_when_needs_qr");
    else if (PLACEHOLDER_RE.test(qr)) findings.push("qr_href_placeholder_forbidden");
    else {
      const qrOk =
        qr.startsWith("tel:") ||
        qr.startsWith("mailto:") ||
        qr.startsWith("https://") ||
        qr.startsWith("http://");
      if (!qrOk) findings.push("qr_href_scheme_invalid");
      if (/^https?:\/\/$/i.test(qr)) findings.push("qr_href_empty_host");
    }
  }

  const sections = assertSectionOrder(packet.sectionOrder);
  if (!sections.ok) findings.push(...sections.findings);

  if (packet.limitedTime && !packet.deadlineText?.trim()) {
    findings.push("deadline_required_when_limited_time");
  }

  let logo = 0;
  let hero = 0;
  for (const asset of packet.assets) {
    const abs = path.join(repoRoot, asset.relativePath);
    if (!existsSync(abs)) {
      findings.push(`missing_asset_${asset.assetId}`);
      continue;
    }
    const hash = sha256File(abs);
    if (hash !== asset.contentSha256) {
      findings.push(`asset_hash_mismatch_${asset.assetId}`);
    }
    if (asset.role === "logo") logo++;
    if (asset.role === "hero") hero++;
  }
  if (logo !== 1) findings.push("exactly_one_logo_required");
  if (hero !== 1) findings.push("exactly_one_hero_required");

  // Reject invented multi-CTA language in cta text stacks
  if (/\n/.test(packet.ctaText)) findings.push("cta_must_be_single_line");

  return { ok: findings.length === 0, findings };
}
