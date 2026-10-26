/**
 * Lobby hydration mismatch — Samsung hard-refresh case.
 * Does not remint Maya. Does not merge. Does not push.
 *
 * Usage: node scripts/lobby-hydration-mismatch-qa.mjs
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.STUDIO_PROOF_ORIGIN ?? "https://localhost:3000";
const MAYA_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const FRESH_ID = "2577b971-d0f9-4f3f-a03c-7d73bbcbdc2b";
const EXPECTED_MAYA_SHA =
  "3b19cfe722511f6358602b5635f0e65a7df4f2ab209a9cffdeba436da84983e3";
const MAYA_FILE = path.join(process.cwd(), "data", "campaigns", `${MAYA_ID}.json`);
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

function isHydrationText(text) {
  return /hydrat|did not match|didn.t match|server rendered HTML|A tree hydrated/i.test(
    text,
  );
}

async function hashMayaFile() {
  const raw = await readFile(MAYA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return {
    sha256: createHash("sha256").update(raw).digest("hex"),
    freeze: parsed?.record?.productionFreeze ?? null,
  };
}

async function probeLobby(page, url, { hardRefresh }) {
  const logs = [];
  const onConsole = (msg) => {
    const text = msg.text();
    if (isHydrationText(text)) {
      logs.push({ type: msg.type(), text: text.slice(0, 2500) });
    }
  };
  const onPageError = (error) => {
    if (isHydrationText(String(error))) {
      logs.push({ type: "pageerror", text: String(error).slice(0, 1500) });
    }
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  if (hardRefresh) {
    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  }
  await page.waitForTimeout(1800);

  const surface = await page.evaluate(() => {
    const cta = document.querySelector(".lobby-entry-film__cta");
    const bodyText = document.body.innerText || "";
    const portal = document.querySelector("nextjs-portal");
    return {
      url: window.location.href,
      ctaHref: cta?.getAttribute("href") ?? null,
      ctaText: cta?.textContent?.trim() ?? null,
      issueBadge: /1 Issue/i.test(bodyText) || /1 Issue/i.test(portal?.textContent ?? ""),
      hydrationOverlay: /hydrat|didn.t match|server rendered/i.test(
        `${bodyText}\n${portal?.textContent ?? ""}`,
      ),
    };
  });

  page.off("console", onConsole);
  page.off("pageerror", onPageError);
  return { ...surface, logs };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const mayaBefore = await hashMayaFile();
  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    origin: BASE,
    mayaBefore,
    cases: {},
    beginNew: null,
    customerOne: null,
    mayaAfter: null,
  };

  try {
    const phone = {
      ignoreHTTPSErrors: true,
      viewport: { width: 360, height: 780 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: "en-US",
    };

    const sessionCtx = await browser.newContext(phone);
    await sessionCtx.addInitScript(() => {
      sessionStorage.setItem("studio-payment:sandbox-opt-in:v1", "1");
    });
    const sessionPage = await sessionCtx.newPage();
    report.cases.sessionHardRefresh = await probeLobby(
      sessionPage,
      `${BASE}/studio-lobby`,
      { hardRefresh: true },
    );

    const urlCtx = await browser.newContext(phone);
    const urlPage = await urlCtx.newPage();
    report.cases.urlSandbox = await probeLobby(
      urlPage,
      `${BASE}/studio-lobby?studioPaymentSandbox=1`,
      { hardRefresh: true },
    );

    const cleanCtx = await browser.newContext(phone);
    const cleanPage = await cleanCtx.newPage();
    report.cases.clean = await probeLobby(cleanPage, `${BASE}/studio-lobby`, {
      hardRefresh: true,
    });

    const cta = sessionPage.getByRole("link", { name: /GET STARTED/i });
    await cta.waitFor({ state: "visible", timeout: 15000 });
    await cta.click();
    await sessionPage.waitForURL(/studio-conversation-room/, { timeout: 25000 });
    await sessionPage.waitForTimeout(800);
    report.beginNew = {
      href: report.cases.sessionHardRefresh.ctaHref,
      landed: sessionPage.url(),
      hasSandbox: /studioPaymentSandbox=1/.test(sessionPage.url()),
    };

    const login = await sessionCtx.request.post(`${BASE}/api/auth/local-customer-one`, {
      data: {},
    });
    const loginBody = await login.json().catch(() => ({}));
    if (!login.ok()) {
      throw new Error(`Customer-One login failed: ${JSON.stringify(loginBody)}`);
    }
    const current = await sessionCtx.request.get(`${BASE}/api/campaigns/current`);
    const currentBody = await current.json().catch(() => ({}));
    const currentId =
      currentBody?.campaign?.campaignId ??
      currentBody?.campaignId ??
      currentBody?.record?.campaignId ??
      null;
    report.customerOne = {
      loginOk: login.ok(),
      currentStatus: current.status(),
      currentId,
      isMaya: currentId === MAYA_ID,
      isFresh: currentId === FRESH_ID,
    };

    report.mayaAfter = await hashMayaFile();
    report.cases.urlSandbox.issueBadge ||= false;
    report.ok =
      report.cases.sessionHardRefresh.logs.length === 0 &&
      !report.cases.sessionHardRefresh.issueBadge &&
      !report.cases.sessionHardRefresh.hydrationOverlay &&
      report.cases.urlSandbox.logs.length === 0 &&
      !report.cases.urlSandbox.issueBadge &&
      report.cases.clean.logs.length === 0 &&
      !report.cases.clean.issueBadge &&
      /studioPaymentSandbox=1/.test(String(report.cases.sessionHardRefresh.ctaHref || "")) &&
      report.beginNew.hasSandbox === true &&
      report.customerOne.isMaya === false &&
      report.mayaAfter.sha256 === mayaBefore.sha256 &&
      report.mayaAfter.sha256 === EXPECTED_MAYA_SHA;

    if (!report.ok) {
      throw new Error(
        `Lobby hydration QA failed: ${JSON.stringify(
          {
            sessionLogs: report.cases.sessionHardRefresh.logs.length,
            issueBadge: report.cases.sessionHardRefresh.issueBadge,
            ctaHref: report.cases.sessionHardRefresh.ctaHref,
            beginNew: report.beginNew,
            customerOne: report.customerOne,
            mayaChanged: report.mayaAfter.sha256 !== mayaBefore.sha256,
          },
          null,
          2,
        )}`,
      );
    }
  } finally {
    await writeFile(
      path.join(OUT, "lobby-hydration-mismatch-qa.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    await browser.close();
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
