/**
 * Builder QA — Samsung Create Account + Project Claim.
 * One test account. Does not claim the Owner's Samsung confirmation campaign.
 * Does not remint Maya. Does not merge. Does not push.
 *
 * Usage: node scripts/mobile-create-account-claim-qa.mjs
 * Requires HTTPS Studio on localhost:3000.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.STUDIO_PROOF_ORIGIN ?? "https://localhost:3000";
const MAYA_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const OWNER_SAMSUNG_CAMPAIGN_ID = "9c6c25f2-2562-4192-97a5-44536e45cd18";
const HARBOR_ID = "c0a47f01-a518-4a26-ad4c-150347039368";
const MAYA_SHA =
  "3b19cfe722511f6358602b5635f0e65a7df4f2ab209a9cffdeba436da84983e3";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);
const CAMPAIGNS = path.join(process.cwd(), "data", "campaigns");
const USERS = path.join(process.cwd(), "data", "studio-users.json");

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function sha256File(file) {
  const buf = await readFile(file);
  return createHash("sha256").update(buf).digest("hex");
}

async function envelopeOf(id) {
  try {
    return await readJson(path.join(CAMPAIGNS, `${id}.json`));
  } catch {
    return null;
  }
}

async function pointerDown(locator) {
  const handle = await locator.elementHandle();
  if (!handle) throw new Error("No element for pointerdown");
  await handle.evaluate((el) => {
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerType: "touch",
        pointerId: 1,
      }),
    );
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = {
    ok: false,
    origin: BASE,
    checks: {},
    proofs: [],
    pageErrors: [],
    rootCause: {
      samsungSignUpGetsWithoutPost:
        "Owner Samsung confirmation loaded /sign-up four times with no POST /api/auth/signup.",
      playwrightSignupThenReadDenied:
        "Harbor signup 200 then GET /api/campaigns/{id} 403 campaign_read_denied because claim required emailVerifiedAt while Resend is parked.",
    },
  };

  const harbor = await envelopeOf(HARBOR_ID);
  const ownerCampaign = await envelopeOf(OWNER_SAMSUNG_CAMPAIGN_ID);
  const mayaBefore = await sha256File(path.join(CAMPAIGNS, `${MAYA_ID}.json`));
  report.harborBefore = {
    found: Boolean(harbor),
    clientUserId: harbor?.clientUserId ?? null,
    paid: Boolean(harbor?.record?.paymentReceivedAt),
    intake: Boolean(harbor?.record?.routeMapIntakeSubmittedAt),
  };
  report.ownerSamsungBefore = {
    found: Boolean(ownerCampaign),
    clientUserId: ownerCampaign?.clientUserId ?? null,
  };
  report.mayaBefore = mayaBefore;
  report.checks.harborUnowned = Boolean(harbor) && !harbor.clientUserId;
  report.checks.ownerSamsungLeftUnowned = !ownerCampaign?.clientUserId;
  report.checks.mayaShaBefore = mayaBefore === MAYA_SHA;

  if (!harbor?.record) {
    report.error = "Harbor QA campaign missing on disk.";
    await writeFile(
      path.join(OUT, "create-account-claim-qa.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    process.exit(1);
  }
  if (harbor.clientUserId) {
    report.error = "Harbor already owned — refusing to mint another account.";
    await writeFile(
      path.join(OUT, "create-account-claim-qa.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    process.exit(1);
  }

  const stamp = Date.now();
  const email = `samsung.claim.${stamp}@local.dev`;
  const password = "SamsungClaim-pass-1!";
  const displayName = "Samsung Claim";
  report.account = { email, displayName };

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
  page.on("pageerror", (error) =>
    report.pageErrors.push(String(error).slice(0, 400)),
  );

  try {
    await page.addInitScript(({ campaign }) => {
      localStorage.setItem(
        "studio-squishy:current-campaign",
        JSON.stringify(campaign),
      );
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    }, { campaign: harbor.record });

    await page.goto(`${BASE}/account-handoff?from=/studio-board`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForSelector("#account-handoff-title", { timeout: 15000 });
    await page.waitForSelector('[data-account-handoff="create-account"]', {
      timeout: 15000,
    });
    report.proofs.push(await shot(page, "create-account-claim-01-handoff.png"));

    const createAccount = page.locator('[data-account-handoff="create-account"]');
    await pointerDown(createAccount);
    try {
      await page.waitForURL(/\/sign-up/, { timeout: 4000 });
    } catch {
      await createAccount.click();
      await page.waitForURL(/\/sign-up/, { timeout: 15000 });
    }
    await page.waitForSelector("#sign-up-title", { timeout: 10000 });
    await page.waitForSelector("[data-signup-submit]", { timeout: 15000 });
    report.proofs.push(await shot(page, "create-account-claim-02-form.png"));

    await page.getByLabel("Your name").fill(displayName);
    await page.getByLabel("Email").fill(email);
    await page.locator(".utility-password__input").fill(password);
    await page.waitForTimeout(200);

    const submit = page.locator("[data-signup-submit]");
    await submit.scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "create-account-claim-03-filled.png"));

    const signupPost = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/signup") &&
        response.request().method() === "POST",
      { timeout: 20000 },
    );
    await pointerDown(submit);
    const signupResponse = await signupPost;
    report.signupStatus = signupResponse.status();
    report.signupBody = await signupResponse.json().catch(() => ({}));
    report.checks.signupPosted = signupResponse.ok();
    if (!signupResponse.ok()) {
      throw new Error(
        `signup ${signupResponse.status()} ${JSON.stringify(report.signupBody)}`,
      );
    }
    const claimResponse = await page.waitForResponse(
      (response) =>
        response.url().includes("/api/campaigns/claim") &&
        response.request().method() === "POST",
      { timeout: 20000 },
    );
    report.claimStatus = claimResponse.status();
    report.claimBody = await claimResponse.json().catch(() => ({}));
    report.checks.claimPosted = claimResponse.ok();

    await page.waitForURL(/\/studio-board/, { timeout: 20000 });
    await page.waitForTimeout(1500);
    report.proofs.push(await shot(page, "create-account-claim-04-board.png"));
    report.boardUrl = page.url();
    report.checks.openedBoard = /\/studio-board/.test(page.url());

    const boardText = await page.locator("body").innerText();
    report.checks.boardShowsHarbor = /Harbor Print Co/i.test(boardText);
    report.checks.boardNotMaya = !/Maya’s Mobile Boutique/i.test(boardText);

    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(1500);
    report.proofs.push(await shot(page, "create-account-claim-05-refresh.png"));
    report.refreshUrl = page.url();
    report.checks.refreshStillBoard = /\/studio-board/.test(page.url());
    const refreshText = await page.locator("body").innerText();
    report.checks.refreshStillHarbor = /Harbor Print Co/i.test(refreshText);
    report.checks.refreshNotMaya = !/Maya’s Mobile Boutique/i.test(refreshText);
  } catch (error) {
    report.error = String(error);
    try {
      report.proofs.push(await shot(page, "create-account-claim-error.png"));
    } catch {
      // ignore
    }
  } finally {
    await browser.close();
  }

  const harborAfter = await envelopeOf(HARBOR_ID);
  const ownerAfter = await envelopeOf(OWNER_SAMSUNG_CAMPAIGN_ID);
  const mayaAfter = await sha256File(path.join(CAMPAIGNS, `${MAYA_ID}.json`));
  const users = await readJson(USERS);
  const created = users.find(
    (user) => String(user.email).toLowerCase() === email.toLowerCase(),
  );
  const campaignFiles = (await import("node:fs")).readdirSync(CAMPAIGNS).filter(
    (name) => name.endsWith(".json"),
  );

  report.accountId = created?.id ?? null;
  report.harborAfter = {
    clientUserId: harborAfter?.clientUserId ?? null,
    paymentSession: harborAfter?.record?.paymentTruth?.checkoutSessionId ?? null,
    intake: Boolean(harborAfter?.record?.routeMapIntakeSubmittedAt),
    dispatchStatus: harborAfter?.record?.dispatchExecution?.status ?? null,
    executionIdentityReady: Boolean(
      harborAfter?.record?.dispatchExecution?.records?.some(
        (record) => record.executionIdentityReady,
      ),
    ),
  };
  report.ownerSamsungAfter = {
    clientUserId: ownerAfter?.clientUserId ?? null,
  };
  report.mayaAfter = mayaAfter;
  report.checks.oneNewAccount = Boolean(created);
  report.checks.clientUserIdBound = created?.id
    ? harborAfter?.clientUserId === created.id
    : false;
  report.checks.userListsHarbor = Boolean(
    created?.clientCampaignIds?.includes(HARBOR_ID),
  );
  report.checks.paymentStillAttached =
    harborAfter?.record?.paymentTruth?.checkoutSessionId ===
    harbor?.record?.paymentTruth?.checkoutSessionId;
  report.checks.intakeStillAttached = Boolean(
    harborAfter?.record?.routeMapIntakeSubmittedAt,
  );
  report.checks.noDuplicateHarbor =
    campaignFiles.filter((name) => name.includes(HARBOR_ID)).length === 1;
  report.checks.ownerSamsungStillUnowned = !ownerAfter?.clientUserId;
  report.checks.mayaUntouched = mayaAfter === MAYA_SHA;
  report.checks.mayaNotOnAccount = !(
    created?.clientCampaignIds ?? []
  ).includes(MAYA_ID);
  report.checks.noPageErrors = report.pageErrors.length === 0;

  const failed = Object.entries(report.checks).filter(([, value]) => !value);
  report.ok = failed.length === 0 && !report.error;
  report.failed = failed.map(([key]) => key);

  await writeFile(
    path.join(OUT, "create-account-claim-qa.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
