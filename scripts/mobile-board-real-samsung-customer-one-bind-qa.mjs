/**
 * Real Samsung Customer-One Board bind proof.
 * Uses the existing local-customer-one session identity and the actual
 * Sep 12 sandbox-paid campaign. Does not invent Jordan. Does not remint Maya.
 *
 * Usage: node scripts/mobile-board-real-samsung-customer-one-bind-qa.mjs
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.STUDIO_PROOF_ORIGIN ?? "https://localhost:3000";
const MAYA_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const FRESH_ID = "2577b971-d0f9-4f3f-a03c-7d73bbcbdc2b";
const MAYA_FILE = path.join(process.cwd(), "data", "campaigns", `${MAYA_ID}.json`);
const FRESH_FILE = path.join(process.cwd(), "data", "campaigns", `${FRESH_ID}.json`);
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

async function hashMayaFile() {
  const raw = await readFile(MAYA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return {
    sha256: createHash("sha256").update(raw).digest("hex"),
    freeze: parsed?.record?.productionFreeze ?? null,
    campaignName: parsed?.record?.campaignName ?? null,
    paymentReceivedAt: parsed?.record?.paymentReceivedAt ?? null,
  };
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const beforeMaya = await hashMayaFile();
  if (beforeMaya.freeze?.renderVersion !== 16 || beforeMaya.freeze?.doNotRemint !== true) {
    throw new Error("Maya envelope is not frozen at Version 16 before QA");
  }
  const freshDisk = JSON.parse(await readFile(FRESH_FILE, "utf8"));
  if (freshDisk.clientUserId !== "local-customer-one") {
    throw new Error("Fresh campaign is not owned by local-customer-one");
  }
  if (freshDisk.record?.paymentTruth?.sandbox !== true) {
    throw new Error("Fresh campaign is not the sandbox payment");
  }

  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    origin: BASE,
    proofs: [],
    beforeMaya,
    afterMaya: null,
    user: null,
    current: null,
    board: null,
  };

  try {
    const ctx = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 360, height: 780 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: "en-US",
    });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);

    await page.goto(`${BASE}/studio-lobby?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });

    const fixtureLogin = await ctx.request.post(`${BASE}/api/auth/local-customer-one`, {
      data: {},
    });
    const loginBody = await fixtureLogin.json().catch(() => ({}));
    if (!fixtureLogin.ok()) {
      throw new Error(`Customer-One login failed: ${JSON.stringify(loginBody)}`);
    }
    report.user = {
      id: loginBody.user?.id ?? null,
      displayName: loginBody.user?.displayName ?? null,
      currentCampaignId: loginBody.user?.currentCampaignId ?? null,
    };

    await page.evaluate(
      ({ mayaId, sandboxKey }) => {
        window.sessionStorage.setItem(sandboxKey, "1");
        window.localStorage.setItem(
          "studio-squishy:current-campaign",
          JSON.stringify({
            campaignId: mayaId,
            campaignName: "Maya’s Mobile Boutique",
            campaignStatus: "READY_FOR_REVIEW",
            campaignDescription: "Stale Samsung pointer",
            estimatedCompletion: "Soon",
            packageId: "custom-studio-plan",
            packageLabel: "Custom Studio Plan",
            paymentReceivedAt: "2026-09-06T22:28:33.080Z",
            createdAt: "2026-09-06T22:28:32.897Z",
            updatedAt: "2026-09-12T18:01:27.495Z",
            deliverablesDelivered: {},
          }),
        );
      },
      {
        mayaId: MAYA_ID,
        sandboxKey: "studio-payment:sandbox-opt-in:v1",
      },
    );

    await page.goto(`${BASE}/studio-board?studioPaymentSandbox=1`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector(".sb-header-v3", { timeout: 20000 });
    await page.waitForTimeout(2000);
    report.proofs.push(await shot(page, "board-real-samsung-customer-one-bind-01.png"));

    const board = await page.evaluate(async () => {
      const text = document.body.innerText;
      const currentRes = await fetch("/api/campaigns/current", {
        credentials: "include",
      });
      const currentBody = await currentRes.json().catch(() => ({}));
      const record = currentBody?.campaign?.record ?? currentBody?.campaign ?? null;
      const local = window.localStorage.getItem("studio-squishy:current-campaign");
      const href = window.location.href;
      return {
        href,
        text,
        greeting: document.querySelector(".sb-header-v3__greeting")?.textContent ?? "",
        name: document.querySelector(".sb-header-v3__name")?.textContent ?? "",
        openedReview: /\/feedback-studio|\/review-room/i.test(href),
        localCampaignId: local ? JSON.parse(local).campaignId : null,
        localCampaignName: local ? JSON.parse(local).campaignName : null,
        currentStatus: currentRes.status,
        currentCampaignId: record?.campaignId ?? null,
        currentCampaignName: record?.campaignName ?? null,
        currentPaidAt: record?.paymentReceivedAt ?? null,
        currentSandbox: record?.paymentTruth?.sandbox ?? null,
        currentIntakeAt: record?.routeMapIntakeSubmittedAt ?? null,
        currentCheckoutSessionId: record?.paymentTruth?.checkoutSessionId ?? null,
      };
    });
    report.board = board;
    report.current = {
      campaignId: board.currentCampaignId,
      campaignName: board.currentCampaignName,
      paidAt: board.currentPaidAt,
      sandbox: board.currentSandbox,
      checkoutSessionId: board.currentCheckoutSessionId,
    };

    if (board.openedReview) {
      throw new Error("Proof opened Review Room — forbidden");
    }
    if (board.currentCampaignId === MAYA_ID) {
      throw new Error("GET /current still returned Maya");
    }
    if (board.currentCampaignId !== FRESH_ID) {
      throw new Error(`GET /current returned ${board.currentCampaignId}, expected ${FRESH_ID}`);
    }
    if (!/Make Me a Flyer/i.test(board.text) || /Maya’s Mobile Boutique|Maya's Mobile Boutique/i.test(board.text)) {
      throw new Error("Board still shows Maya’s Mobile Boutique as the current project");
    }
    if (/Good (morning|afternoon|evening), Maya/i.test(board.greeting) || /^Maya$/i.test(board.name.trim())) {
      throw new Error(`Greeting still names Maya: ${board.greeting} ${board.name}`);
    }
    if (board.currentSandbox !== true) {
      throw new Error("Fresh campaign is not sandbox-paid");
    }
    if (!String(board.currentCheckoutSessionId || "").startsWith("cs_sandbox_2577b971")) {
      throw new Error("Sandbox payment session is not the Sep 12 Customer-One payment");
    }

    report.afterMaya = await hashMayaFile();
    if (report.afterMaya.sha256 !== beforeMaya.sha256) {
      throw new Error("Maya envelope changed during real Customer-One Board proof");
    }
    if (report.afterMaya.freeze?.renderVersion !== 16) {
      throw new Error("Maya freeze version changed");
    }

    report.ok = true;
  } finally {
    await writeFile(
      path.join(OUT, "board-real-samsung-customer-one-bind-qa.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }

  if (!report.ok) {
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, proofs: report.proofs, current: report.current }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
