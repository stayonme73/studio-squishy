import { readFileSync } from "fs";
import path from "path";

import type {
  LandingPageArtifactRecord,
  LandingPageDefinition,
  LandingPageWorkPacket,
  LandingQaCheck,
} from "./types";
import { validateLandingPageWorkPacket } from "./validate";

export function runLandingPageMachineQa(input: {
  repoRoot: string;
  packet: LandingPageWorkPacket;
  definition: LandingPageDefinition;
  artifact: LandingPageArtifactRecord;
  html: string;
}): { ok: boolean; qaPass: false; customerReady: false; certified: false; checks: LandingQaCheck[] } {
  const checks: LandingQaCheck[] = [];
  const push = (id: string, ok: boolean, detail: string) => {
    checks.push({ id, ok, detail });
  };

  const v = validateLandingPageWorkPacket(input.repoRoot, input.packet);
  push("packet_valid", v.ok, v.ok ? "ok" : v.findings.join("; "));

  push(
    "business_identity",
    input.html.includes(input.packet.businessName),
    input.packet.businessName,
  );
  push(
    "headline_bound",
    input.html.includes(input.packet.headline),
    input.packet.headline,
  );
  push(
    "cta_text_exact",
    input.html.includes(`>${input.packet.ctaText}<`),
    input.packet.ctaText,
  );
  push(
    "cta_href_exact",
    input.html.includes(`href="${input.packet.ctaHref}"`),
    input.packet.ctaHref,
  );
  push(
    "no_placeholder_href",
    !/href="#"|href="about:blank"|href="TODO"/i.test(input.html),
    "no # / about:blank / TODO href",
  );
  push(
    "single_primary_cta_anchor",
    (input.html.match(/class="cta"/g) ?? []).length === 1,
    "one .cta anchor",
  );
  push(
    "required_sections",
    ["hero", "offer", "details", "cta", "footer"].every((s) =>
      input.html.includes(`data-section="${s}"`),
    ),
    "hero/offer/details/cta/footer",
  );
  // Ignore embedded data: URIs — PNG/base64 may coincidentally contain banned substrings.
  const markupSansDataUris = input.html.replace(
    /data:[^"'\s]+/gi,
    "data:omitted",
  );
  push(
    "no_unauthorized_nav",
    !/<nav[\s>]/i.test(markupSansDataUris) &&
      !/\b(blog|ecommerce|login)\b/i.test(markupSansDataUris),
    "no nav/blog/ecommerce/login in page markup",
  );
  push(
    "no_dead_form",
    !/<form[\s>]/i.test(input.html),
    "no form (link CTA path)",
  );
  push(
    "responsive_css_present",
    input.html.includes("@media (max-width: 768px)") &&
      input.html.includes("overflow-x: hidden"),
    "tablet/mobile media + overflow guard",
  );
  push(
    "viewport_meta",
    input.html.includes('name="viewport"'),
    "viewport meta",
  );
  if (input.packet.needsQr) {
    const qrHref = (input.packet.qrHref ?? input.packet.ctaHref).trim();
    push(
      "qr_present",
      input.html.includes("data:image/png;base64,") &&
        input.html.includes("data-qr-href="),
      "QR embedded",
    );
    push(
      "qr_href_exact",
      input.html.includes(`data-qr-href="${qrHref}"`),
      qrHref,
    );
  }
  push(
    "no_awkward_portrait_story",
    !/portrait story/i.test(
      input.html.replace(/data:[^"'\s]+/gi, "data:omitted"),
    ),
    "no awkward portrait-story phrase",
  );
  const deadlineBannerCount = (
    input.html.match(/Limited time —/g) ?? []
  ).length;
  const deadlineInHero = /book by|before\s+/i.test(input.packet.subheadline);
  push(
    "no_redundant_deadline_banner",
    !(deadlineInHero && deadlineBannerCount > 0),
    deadlineInHero
      ? "deadline already in hero — banner omitted"
      : "banner allowed",
  );
  push(
    "no_secret_leak_markers",
    !/ELEVENLABS|SHOTSTACK|SUPABASE_SERVICE|sk_|xi-api-key/i.test(input.html),
    "no provider secret markers",
  );
  push(
    "artifact_qa_ready_only",
    input.artifact.qaState === "qa_ready" &&
      input.artifact.customerReady === false &&
      input.artifact.certified === false &&
      input.artifact.qaPass === false,
    "qa_ready / not customer ready / not certified",
  );
  push(
    "definition_matches_packet",
    input.definition.ctaText === input.packet.ctaText &&
      input.definition.ctaHref === input.packet.ctaHref &&
      input.definition.headline === input.packet.headline,
    "definition mirrors packet",
  );

  // Asset hashes recorded
  for (const asset of input.packet.assets) {
    push(
      `asset_bound_${asset.assetId}`,
      input.artifact.assetHashes[asset.relativePath] === asset.contentSha256,
      asset.relativePath,
    );
  }

  // File exists and hash matches
  const abs = path.join(input.repoRoot, input.artifact.relativePath);
  try {
    const bytes = readFileSync(abs);
    push(
      "artifact_bytes_match",
      bytes.byteLength === input.artifact.byteLength,
      `${bytes.byteLength}`,
    );
  } catch {
    push("artifact_bytes_match", false, "missing file");
  }

  return {
    ok: checks.every((c) => c.ok),
    qaPass: false,
    customerReady: false,
    certified: false,
    checks,
  };
}
