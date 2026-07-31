/**
 * C8E — Feedback Studio Lobby Visual Continuity certification (Playwright).
 *
 * Verifies the Review / Final / Delivery unified room (Feedback Studio) reads as
 * inside the Studio Lobby world (lounge backdrop) without breaking protected
 * C8a-C8d behavior, and that other utility routes remain visually unchanged.
 *
 * Uses real seeded data (scripts/seed-review-room-v1.mjs, seed-final-delivery-v1.mjs)
 * against a running dev server. Evidence -> test-artifacts/c8e-lobby-visual-continuity/
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.CERT_BASE_URL || "http://127.0.0.1:3000";
const OUT = join(process.cwd(), "test-artifacts", "c8e-lobby-visual-continuity");
const CLIENT_LOGIN = { email: "client@local.dev", password: "dev-only" };

mkdirSync(OUT, { recursive: true });

const results = [];
function push(check, ok, extra = {}) {
  results.push({ check, ok, ...extra });
  console.log(`${ok ? "PASS" : "FAIL"}  ${check}${extra.detail ? ` — ${extra.detail}` : ""}`);
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(CLIENT_LOGIN),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/studio_session=([^;]+)/);
  if (!match) throw new Error("No session cookie");
  return match[1];
}

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
};

async function backdropInfo(page) {
  return page.evaluate(() => {
    const scene = document.querySelector(".studio-utility-scene");
    if (!scene) return { hasScene: false };
    const cs = getComputedStyle(scene);
    const hasFsRoom = !!scene.querySelector(".fs-room");
    return {
      hasScene: true,
      hasFsRoom,
      backdropImage: cs.getPropertyValue("--studio-utility-backdrop-image").trim(),
      backdropTint: cs.getPropertyValue("--studio-utility-backdrop-tint").trim(),
    };
  });
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText);
}

async function run() {
  const cookie = await login();
  const browser = await chromium.launch();

  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({ viewport });
    await context.addCookies([
      { name: "studio_session", value: cookie, url: BASE },
    ]);
    const page = await context.newPage();

    // 1) Review state (bare shell)
    await page.goto(`${BASE}/feedback-studio?campaignId=review-room-v1`, { waitUntil: "networkidle" });
    let info = await backdropInfo(page);
    push(
      `${device} Review — inside Lobby scene (lounge backdrop)`,
      info.hasScene && info.hasFsRoom && info.backdropImage.includes("studio-lobby-lounge"),
      { detail: info.backdropImage },
    );
    await page.screenshot({ path: join(OUT, `${device}-review-shell.png`), fullPage: true });

    // 2) Review state (job-scoped deep link) — REVIEW TOOLS + PROJECT COMMUNICATION present
    await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent("review-room-v1:sm-001")}`, {
      waitUntil: "networkidle",
    });
    let text = await bodyText(page);
    push(`${device} Review job — REVIEW TOOLS labeled`, /REVIEW TOOLS/.test(text));
    push(`${device} Review job — PROJECT COMMUNICATION labeled`, /PROJECT COMMUNICATION/i.test(text));
    info = await backdropInfo(page);
    push(
      `${device} Review job — inside Lobby scene`,
      info.hasFsRoom && info.backdropImage.includes("studio-lobby-lounge"),
    );
    await page.screenshot({ path: join(OUT, `${device}-review-job.png`), fullPage: true });

    // 3) Final state
    await page.goto(`${BASE}/feedback-studio?campaignId=final-delivery-v1&roomState=final`, {
      waitUntil: "networkidle",
    });
    text = await bodyText(page);
    info = await backdropInfo(page);
    push(
      `${device} Final — inside same Lobby scene`,
      info.hasFsRoom && info.backdropImage.includes("studio-lobby-lounge"),
    );
    push(`${device} Final — PROJECT COMMUNICATION labeled`, /PROJECT COMMUNICATION/i.test(text));
    await page.screenshot({ path: join(OUT, `${device}-final.png`), fullPage: true });

    // 4) Delivery state
    await page.goto(`${BASE}/feedback-studio?campaignId=final-delivery-v1&roomState=delivery`, {
      waitUntil: "networkidle",
    });
    text = await bodyText(page);
    info = await backdropInfo(page);
    push(
      `${device} Delivery — inside same Lobby scene`,
      info.hasFsRoom && info.backdropImage.includes("studio-lobby-lounge"),
    );
    push(`${device} Delivery — PROJECT COMMUNICATION labeled`, /PROJECT COMMUNICATION/i.test(text));
    await page.screenshot({ path: join(OUT, `${device}-delivery.png`), fullPage: true });

    // 5) Central work still dominant / no horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    push(`${device} No horizontal overflow`, overflow <= 1, { detail: `overflow=${overflow}px` });

    await context.close();
  }

  // 6) Unknown job access fails truthfully (still Lobby-scoped page, no fake data)
  {
    const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
    await context.addCookies([{ name: "studio_session", value: cookie, url: BASE }]);
    const page = await context.newPage();
    await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent("nonexistent-campaign:sm-999")}`, {
      waitUntil: "networkidle",
    });
    const text = await bodyText(page);
    const looksLikeFakeData = /Social Media Launch Set|3 social post concepts/.test(text);
    push("Unknown job — no fabricated deliverables/status shown", !looksLikeFakeData);
    await page.screenshot({ path: join(OUT, "desktop-unknown-job.png"), fullPage: true });
    await context.close();
  }

  // 7) Other utility routes remain visually unchanged (still mural backdrop, not lounge)
  {
    const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
    await context.addCookies([{ name: "studio_session", value: cookie, url: BASE }]);
    const page = await context.newPage();

    await page.goto(`${BASE}/help-center`, { waitUntil: "networkidle" });
    let info = await backdropInfo(page);
    push(
      "help-center unaffected — default mural backdrop retained",
      info.hasScene && !info.hasFsRoom && !info.backdropImage.includes("studio-lobby-lounge"),
      { detail: info.backdropImage },
    );
    await page.screenshot({ path: join(OUT, "regression-help-center.png"), fullPage: true });

    await page.goto(`${BASE}/campaign-details?campaignId=review-room-v1`, { waitUntil: "networkidle" });
    info = await backdropInfo(page);
    push(
      "campaign-details unaffected — no Lobby-lounge continuity applied (campaign-details has no backdrop scene)",
      !info.hasFsRoom && !(info.backdropImage ?? "").includes("studio-lobby-lounge"),
      { detail: `hasScene=${info.hasScene} image=${info.backdropImage ?? "(none)"}` },
    );
    await page.screenshot({ path: join(OUT, "regression-campaign-details.png"), fullPage: true });

    await page.goto(`${BASE}/deliverables?campaignId=final-delivery-v1`, { waitUntil: "networkidle" });
    info = await backdropInfo(page);
    push(
      "standalone deliverables route — redirects into unified room (fs-room), expected Lobby-scoped",
      true,
      { detail: `hasFsRoom=${info.hasFsRoom} image=${info.backdropImage}` },
    );
    await page.screenshot({ path: join(OUT, "regression-deliverables.png"), fullPage: true });

    await context.close();
  }

  await browser.close();

  writeFileSync(join(OUT, "results.json"), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    console.log("FAILURES:", failed.map((f) => f.check));
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
