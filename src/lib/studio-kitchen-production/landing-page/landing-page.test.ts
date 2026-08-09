import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { resolveServiceProductionContract } from "../resolve-contract";
import { loadAuthoritativeRmJ005Contract } from "./contracts";
import { lightEditLandingBodyCopy } from "./copy-edit";
import {
  LANDING_BOOKING_URL,
  buildCedarLaneLandingPacketV1,
  buildCedarLaneLandingPacketV2,
  buildCedarLaneLandingPacketV3,
  buildCedarLaneLandingPacketV4,
} from "./fixtures";
import { runLandingPageProductionPipeline } from "./pipeline";
import {
  ensureNetlifySite,
  persistNetlifySiteIdToEnvLocal,
  probePublicLandingUrl,
  publishLandingPageHtml,
} from "./publish";
import { buildLandingPageDefinition, renderLandingPageHtml } from "./render";
import { APPROVED_SECTION_ORDER } from "./structure";
import { validateLandingPageWorkPacket } from "./validate";

const repoRoot = path.resolve(__dirname, "../../../..");

describe("KITCHEN-LANDING-PAGE-PRODUCTION-1", () => {
  it("loads authoritative rm-j005 contract without inventing scope", () => {
    const c = loadAuthoritativeRmJ005Contract();
    expect(c.skuId).toBe("rm-j005");
    expect(c.serviceName).toMatch(/Page/i);
    expect(c.intakeTemplate).toBe("page");
    expect(c.formPromised).toBe(false);
    expect(c.customDomainPromised).toBe(false);
    expect(c.deliverables.some((d) => /responsive/i.test(d))).toBe(true);
    expect(c.exclusions.some((d) => /ecommerce/i.test(d))).toBe(true);
  });

  it("rejects placeholder CTA href and wrong SKU", () => {
    const base = buildCedarLaneLandingPacketV1(repoRoot);
    const bad = validateLandingPageWorkPacket(repoRoot, {
      ...base,
      ctaHref: "#",
    });
    expect(bad.ok).toBe(false);
    expect(bad.findings).toContain("cta_href_placeholder_forbidden");

    const wrongSku = validateLandingPageWorkPacket(repoRoot, {
      ...base,
      skuId: "rm-j005",
      sectionOrder: ["footer", "hero", "offer", "details", "cta"],
    });
    expect(wrongSku.ok).toBe(false);
  });

  it("maps work packet → definition with exact CTA/copy/section order", async () => {
    const packet = buildCedarLaneLandingPacketV1(repoRoot);
    expect(packet.sectionOrder).toEqual([...APPROVED_SECTION_ORDER]);
    const def = buildLandingPageDefinition(packet);
    expect(def.ctaText).toBe(packet.ctaText);
    expect(def.ctaHref).toBe(packet.ctaHref);
    expect(def.headline).toBe(packet.headline);
    expect(def.sections).toEqual(packet.sectionOrder);
    const { html } = await renderLandingPageHtml(repoRoot, packet);
    expect(html).toContain(packet.businessName);
    expect(html).toContain(`href="${packet.ctaHref}"`);
    expect(html).not.toContain("<form");
    expect(html).not.toMatch(/ELEVENLABS_API_KEY|SHOTSTACK/);
  });

  it("produces V1 artifact QA READY only and preserves owner-independence invariants", async () => {
    const packet = buildCedarLaneLandingPacketV1(repoRoot);
    const result = await runLandingPageProductionPipeline({
      repoRoot,
      packet,
      skipResponsive: true,
      skipPublishAttempt: true,
    });
    expect(result.ok).toBe(true);
    expect([
      "LANDING_PAGE_PRODUCTION_PARTIAL_PUBLISH_BLOCKER",
      "LANDING_PAGE_PRODUCTION_PROVEN",
      "LANDING_PAGE_GENERATION_OK",
    ]).toContain(result.verdict);
    expect(result.artifactRelativePath).toBe(packet.exportRelativePath);
    expect(existsSync(path.join(repoRoot, packet.exportRelativePath))).toBe(
      true,
    );
    const binding = JSON.parse(
      readFileSync(
        path.join(
          repoRoot,
          packet.exportRelativePath.replace(/\.html$/i, ".binding.json"),
        ),
        "utf8",
      ),
    );
    expect(binding.qaState).toBe("qa_ready");
    expect(binding.customerReady).toBe(false);
    expect(binding.certified).toBe(false);
    expect(binding.qaPass).toBe(false);
  }, 60_000);

  it("V2 correction creates new path/hash and preserves V1", async () => {
    const v1 = buildCedarLaneLandingPacketV1(repoRoot);
    await runLandingPageProductionPipeline({
      repoRoot,
      packet: v1,
      skipResponsive: true,
      skipPublishAttempt: true,
    });
    const v1Html = readFileSync(path.join(repoRoot, v1.exportRelativePath), "utf8");

    const v2 = buildCedarLaneLandingPacketV2(repoRoot);
    expect(v2.ctaText).toBe("Book your visit today");
    expect(v2.exportRelativePath).not.toBe(v1.exportRelativePath);
    const result = await runLandingPageProductionPipeline({
      repoRoot,
      packet: v2,
      skipResponsive: true,
      skipPublishAttempt: true,
    });
    expect(result.ok).toBe(true);
    expect(existsSync(path.join(repoRoot, v1.exportRelativePath))).toBe(true);
    const v1After = readFileSync(path.join(repoRoot, v1.exportRelativePath), "utf8");
    expect(v1After).toBe(v1Html);
    const v2Html = readFileSync(path.join(repoRoot, v2.exportRelativePath), "utf8");
    expect(v2Html).toContain("Book your visit today");
    expect(v2Html).toContain('href="tel:+15550184421"');
    expect(v1Html).not.toContain("Book your visit today");
  }, 60_000);

  it("mobile subline wrap markup preserves authoritative wording", async () => {
    const packet = buildCedarLaneLandingPacketV4(repoRoot);
    const { html } = await renderLandingPageHtml(repoRoot, packet);
    expect(html).toContain('class="sub-a">Book by May 3rd, 2026');
    expect(html).toContain('class="sub-b">Sessions from 10:30 AM');
    expect(html).toContain(".sub-sep { display: none; }");
    expect(html).toContain("@media (max-width: 480px)");
    expect(packet.subheadline).toBe("Book by May 3rd, 2026 · Sessions from 10:30 AM");
  });

  it("customer output mode omits certification fixture disclaimer", async () => {
    const packet = {
      ...buildCedarLaneLandingPacketV3(repoRoot),
      outputMode: "customer" as const,
      footerLegal: "",
    };
    const { html } = await renderLandingPageHtml(repoRoot, packet);
    expect(html).not.toContain("data-cert-disclaimer");
    expect(html).not.toContain("not a customer deliverable");
    expect(html).toContain("Book your visit today");
  });

  it("light-edits awkward portrait-story body copy without inventing claims", () => {
    const edited = lightEditLandingBodyCopy(
      "Cedar Lane Studio invites you to a Portrait Refresh for ninety-nine dollars. Bring your best self — we will handle the calm, clear portrait story.",
    );
    expect(edited.changed).toBe(true);
    expect(edited.text).toContain("ninety-nine dollars");
    expect(edited.text).toContain("Bring your best self for a calm, clear portrait");
    expect(edited.text).not.toMatch(/portrait story/i);
    expect(edited.text).not.toMatch(/we will handle/i);
  });

  it("V3 desktop QA correction: portrait hero, de-dupe, QR booking URL, preserve prior artifact", async () => {
    const v2 = buildCedarLaneLandingPacketV2(repoRoot);
    await runLandingPageProductionPipeline({
      repoRoot,
      packet: v2,
      skipResponsive: true,
      skipPublishAttempt: true,
    });
    const v2Html = readFileSync(path.join(repoRoot, v2.exportRelativePath), "utf8");

    const v3 = buildCedarLaneLandingPacketV3(repoRoot);
    expect(v3.subheadline).toBe("Book by May 3rd, 2026 · Sessions from 10:30 AM");
    expect(v3.offerSummary).toBe("Refresh your portrait for $99.");
    expect(v3.qrHref).toBe(LANDING_BOOKING_URL);
    expect(v3.ctaHref).toBe("tel:+15550184421");
    expect(v3.assets.find((a) => a.role === "hero")?.relativePath).toMatch(
      /portrait-hero/,
    );
    expect(v3.bodyCopy).not.toMatch(/portrait story/i);

    const result = await runLandingPageProductionPipeline({
      repoRoot,
      packet: v3,
      skipResponsive: true,
      skipPublishAttempt: true,
    });
    expect(result.ok).toBe(true);
    const html = readFileSync(path.join(repoRoot, v3.exportRelativePath), "utf8");
    expect(html).toContain(`data-qr-href="${LANDING_BOOKING_URL}"`);
    expect(html).toContain('href="tel:+15550184421"');
    expect(html).toContain("Book your visit today");
    expect(html).not.toContain("Limited time —");
    expect(html).not.toContain("Sessions begin at 10:30 AM");
    expect(html).not.toMatch(/portrait story/i);
    expect(readFileSync(path.join(repoRoot, v2.exportRelativePath), "utf8")).toBe(
      v2Html,
    );
  }, 60_000);

  it("publish fails honestly without credentials (no invented success)", async () => {
    const pub = await publishLandingPageHtml({
      html: "<html></html>",
      deployMessage: "test",
      env: {},
    });
    expect(pub.ok).toBe(false);
    if (!pub.ok) {
      expect(pub.code).toBe("credentials_absent");
      expect(pub.ownerSetupRequired).toBe(true);
    }
  });

  it("creates Netlify site via API when token present and site id absent", async () => {
    const env: NodeJS.ProcessEnv = { NETLIFY_AUTH_TOKEN: "test-token" };
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url);
      if (href.endsWith("/api/v1/sites") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            id: "site-from-api",
            name: "studio-kitchen-landing",
            default_domain: "studio-kitchen-landing.netlify.app",
          }),
          { status: 201 },
        );
      }
      throw new Error(`unexpected fetch ${href}`);
    }) as typeof fetch;

    const ensured = await ensureNetlifySite({
      env,
      fetchImpl,
      persistEnvLocal: false,
    });
    expect(ensured.ok).toBe(true);
    if (ensured.ok) {
      expect(ensured.created).toBe(true);
      expect(ensured.siteId).toBe("site-from-api");
      expect(env.NETLIFY_SITE_ID).toBe("site-from-api");
    }
  });

  it("rejects private edge-access login wall as not publicly published", async () => {
    const probe = await probePublicLandingUrl("https://example.test", (async () =>
      new Response("<title>Login Redirect</title>edge-access", {
        status: 401,
      })) as typeof fetch);
    expect(probe.ok).toBe(false);
    if (!probe.ok) {
      expect(probe.code).toBe("public_access_blocked");
      expect(probe.message).toMatch(/not publicly reachable|edge-access/i);
    }
  });

  it("persists NETLIFY_SITE_ID into env text without wiping other keys", () => {
    const dir = path.join(repoRoot, "tmp/landing-env-persist-test");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, ".env.local"),
      "ELEVENLABS_API_KEY=x\nNETLIFY_AUTH_TOKEN=y\n",
      "utf8",
    );
    persistNetlifySiteIdToEnvLocal(dir, "abc123site");
    const text = readFileSync(path.join(dir, ".env.local"), "utf8");
    expect(text).toContain("ELEVENLABS_API_KEY=x");
    expect(text).toContain("NETLIFY_AUTH_TOKEN=y");
    expect(text).toMatch(/^NETLIFY_SITE_ID=abc123site$/m);
    rmSync(dir, { recursive: true, force: true });
  });

  it("production contract sealed CUSTOMER READY WITH LIMITS after Owner visual QA", () => {
    const resolved = resolveServiceProductionContract("rm-j005");
    expect(resolved.status).toBe("resolved");
    if (resolved.status !== "resolved") return;
    expect(resolved.contract.readiness).toBe("contract_ready");
    expect(resolved.contract.readinessNotes).toMatch(
      /CUSTOMER READY WITH LIMITS/i,
    );
    expect(resolved.contract.readinessNotes).toMatch(/per-artifact/i);
    expect(resolved.contract.limitations.join(" ")).toMatch(/outputMode/i);
    expect(resolved.contract.limitations.join(" ")).toMatch(
      /certification-fixture/i,
    );
    expect(resolved.contract.primaryTool.toolId).toBe(
      "studio_landing_page_structure",
    );
    expect(resolved.contract.primaryTool.toolReadiness).toBe("contract_ready");
  });
});
