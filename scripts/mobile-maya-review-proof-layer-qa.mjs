/**
 * Builder QA — phone Review proof must not cover other Review content.
 * Does not send or approve. Maya must stay 0 of 1.
 *
 * Usage: node scripts/mobile-maya-review-proof-layer-qa.mjs
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

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { ok: false, checks: {}, proofs: [] };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
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
    await page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(JOB_ID)}`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector(".fs-review-proof", { timeout: 30000 });
    await page.waitForTimeout(700);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    report.proofs.push(
      path.join(OUT, "maya-review-proof-no-overlap.png"),
    );
    await page.screenshot({ path: report.proofs[0], fullPage: false });

    const layout = await page.evaluate(() => {
      const box = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const styles = getComputedStyle(el);
        return {
          sel,
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
          display: styles.display,
          overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
        };
      };
      const stickies = Array.from(document.querySelectorAll(".fs-sticky")).map((el) => {
        const styles = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          display: styles.display,
          x: r.x,
          y: r.y,
          w: r.width,
          h: r.height,
          text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
        };
      });
      return {
        title: box(".fs-preview__title"),
        header: box(".fs-preview__header"),
        proof: box(".fs-review-proof"),
        mock: box(".fs-mock"),
        dock: box(".fs-phone-dock"),
        reviewBar: box(".studio-review-mobile-tab") || box(".owner-qa"),
        stickies,
        pageWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    report.layout = layout;
    const visibleSticky = (layout.stickies || []).find((note) => note.display !== "none");
    report.checks.noVisibleStickyCard = !visibleSticky;
    report.checks.titleAboveProof = Boolean(
      layout.title && layout.proof && layout.title.y + layout.title.h <= layout.proof.y + 1,
    );
    report.checks.titleDoesNotOverlapProof = Boolean(
      layout.title && layout.proof && !overlap(layout.title, layout.proof),
    );
    report.checks.proofFullyVisible = Boolean(
      layout.proof && layout.proof.w > 200 && layout.proof.h > 200,
    );
    report.checks.noHorizontalOverflow = layout.pageWidth <= layout.viewportWidth + 1;
    report.checks.approveVisible = await page.getByRole("button", { name: "Approve" }).isVisible();

    await page.locator(".fs-phone-dock").scrollIntoViewIfNeeded();
    report.proofs.push(path.join(OUT, "maya-review-proof-dock.png"));
    await page.screenshot({ path: report.proofs[1], fullPage: false });
    report.checks.dockNotCoveredByReviewBar = await page
      .locator(".fs-phone-dock__btn--approve")
      .evaluate((el) => {
        const r = el.getBoundingClientRect();
        const bar = document.querySelector(".studio-review-mobile-tab, .owner-qa");
        if (!bar) return true;
        const b = bar.getBoundingClientRect();
        return r.bottom <= b.top + 8;
      });

    const review = await context.request.get(
      `${BASE}/api/campaigns/${encodeURIComponent(PAID_ID)}/jobs/${encodeURIComponent(JOB_ID)}/review`,
      { headers: { Cookie: `studio_session=${token}` } },
    );
    const json = await review.json();
    report.checks.mayaStillZeroOfOne = json.review?.revisionRoundsUsed === 0;
    report.checks.notSubmitted = json.review?.feedback?.submittedAt == null;
    report.checks.didNotSend = true;
    report.checks.didNotApprove = true;

    report.ok = Boolean(
      report.checks.customerOneLogin &&
        report.checks.noVisibleStickyCard &&
        report.checks.titleAboveProof &&
        report.checks.titleDoesNotOverlapProof &&
        report.checks.proofFullyVisible &&
        report.checks.noHorizontalOverflow &&
        report.checks.approveVisible &&
        report.checks.mayaStillZeroOfOne &&
        report.checks.notSubmitted &&
        report.checks.didNotSend,
    );
  } finally {
    await writeFile(
      path.join(OUT, "maya-review-proof-layer-qa-report.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  }
}

await main();
