/**
 * Builder QA — real Samsung Board mismatch: unpaid current vs paid Maya flyer.
 * Hits the same HTTPS LAN server the phone uses. Does not replay Payment/Intake.
 * Does not create another Maya account.
 *
 * Usage: node scripts/mobile-samsung-board-state-qa.mjs
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const LAN = "https://10.1.10.208:3000";
const UNPAID_ID = "76d184e1-3d4a-4c95-aad4-dff20902edca";
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

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

function readPaidFile() {
  const envelope = JSON.parse(
    readFileSync(path.join(process.cwd(), "data", "campaigns", `${PAID_ID}.json`), "utf8"),
  );
  return {
    campaignId: envelope.campaignId,
    clientUserId: envelope.clientUserId ?? null,
    paidAt: envelope.record?.paymentReceivedAt ?? null,
    payTruth: envelope.record?.paymentTruth?.status ?? null,
    intakeAt: envelope.record?.routeMapIntakeSubmittedAt ?? null,
    materialsAnswer:
      envelope.record?.routeMapIntake?.answers?.["shared:materials"] ?? null,
    status: envelope.record?.campaignStatus ?? null,
    name: envelope.record?.campaignName ?? null,
  };
}

async function addSessionCookie(context, origin, token) {
  await context.addCookies([
    {
      name: "studio_session",
      value: token,
      url: origin,
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

async function getCurrent(request, origin) {
  const response = await request.get(`${origin}/api/campaigns/current`);
  const body = await response.json().catch(() => ({}));
  const record = body.campaign?.record ?? null;
  return {
    origin,
    status: response.status(),
    campaignId: record?.campaignId ?? null,
    paidAt: record?.paymentReceivedAt ?? null,
    intakeAt: record?.routeMapIntakeSubmittedAt ?? null,
    statusLabel: record?.campaignStatus ?? null,
    name: record?.campaignName ?? null,
  };
}

function inspectBoard() {
  const campaignRaw = localStorage.getItem("studio-squishy:current-campaign");
  const campaign = campaignRaw ? JSON.parse(campaignRaw) : null;
  const text = document.body?.innerText ?? "";
  return {
    url: location.href,
    campaignId: campaign?.campaignId ?? null,
    paidAt: campaign?.paymentReceivedAt ?? null,
    intakeAt: campaign?.routeMapIntakeSubmittedAt ?? null,
    hasPaidInFull: /Paid in Full/i.test(text),
    hasPaymentPending: /Payment Pending/i.test(text),
    hasFixtureEyebrow: /LOCAL DEVELOPER TEST/i.test(text),
    hasFixtureButton: /Save Studio fixture file/i.test(text),
    hasMaterialsCaughtUp: /Materials caught up/i.test(text),
    hasAddMore: /Add more \(optional\)/i.test(text),
    hasIntakeGateCopy: /Material requests will appear here after you complete Project Intake/i.test(
      text,
    ),
    paymentReceivedComplete: /Payment Received[\s\S]{0,40}Complete/i.test(text),
    intakeComplete: /Project Intake[\s\S]{0,40}Complete/i.test(text),
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { ok: false, checks: {}, proofs: [], pageErrors: [] };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
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
    report.checks.fixtureLogin = Boolean(login.ok() && loginBody?.user?.id);
    const token = mintSessionCookie(loginBody.user, UNPAID_ID);
    await addSessionCookie(context, BASE, token);
    await addSessionCookie(context, LAN, token);

    report.localhostCurrent = await getCurrent(context.request, BASE);
    report.lanCurrent = await getCurrent(context.request, LAN);
    report.checks.sameServerCampaign =
      report.localhostCurrent.campaignId === PAID_ID &&
      report.lanCurrent.campaignId === PAID_ID;
    report.checks.apiPaid =
      Boolean(report.localhostCurrent.paidAt) && Boolean(report.lanCurrent.paidAt);
    report.checks.apiIntake =
      Boolean(report.localhostCurrent.intakeAt) && Boolean(report.lanCurrent.intakeAt);
    report.checks.notUnpaidCurrent =
      report.localhostCurrent.campaignId !== UNPAID_ID &&
      report.lanCurrent.campaignId !== UNPAID_ID;

    report.diskAfterGet = readPaidFile();
    report.checks.diskPaid = Boolean(report.diskAfterGet.paidAt);
    report.checks.diskPayTruthConfirmed = report.diskAfterGet.payTruth === "confirmed";
    report.checks.diskIntake = Boolean(report.diskAfterGet.intakeAt);
    report.checks.diskMaterialsNoneYet =
      report.diskAfterGet.materialsAnswer === "I do not have this yet";

    const unpaidSeed = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "data", "campaigns", `${UNPAID_ID}.json`),
        "utf8",
      ),
    ).record;
    await page.addInitScript((record) => {
      localStorage.setItem("studio-squishy:current-campaign", JSON.stringify(record));
    }, unpaidSeed);

    await page.goto(`${LAN}/studio-board`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("heading", { name: "Studio Board" }).waitFor({ timeout: 20000 });
    await page.getByText("Paid in Full", { exact: false }).waitFor({ timeout: 20000 });
    await page.getByRole("link", { name: "Save Studio fixture file" }).waitFor({
      timeout: 10000,
    });
    report.board = await page.evaluate(inspectBoard);
    report.checks.boardPaidInFull = report.board.hasPaidInFull === true;
    report.checks.boardNotPaymentPending = report.board.hasPaymentPending === false;
    report.checks.boardFixtureVisible =
      report.board.hasFixtureEyebrow === true && report.board.hasFixtureButton === true;
    report.checks.boardHydratedPaidId = report.board.campaignId === PAID_ID;
    report.checks.boardHydratedPaidAt = Boolean(report.board.paidAt);
    report.checks.boardHydratedIntake = Boolean(report.board.intakeAt);
    report.checks.boardMaterialsOptional =
      report.board.hasMaterialsCaughtUp === true && report.board.hasAddMore === true;
    report.checks.boardNotIntakeGate = report.board.hasIntakeGateCopy === false;
    report.proofs.push(await shot(page, "samsung-board-state-01-lan.png"));

    await page.reload({ waitUntil: "networkidle", timeout: 60000 });
    await page.getByText("Paid in Full", { exact: false }).waitFor({ timeout: 20000 });
    await page.getByRole("link", { name: "Save Studio fixture file" }).waitFor({
      timeout: 10000,
    });
    report.boardRefresh = await page.evaluate(inspectBoard);
    report.checks.refreshStillPaid = report.boardRefresh.hasPaidInFull === true;
    report.checks.refreshStillPaidId = report.boardRefresh.campaignId === PAID_ID;
    report.checks.refreshStillIntake = Boolean(report.boardRefresh.intakeAt);
    report.checks.refreshFixtureVisible = report.boardRefresh.hasFixtureButton === true;
    report.proofs.push(await shot(page, "samsung-board-state-02-refresh.png"));

    const failed = Object.entries(report.checks).filter(([, value]) => value !== true);
    report.ok = failed.length === 0 && report.pageErrors.length === 0;
    report.failed = failed.map(([key]) => key);
  } catch (error) {
    report.ok = false;
    report.error = String(error);
    try {
      report.proofs.push(await shot(page, "samsung-board-state-error.png"));
    } catch {
      /* ignore */
    }
  } finally {
    await writeFile(
      path.join(OUT, "samsung-board-state-report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    await browser.close();
  }

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
