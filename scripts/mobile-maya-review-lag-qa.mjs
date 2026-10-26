/**
 * Measure Board → Review Room transition. Read-only: no send, no approve.
 *
 * Usage: node scripts/mobile-maya-review-lag-qa.mjs
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const PAID_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

function loadSessionSecret() {
  const raw = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("SESSION_SECRET=")) continue;
    return line.slice("SESSION_SECRET=".length).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("SESSION_SECRET is not configured");
}

function mintSessionCookie(user, currentCampaignId) {
  const payload = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    currentCampaignId,
    clientCampaignIds: user.clientCampaignIds ?? [],
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    issuedAt: Date.now(),
  };
  const payloadJson = JSON.stringify(payload);
  const payloadPart = Buffer.from(payloadJson).toString("base64url");
  const signature = createHmac("sha256", loadSessionSecret())
    .update(payloadJson)
    .digest("base64url");
  return `${payloadPart}.${signature}`;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { ok: false, checks: {}, timings: {}, pageErrors: [] };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  page.on("pageerror", (error) => {
    const message = String(error);
    if (message.includes("appendChild")) return;
    report.pageErrors.push(message.slice(0, 400));
  });

  try {
    const login = await context.request.post(`${BASE}/api/auth/local-customer-one`, {
      timeout: 30000,
    });
    const loginBody = await login.json();
    const token = mintSessionCookie(loginBody.user, PAID_ID);
    await context.addCookies([
      {
        name: "studio_session",
        value: token,
        url: BASE,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);
    await page.addInitScript(() => {
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    });

    await page.goto(`${BASE}/studio-board`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector("text=Studio Board", { timeout: 30000 });
    await page.waitForTimeout(400);

    const reviewLink = page.locator('a[href*="feedback-studio"]').first();
    report.checks.reviewHref = await reviewLink.getAttribute("href");

    const resources = [];
    page.on("response", (response) => {
      const url = response.url();
      if (
        /\/(feedback-studio|review|stages|campaigns|file-room|project-communication)/.test(
          url,
        )
      ) {
        resources.push({
          status: response.status(),
          url: url.replace(BASE, ""),
          timing: null,
        });
      }
    });

    const started = Date.now();
    await Promise.all([
      page.waitForURL(/feedback-studio/, { timeout: 30000 }),
      reviewLink.click(),
    ]);
    await page.waitForSelector(".fs-review--workspace, .fs-phone-dock, .fs-preview", {
      timeout: 30000,
    });
    const visibleMs = Date.now() - started;
    await page.waitForTimeout(600);
    const settledMs = Date.now() - started;

    const perf = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const resources = performance
        .getEntriesByType("resource")
        .filter((entry) =>
          /review|stages|campaigns|file-room|proof|feedback-studio/.test(entry.name),
        )
        .map((entry) => ({
          name: entry.name.replace(location.origin, ""),
          duration: Math.round(entry.duration),
          transferSize: Math.round(entry.transferSize || 0),
        }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 16);
      return {
        navigationDuration: nav ? Math.round(nav.duration) : null,
        resources,
      };
    });

    report.timings = {
      clickToWorkspaceMs: visibleMs,
      clickToSettledMs: settledMs,
      reviewHref: report.checks.reviewHref,
      ...perf,
    };
    report.ok = visibleMs > 0 && report.pageErrors.length === 0;
    await page.screenshot({
      path: path.join(OUT, "maya-board-to-review-lag.png"),
      fullPage: false,
    });
  } finally {
    await browser.close();
    await writeFile(
      path.join(OUT, "maya-board-to-review-lag.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
