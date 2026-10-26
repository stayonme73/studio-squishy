/**
 * Builder QA — post-submit phone Review dock.
 * Maya's included revision is spent. Read-only: do not type, send, or approve.
 *
 * Usage: node scripts/mobile-maya-review-post-submit-qa.mjs
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const PAID_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const JOB_ID = `${PAID_ID}:v2-rtu-flyer`;
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

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { ok: false, checks: {}, proofs: [], pageErrors: [] };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
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
    report.checks.customerOneLogin = Boolean(login.ok() && loginBody?.user?.id);
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

    const reviewRes = await context.request.get(
      `${BASE}/api/campaigns/${PAID_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
    );
    const reviewBody = await reviewRes.json();
    const review = reviewBody?.review ?? reviewBody;
    report.machine = {
      spineStatus: review?.spineStatus,
      remaining: review?.correctionAccounting?.remaining,
      used: review?.correctionAccounting?.effectiveUsed,
      submittedAt: review?.feedback?.submittedAt ?? null,
      canRequestRevision: review?.canRequestRevision,
      canApproveForDelivery: review?.canApproveForDelivery,
    };

    await page.goto(
      `${BASE}/feedback-studio?jobId=${encodeURIComponent(JOB_ID)}`,
      { waitUntil: "load", timeout: 60000 },
    );
    await page.waitForSelector(".fs-review--workspace", { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.locator(".fs-phone-dock").scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "maya-post-submit-01-dock.png"));

    const dock = await page.evaluate(() => {
      const root = document.querySelector(".fs-phone-dock");
      const text = (root?.innerText ?? "").replace(/\s+/g, " ").trim();
      const glance = document.querySelector(".fs-review__phone-glance");
      const version = document.querySelector(".fs-preview__phone-meta");
      return {
        text,
        glance: (glance?.textContent ?? "").replace(/\s+/g, " ").trim(),
        version: (version?.textContent ?? "").replace(/\s+/g, " ").trim(),
        hasRequestChange: Boolean(
          root?.querySelector(".fs-phone-dock__btn--change"),
        ),
        hasSend: Boolean(root?.querySelector(".fs-phone-dock__send")),
        hasTypeField: Boolean(document.getElementById("fs-phone-dock-change-field")),
        hasSendNeedsHint: /Type a change/.test(text),
        hasRevisionRequested: /Revision requested/.test(text),
        hasStudioWorking: /The Studio is working on your changes/.test(text),
        hasApprove: Boolean(root?.querySelector(".fs-phone-dock__btn--approve")),
        hasAsk: /Ask The Studio/.test(text),
      };
    });
    report.dock = dock;
    report.checks.noZombieForm =
      !dock.hasSend && !dock.hasTypeField && !dock.hasSendNeedsHint;
    report.checks.noRequestChange = !dock.hasRequestChange;
    report.checks.zeroRemaining = /0 remaining/.test(dock.glance);
    report.checks.askStillPresent = dock.hasAsk;
    report.checks.noPageErrors = report.pageErrors.length === 0;
    report.ok =
      report.checks.noZombieForm &&
      report.checks.noRequestChange &&
      report.checks.zeroRemaining &&
      report.checks.askStillPresent &&
      report.checks.noPageErrors;
  } finally {
    await browser.close();
    await writeFile(
      path.join(OUT, "maya-post-submit-qa.json"),
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
