/**
 * CUSTOMER-VISIBILITY-CONTINUITY-CERT-1 — Gates #6 / #8 / #14 browser evidence.
 *
 * Env:
 *   CERT_BASE_URL  default http://127.0.0.1:3051
 *   CERT_COMMIT    tip recorded in report
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Prefer localhost — Next 16 blocks cross-origin client bundles from 127.0.0.1 by default. */
const BASE = process.env.CERT_BASE_URL || "http://localhost:3051";
const COMMIT = process.env.CERT_COMMIT || "unspecified";
const OUT = join(process.cwd(), "test-artifacts", "customer-visibility-continuity-1");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "phone-390", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });

/** @type {{ check: string, status: "PASS"|"FAIL"|"BLOCKED"|"LIMIT", detail?: string }[]} */
const results = [];

function push(check, status, detail) {
  results.push({ check, status, detail });
  console.log(
    `${status.padEnd(14)} ${check}${detail ? ` — ${detail}` : ""}`,
  );
}

async function overflowX(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return Math.max(
      doc.scrollWidth - doc.clientWidth,
      body.scrollWidth - body.clientWidth,
    );
  });
}

async function bodyText(page) {
  return page.evaluate(() => document.body?.innerText || "");
}

const FALSE_ETA =
  /guaranteed delivery|guaranteed turnaround|Within 2 business days|Approximately 7 business days|2 days remaining|entering production/i;

function buildSeedCampaign() {
  const now = new Date().toISOString();
  return {
    campaignId: `cvc-cert-${Date.now()}`,
    campaignName: "Visibility Continuity Cert",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Certification seed for project status continuity.",
    estimatedCompletion: "Timeline appears after production starts",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    createdAt: now,
    updatedAt: now,
    paymentReceivedAt: now,
    // Incomplete intake — truthful customer-owned need for Gate #8 evidence.
    projectDetailsSubmittedAt: undefined,
    targetCompletionDate: null,
    studioNotes: [],
    deliverablesDelivered: {},
  };
}

async function signup(page, vpId) {
  const email = `cvc-${vpId}-${Date.now()}@example.com`;
  const password = "CVC-Cert-Pass-2026!";
  const status = await page.evaluate(
    async ({ email, password }) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName: "CVC Cert Customer",
        }),
      });
      return res.status;
    },
    { email, password },
  );
  push(
    `${vpId}: signup for Board access`,
    status === 200 ? "PASS" : "FAIL",
    `status=${status}; email=${email}`,
  );
  return status === 200 ? { email, password } : null;
}

async function seedAndClaimCampaign(page, vpId) {
  const campaign = buildSeedCampaign();
  await page.evaluate(
    ({ CAMPAIGN_KEY, campaign }) => {
      localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign));
      sessionStorage.setItem(
        "studioConversationSession",
        JSON.stringify({
          journeyPhase: "studio-board",
          flowStep: "board",
          savedAt: new Date().toISOString(),
        }),
      );
    },
    { CAMPAIGN_KEY, campaign },
  );

  const claimStatus = await page.evaluate(async ({ campaign }) => {
    const res = await fetch("/api/campaigns/current", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record: campaign }),
    });
    return res.status;
  }, { campaign });

  push(
    `${vpId}: claim seeded campaign`,
    claimStatus === 200 || claimStatus === 201 ? "PASS" : "FAIL",
    `status=${claimStatus}; campaignId=${campaign.campaignId}`,
  );
  return campaign;
}

async function waitForBoardSettled(page) {
  await page.waitForFunction(
    () => {
      const loading = (document.body?.innerText || "").includes("Loading your project");
      const panel = document.querySelector('[data-testid="customer-visibility-continuity"]');
      return Boolean(panel) && !loading;
    },
    { timeout: 20000 },
  );
}

async function assertVisibilityPanel(page, vpId, label) {
  try {
    await waitForBoardSettled(page);
  } catch {
    /* assert below records failure */
  }
  const panel = page.locator('[data-testid="customer-visibility-continuity"]');
  const visible = await panel.count();
  const stillLoading = (await bodyText(page)).includes("Loading your project");
  push(
    `${vpId}: ${label} shows Project status panel`,
    visible > 0 && !stillLoading ? "PASS" : "FAIL",
    visible > 0
      ? stillLoading
        ? "panel present but still loading"
        : "panel present"
      : `panel missing url=${page.url()}`,
  );
  if (visible === 0 || stillLoading) {
    const text = await bodyText(page);
    push(
      `${vpId}: ${label} Board reachable`,
      /studio-board|Project status|Sign in|No Active Project/i.test(text) ? "PASS" : "FAIL",
      text.slice(0, 120).replace(/\s+/g, " "),
    );
    return false;
  }

  const needed = (await page.locator('[data-testid="cvc-needed"]').innerText()).trim();
  const next = (await page.locator('[data-testid="cvc-next"]').innerText()).trim();
  const who = (await page.locator('[data-testid="cvc-who"]').innerText()).trim();
  const target = (await page.locator('[data-testid="cvc-target"]').innerText()).trim();
  const risk = (await page.locator('[data-testid="cvc-risk"]').innerText()).trim();
  const studio = (await page.locator('[data-testid="cvc-studio"]').innerText()).trim();

  push(
    `${vpId}: ${label} needed / next / who / studio rows populated`,
    needed && next && who && studio ? "PASS" : "FAIL",
    `needed=${needed.slice(0, 48)} who=${who}`,
  );
  push(
    `${vpId}: ${label} customer-owned Project Intake need visible`,
    /Finish Project Intake|Project Intake/i.test(needed) && /You/i.test(who)
      ? "PASS"
      : "FAIL",
    `needed=${needed.slice(0, 64)}; who=${who}`,
  );
  push(
    `${vpId}: ${label} risk names incomplete Intake when that is the blocker`,
    /Project Intake is incomplete/i.test(risk) ? "PASS" : "FAIL",
    risk.slice(0, 100),
  );
  push(
    `${vpId}: ${label} target is date or truthful not-set/checkpoint`,
    /Not set yet|Checkpoint:|\d{4}|January|February|March|April|May|June|July|August|September|October|November|December/i.test(
      target,
    )
      ? "PASS"
      : "FAIL",
    target,
  );
  push(
    `${vpId}: ${label} risk/blocker or truthful none-recorded`,
    risk.length > 0 ? "PASS" : "FAIL",
    risk.slice(0, 100),
  );

  const text = await bodyText(page);
  push(
    `${vpId}: ${label} no false ETA / invented progress language`,
    FALSE_ETA.test(text) ? "FAIL" : "PASS",
    FALSE_ETA.test(text) ? `matched ${text.match(FALSE_ETA)?.[0]}` : "clean",
  );

  const ox = await overflowX(page);
  push(
    `${vpId}: ${label} no horizontal overflow`,
    ox <= 1 ? "PASS" : "FAIL",
    `overflowX=${ox}`,
  );
  return true;
}

async function runViewport(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
  });
  const page = await context.newPage();
  const vpId = vp.id;

  try {
    const health = await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
    push(`${vpId}: Server health`, health && health.ok() ? "PASS" : "FAIL", BASE);

    const creds = await signup(page, vpId);
    if (!creds) return;

    await seedAndClaimCampaign(page, vpId);

    await page.goto(`${BASE}/studio-board`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(900);
    await assertVisibilityPanel(page, vpId, "Board after seed");

    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(700);
    await assertVisibilityPanel(page, vpId, "Board after refresh");

    await page.goto(`${BASE}/studio-lobby`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(300);
    await page.goto(`${BASE}/studio-board`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(700);
    await assertVisibilityPanel(page, vpId, "Board after Lobby return");

    for (const path of [
      "/feedback-studio",
      "/feedback-studio?roomState=final",
      "/feedback-studio?roomState=delivery",
    ]) {
      await page.goto(`${BASE}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await page.waitForTimeout(250);
    }
    await page.goto(`${BASE}/studio-board`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(700);
    await assertVisibilityPanel(page, vpId, "Board after Review/Final/Delivery");

    // Sign-out / sign-in return
    const logoutStatus = await page.evaluate(async () => {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      return res.status;
    });
    push(
      `${vpId}: logout API`,
      logoutStatus === 200 || logoutStatus === 204 ? "PASS" : "FAIL",
      `status=${logoutStatus}`,
    );

    const loginStatus = await page.evaluate(
      async ({ email, password }) => {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        return res.status;
      },
      creds,
    );
    push(
      `${vpId}: login API return`,
      loginStatus === 200 ? "PASS" : "FAIL",
      `status=${loginStatus}`,
    );

    await page.goto(`${BASE}/studio-board`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(900);
    await assertVisibilityPanel(page, vpId, "Board after sign-out/sign-in");

    push(
      `${vpId}: cross-device continuity not claimed`,
      "LIMIT",
      "same-browser persistence verified; cross-device not in scope",
    );

    await page.screenshot({
      path: join(OUT, `${vpId}-board-visibility.png`),
      fullPage: true,
    });
  } finally {
    await context.close();
  }
}

async function main() {
  console.log(`CUSTOMER-VISIBILITY-CONTINUITY against ${BASE}`);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      await runViewport(browser, vp);
    }
  } finally {
    await browser.close();
  }

  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const limit = results.filter((r) => r.status === "LIMIT").length;
  const report = [
    `# CUSTOMER-VISIBILITY-CONTINUITY-CERT-1`,
    ``,
    `- Base: ${BASE}`,
    `- Commit: ${COMMIT}`,
    `- PASS: ${pass}`,
    `- FAIL: ${fail}`,
    `- LIMIT: ${limit}`,
    ``,
    ...results.map((r) => `- [${r.status}] ${r.check}${r.detail ? ` — ${r.detail}` : ""}`),
    ``,
  ].join("\n");
  writeFileSync(join(OUT, "REPORT.md"), report, "utf8");
  console.log(`\nWrote ${join(OUT, "REPORT.md")} (${pass} PASS / ${fail} FAIL / ${limit} LIMIT)`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
