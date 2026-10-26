/**
 * CUSTOMER-ONE CLEAN-ROOM RESET + Samsung-width journey.
 * Wipes this run’s test/customer state only. Does not remint Maya.
 * Does not merge. Does not push. Does not Approve or open Final Delivery.
 *
 * Usage: node scripts/customer-one-clean-room-reset-and-qa.mjs
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.STUDIO_PROOF_ORIGIN ?? "https://localhost:3000";
const MAYA_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const EXPECTED_MAYA_SHA =
  "3b19cfe722511f6358602b5635f0e65a7df4f2ab209a9cffdeba436da84983e3";
const KNOWN_RUN_IDS = [
  "2577b971-d0f9-4f3f-a03c-7d73bbcbdc2b",
  "528233ee-4980-47d4-8b76-152b99c043c6",
  "3a66f9ef-1a02-421d-898f-9702b782b474",
  "7e4bbd7a-abe1-437a-aa18-b1382fc24866",
];
const CAMPAIGNS_DIR = path.join(process.cwd(), "data", "campaigns");
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const MAYA_FILE = path.join(CAMPAIGNS_DIR, `${MAYA_ID}.json`);
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

const CUSTOMER = {
  name: "Avery Quinn",
  business: "Harbor Print Co",
  email: `harbor.print.cleanroom.${Date.now()}@local.dev`,
  password: "Harbor-CleanRoom-2026!",
  purpose: "Grand opening flyer for Harbor Print Co",
  mustInclude:
    "Opening October 2026. Harbor Print Co. harborprint.example",
  wordmark:
    "No logo and no photos — please use Harbor Print Co as a wordmark.",
};

function hashMayaFile() {
  const raw = readFileSync(MAYA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return {
    sha256: createHash("sha256").update(raw).digest("hex"),
    freeze: parsed?.record?.productionFreeze ?? null,
    fileCount: readdirSync(CAMPAIGNS_DIR).filter((name) => name.endsWith(".json"))
      .length,
  };
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function isHydrationText(text) {
  return /hydrat|did not match|didn.t match|server rendered HTML|A tree hydrated/i.test(
    text,
  );
}

function dispatchSnapshot(record) {
  const observer = record?.dispatchExecution?.designRendererObserver?.results ?? [];
  return {
    status: record?.campaignStatus ?? null,
    paidAt: record?.paymentReceivedAt ?? null,
    intakeSubmittedAt: record?.routeMapIntakeSubmittedAt ?? null,
    dispatchStatus: record?.dispatchExecution?.status ?? null,
    observer: observer.map((row) => ({
      sku: row.skuId,
      action: row.action,
      ok: row.ok,
      skipReason: row.skipReason ?? null,
    })),
    invoked: observer.some((row) => row.action === "invoke" || row.action === "invoked"),
  };
}

function shouldRemoveCampaign(envelope) {
  const id = envelope.campaignId;
  if (id === MAYA_ID) return false;
  if (String(id).startsWith("pay-truth-")) return false;
  if (KNOWN_RUN_IDS.includes(id)) return true;
  if (envelope.clientUserId === "local-customer-one") return true;
  const name = String(envelope.record?.campaignName ?? "");
  if (/Sandbox Path Studio/i.test(name)) return true;
  if (/Harbor Print Co/i.test(name)) return true;
  const checkout = String(
    envelope.record?.checkoutSessionId ??
      envelope.record?.paymentTruth?.checkoutSessionId ??
      "",
  );
  if (KNOWN_RUN_IDS.some((runId) => checkout.includes(runId.slice(0, 8)))) {
    return true;
  }
  return false;
}

function removeIfExists(filePath) {
  if (existsSync(filePath)) {
    unlinkSync(filePath);
    return true;
  }
  return false;
}

function resetCustomerOneTestState() {
  const removed = {
    campaigns: [],
    materials: [],
    tasks: [],
    sessions: [],
    events: [],
    users: [],
  };
  const campaignFiles = readdirSync(CAMPAIGNS_DIR).filter((name) =>
    name.endsWith(".json"),
  );
  const removableIds = [];
  for (const file of campaignFiles) {
    const id = file.slice(0, -".json".length);
    let envelope;
    try {
      envelope = readJson(path.join(CAMPAIGNS_DIR, file));
    } catch {
      continue;
    }
    if (shouldRemoveCampaign({ ...envelope, campaignId: envelope.campaignId || id })) {
      removableIds.push(id);
    }
  }

  for (const id of removableIds) {
    if (removeIfExists(path.join(CAMPAIGNS_DIR, `${id}.json`))) {
      removed.campaigns.push(id);
    }
    if (removeIfExists(path.join(process.cwd(), "data", "campaign-materials", `${id}.json`))) {
      removed.materials.push(id);
    }
    if (removeIfExists(path.join(process.cwd(), "data", "campaign-tasks", `${id}.json`))) {
      removed.tasks.push(id);
    }
  }

  const sessionsDir = path.join(process.cwd(), "data", "payment-sessions");
  if (existsSync(sessionsDir)) {
    for (const name of readdirSync(sessionsDir)) {
      if (removableIds.some((id) => name.includes(id.slice(0, 8)))) {
        if (removeIfExists(path.join(sessionsDir, name))) removed.sessions.push(name);
      }
    }
  }
  const eventsDir = path.join(process.cwd(), "data", "payment-events");
  if (existsSync(eventsDir)) {
    for (const name of readdirSync(eventsDir)) {
      if (removableIds.some((id) => name.includes(id.slice(0, 8)))) {
        if (removeIfExists(path.join(eventsDir, name))) removed.events.push(name);
      }
    }
  }

  const users = readJson(USERS_PATH);
  const nextUsers = [];
  for (const user of users) {
    const email = String(user.email || "");
    if (
      user.id !== "local-customer-one" &&
      user.id !== "tagia" &&
      /harbor\.print\.cleanroom\.|@local\.dev$/i.test(email) &&
      /Avery Quinn/i.test(String(user.displayName || ""))
    ) {
      removed.users.push(user.id);
      continue;
    }
    if (user.id === "local-customer-one") {
      nextUsers.push({
        ...user,
        currentCampaignId: undefined,
        clientCampaignIds: (user.clientCampaignIds ?? []).filter((id) => id === MAYA_ID),
      });
      continue;
    }
    nextUsers.push(user);
  }
  writeFileSync(USERS_PATH, `${JSON.stringify(nextUsers, null, 2)}\n`);

  return { removed, removableIds };
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function waitForHydrated(page, selector) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      return Object.keys(el).some(
        (key) =>
          key.startsWith("__reactFiber") ||
          key.startsWith("__reactProps") ||
          key.startsWith("__reactInternalInstance"),
      );
    },
    selector,
    { timeout: 20000 },
  );
}

async function pointerActivate(locator) {
  await locator.first().scrollIntoViewIfNeeded().catch(() => {});
  await locator.first().click({ timeout: 8000 }).catch(async () => {
    await locator.first().tap({ force: true });
  });
}

async function chooseFillItOutMyself(page) {
  const selector = '[data-voice-choice-action="off"]';
  await page.waitForSelector(selector, { timeout: 30000 });
  await waitForHydrated(page, selector);
  const btn = page.locator(selector).first();
  await btn.focus();
  await page.keyboard.press("Enter");
  const typeField = page.locator("#studio-guide-type-field");
  try {
    await typeField.waitFor({ state: "visible", timeout: 4000 });
    return;
  } catch {
    /* Keyboard missed — hydrated pointerdown. */
  }
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "touch",
      }),
    );
  }, selector);
}

async function activateNamed(page, name) {
  const btn = page.getByRole("button", { name, exact: true }).first();
  await btn.waitFor({ state: "visible", timeout: 15000 });
  await pointerActivate(btn);
  await page.waitForTimeout(900);
}

async function chooseChip(page, label) {
  await page.waitForFunction(
    (chipLabel) =>
      Array.from(document.querySelectorAll("button")).some(
        (btn) => btn.textContent?.trim() === chipLabel,
      ),
    label,
    { timeout: 15000 },
  );
  const clicked = await page.evaluate((chipLabel) => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const el = buttons.find((btn) => btn.textContent?.trim() === chipLabel);
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "touch",
      }),
    );
    return true;
  }, label);
  if (!clicked) throw new Error(`chip not found: ${label}`);
  await page.waitForTimeout(300);
}

async function clickContinueToCheckout(page) {
  await page.waitForFunction(
    () =>
      Array.from(document.querySelectorAll("a,button")).some((el) =>
        /Continue to Checkout/i.test(el.textContent || ""),
      ),
    null,
    { timeout: 20000 },
  );
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll("a,button")).find((node) =>
      /Continue to Checkout/i.test(node.textContent || ""),
    );
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "touch",
        clientX: 180,
        clientY: 600,
      }),
    );
    el.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "touch",
        clientX: 180,
        clientY: 600,
      }),
    );
  });
}

async function walkToCheckout(page, report) {
  await page.goto(`${BASE}/studio-lobby?studioPaymentSandbox=1&lobbyEntry=reset`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.reload({ waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);
  report.lobby = await page.evaluate(() => {
    const cta = Array.from(document.querySelectorAll("a")).find((node) =>
      /GET STARTED/i.test(node.textContent || ""),
    );
    const bodyText = document.body.innerText || "";
    return {
      url: window.location.href,
      ctaHref: cta?.getAttribute("href") ?? null,
      issueBadge: /1 Issue/i.test(bodyText),
      hasCustomerOneFixture: /Continue as Customer-One/i.test(bodyText),
    };
  });
  report.proofs.push(await shot(page, "clean-room-01-lobby.png"));
  const start = page.getByRole("link", { name: /GET STARTED/i });
  await start.waitFor({ state: "visible", timeout: 15000 });
  await start.click();
  await page.waitForSelector('[data-voice-choice-action="off"]', {
    timeout: 30000,
  });
  report.steps.push("voice-choice");
  await chooseFillItOutMyself(page);
  await page.locator("#studio-guide-type-field").waitFor({
    state: "visible",
    timeout: 20000,
  });
  report.steps.push("fill-it-out-myself");
  await page.locator("#studio-guide-type-field").fill(CUSTOMER.name);
  await activateNamed(page, "Continue");
  report.steps.push("name");
  await chooseChip(page, "Social media graphics");
  await activateNamed(page, "Continue");
  report.steps.push("need");
  await page.locator("#studio-guide-type-field").fill(CUSTOMER.business);
  await activateNamed(page, "Continue");
  report.steps.push("business");
  await chooseChip(page, "Within 2 weeks");
  await activateNamed(page, "Continue");
  report.steps.push("deadline");
  await chooseChip(page, "Nothing yet");
  await activateNamed(page, "Continue");
  report.steps.push("materials");
  await page
    .getByRole("button", { name: /Yes, this is correct|Looks good/i })
    .waitFor({ timeout: 20000 });
  await pointerActivate(
    page.getByRole("button", { name: /Yes, this is correct|Looks good/i }),
  );
  report.steps.push("summary");
  const promote = page.getByRole("button", { name: /Promote Something Now/i }).first();
  await promote.waitFor({ state: "visible", timeout: 20000 });
  await pointerActivate(promote);
  const routeContinue = page.getByRole("button", { name: /Continue with/i }).first();
  await routeContinue.waitFor({ timeout: 20000 });
  await pointerActivate(routeContinue);
  report.steps.push("route");
  await page.getByText("Make Me a Flyer", { exact: true }).first().waitFor({
    timeout: 20000,
  });
  await pointerActivate(page.getByRole("button", { name: /Add to Project/i }).first());
  report.steps.push("add-flyer");
  await pointerActivate(
    page.getByRole("button", { name: /Review Studio Plan/i }).first(),
  );
  report.steps.push("plan");
  await page.waitForTimeout(1500);
  await clickContinueToCheckout(page);
  await page.waitForSelector('[data-checkout-pay="continue"]', { timeout: 25000 });
  report.steps.push("checkout");
}

async function paySandbox(page, report) {
  const continueCta = page.locator('[data-checkout-pay="continue"]').first();
  await continueCta.waitFor({ state: "visible" });
  const terms = page.locator('[data-checkout-terms="1"]').first();
  await terms.check({ force: true });
  const sandboxBtn = page
    .locator('[data-developer-fixture="sandbox-confirm"] button')
    .first();
  const sandboxVisible = await sandboxBtn.isVisible().catch(() => false);
  if (!sandboxVisible) {
    report.proofs.push(await shot(page, "clean-room-02-missing-sandbox.png"));
    throw new Error("Sandbox confirm was not visible");
  }
  report.proofs.push(await shot(page, "clean-room-02-checkout.png"));
  const confirmWait = page.waitForResponse(
    (response) =>
      response.url().includes("/api/payments/sandbox-confirm") &&
      response.request().method() === "POST",
    { timeout: 25000 },
  );
  await pointerActivate(sandboxBtn);
  const confirmResponse = await confirmWait;
  const confirmBody = await confirmResponse.json().catch(() => ({}));
  report.payment = {
    status: confirmResponse.status(),
    ok: confirmBody.ok === true,
    paid: Boolean(confirmBody.campaign?.paymentReceivedAt),
    sandbox: confirmBody.campaign?.paymentTruth?.sandbox === true,
    campaignId: confirmBody.campaign?.campaignId ?? null,
  };
  await page.waitForSelector('[data-panel="intake"]', { timeout: 25000 });
  report.steps.push("intake");
}

async function chooseIntakeChip(page, label) {
  const btn = page.getByRole("button", { name: label, exact: true }).first();
  await btn.waitFor({ state: "visible", timeout: 15000 });
  await pointerActivate(btn);
  await page.waitForTimeout(400);
}

async function fillIntake(page) {
  await page.waitForSelector('[data-panel="intake"]', { timeout: 25000 });
  const purpose = page.getByLabel(/What is this flyer for/i);
  await purpose.waitFor({ state: "visible", timeout: 20000 });
  await purpose.fill(CUSTOMER.purpose);
  await page
    .getByLabel(/Exact text, offer details|details must be included/i)
    .fill(CUSTOMER.mustInclude);
  await chooseIntakeChip(page, "I can describe what I have");
  const describe = page.getByLabel(/Describe filenames, links, colors, or references/i);
  await describe.waitFor({ state: "visible", timeout: 8000 });
  await describe.fill(CUSTOMER.wordmark);
  await chooseIntakeChip(page, "Both print and digital");
  const business = page.getByLabel(/Business name/i);
  if (await business.count()) {
    await business.fill(CUSTOMER.business);
  }
  await page.getByRole("button", { name: /SAVE DRAFT/i }).click();
  await page.waitForTimeout(800);
}

function readCampaignFromDisk(campaignId) {
  const file = path.join(CAMPAIGNS_DIR, `${campaignId}.json`);
  if (!existsSync(file)) return null;
  return readJson(file);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const mayaBefore = hashMayaFile();
  if (mayaBefore.sha256 !== EXPECTED_MAYA_SHA) {
    throw new Error(`Maya hash drifted before reset: ${mayaBefore.sha256}`);
  }
  const reset = resetCustomerOneTestState();
  const mayaAfterReset = hashMayaFile();
  if (mayaAfterReset.sha256 !== EXPECTED_MAYA_SHA) {
    throw new Error("Maya hash changed during reset");
  }

  const browser = await chromium.launch({ headless: true });
  const report = {
    ok: false,
    origin: BASE,
    customer: { name: CUSTOMER.name, business: CUSTOMER.business, email: CUSTOMER.email },
    reset,
    mayaBefore,
    mayaAfterReset,
    steps: [],
    hydrationLogs: [],
    proofs: [],
    lobby: null,
    payment: null,
    intake: {},
    board: null,
    mayaAfter: null,
  };

  const onConsole = (msg) => {
    const text = msg.text();
    if (isHydrationText(text)) {
      report.hydrationLogs.push({ type: msg.type(), text: text.slice(0, 1800) });
    }
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
    page.on("console", onConsole);

    await walkToCheckout(page, report);
    await paySandbox(page, report);
    const campaignId =
      report.payment.campaignId ||
      (await page.evaluate(() => {
        try {
          const raw = localStorage.getItem("studio-squishy:current-campaign");
          return raw ? JSON.parse(raw).campaignId : null;
        } catch {
          return null;
        }
      }));
    report.freshCampaignId = campaignId;
    if (!campaignId) throw new Error("No campaign id after sandbox pay");
    if (campaignId === MAYA_ID) throw new Error("Paid campaign is Maya");

    const beforeIntake = readCampaignFromDisk(campaignId);
    report.intake.beforeSubmit = dispatchSnapshot(beforeIntake?.record ?? beforeIntake);
    if (report.intake.beforeSubmit.invoked) {
      throw new Error("Machine dispatched before Intake submit");
    }
    if (report.intake.beforeSubmit.intakeSubmittedAt) {
      throw new Error("Intake was already submitted after payment");
    }

    await fillIntake(page);
    report.proofs.push(await shot(page, "clean-room-03-intake-saved.png"));
    report.steps.push("intake-saved");

    await page.goto(`${BASE}/studio-lobby?studioPaymentSandbox=1`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForTimeout(800);
    const reenter = page.getByRole("link", { name: /GET STARTED/i });
    await reenter.waitFor({ state: "visible", timeout: 15000 });
    await reenter.click();
    const intakeVisible = await page
      .locator('[data-panel="intake"]')
      .waitFor({ state: "visible", timeout: 25000 })
      .then(() => true)
      .catch(() => false);
    if (!intakeVisible) {
      report.intake.reenter = {
        url: page.url(),
        voiceChoice: await page.locator('[data-voice-choice-action="off"]').count(),
        text: await page.evaluate(() =>
          (document.body.innerText || "").replace(/\s+/g, " ").slice(0, 500),
        ),
      };
      report.proofs.push(await shot(page, "clean-room-04-intake-reenter-fail.png"));
      throw new Error(
        `Intake did not recover after leave/re-enter: ${JSON.stringify(report.intake.reenter)}`,
      );
    }
    const recoveredPurpose = await page
      .getByLabel(/What is this flyer for/i)
      .inputValue();
    if (!/Harbor Print Co/i.test(recoveredPurpose)) {
      throw new Error(`Intake did not recover after leave/re-enter: ${recoveredPurpose}`);
    }
    report.intake.recoveredPurpose = recoveredPurpose;
    report.steps.push("intake-reentered");
    report.proofs.push(await shot(page, "clean-room-04-intake-reenter.png"));

    const submit = page.getByRole("button", {
      name: /SAVE & CONTINUE TO (YOUR ACCOUNT|STUDIO BOARD)/i,
    });
    await submit.waitFor({ state: "visible", timeout: 15000 });
    await pointerActivate(submit);
    await page.waitForURL(/account-handoff|studio-board|sign-up/i, {
      timeout: 25000,
    });
    report.steps.push("intake-submitted");
    await page.waitForTimeout(600);
    const afterSubmit = readCampaignFromDisk(campaignId);
    report.intake.afterSubmit = dispatchSnapshot(afterSubmit?.record ?? afterSubmit);
    if (!report.intake.afterSubmit.intakeSubmittedAt) {
      throw new Error("Intake submit did not stamp routeMapIntakeSubmittedAt");
    }

    if (/account-handoff/i.test(page.url())) {
      report.proofs.push(await shot(page, "clean-room-05-account-handoff.png"));
      await page.getByRole("link", { name: /^Create Account$/i }).click();
      await page.waitForURL(/\/sign-up/i, { timeout: 15000 });
      await page.getByLabel(/^Your name$/i).fill(CUSTOMER.name);
      await page.getByLabel(/^Email$/i).fill(CUSTOMER.email);
      await page.locator('input[type="password"]').fill(CUSTOMER.password);
      await page.getByRole("button", { name: /^Create account$/i }).click();
    }

    await page.waitForURL(/\/studio-board/i, { timeout: 25000 });
    await page.waitForSelector(".sb-header-v3, [data-board], .sb-next-action", {
      timeout: 25000,
    });
    await page.waitForTimeout(1800);
    report.proofs.push(await shot(page, "clean-room-06-board.png"));
    report.board = await page.evaluate(
      ({ mayaId, business, name }) => {
        const text = document.body.innerText.replace(/\s+/g, " ");
        const local = (() => {
          try {
            return JSON.parse(localStorage.getItem("studio-squishy:current-campaign") || "null");
          } catch {
            return null;
          }
        })();
        return {
          url: window.location.href,
          localCampaignId: local?.campaignId ?? null,
          campaignName: local?.campaignName ?? null,
          status: local?.campaignStatus ?? null,
          paidAt: local?.paymentReceivedAt ?? null,
          sandbox: local?.paymentTruth?.sandbox === true,
          textHasMayaBoutique: /Maya.?s Mobile Boutique/i.test(text),
          textHasJordan: /\bJordan\b/.test(text),
          textHasAvery: new RegExp(name, "i").test(text),
          textHasHarbor: new RegExp(business, "i").test(text),
          hasCompleteIntake: /Complete Project Intake/i.test(text),
          issueBadge: /1 Issue/i.test(text),
          deadLoading: /Loading\.\.\.|Loading forever/i.test(text),
          currentIsMaya: local?.campaignId === mayaId,
        };
      },
      { mayaId: MAYA_ID, business: CUSTOMER.business, name: CUSTOMER.name },
    );
    report.steps.push("board");

    const disk = readCampaignFromDisk(campaignId);
    report.board.disk = {
      campaignId: disk?.campaignId ?? null,
      clientUserId: disk?.clientUserId ?? null,
      name: disk?.record?.campaignName ?? null,
      ...dispatchSnapshot(disk?.record ?? disk),
    };

    if (report.board.currentIsMaya || report.board.textHasMayaBoutique) {
      throw new Error("Board still shows Maya contamination");
    }
    if (report.board.localCampaignId !== campaignId) {
      throw new Error(`Board bound ${report.board.localCampaignId}, expected ${campaignId}`);
    }
    if (report.lobby.issueBadge || report.board.issueBadge || report.hydrationLogs.length) {
      throw new Error("Hydration issue still present");
    }
    if (report.intake.beforeSubmit.invoked) {
      throw new Error("Machine dispatched before Intake");
    }
    if (report.board.hasCompleteIntake) {
      throw new Error("Board still asks to Complete Project Intake after submit");
    }

    report.mayaAfter = hashMayaFile();
    report.ok =
      report.mayaAfter.sha256 === EXPECTED_MAYA_SHA &&
      report.payment.ok &&
      report.payment.sandbox &&
      report.freshCampaignId !== MAYA_ID &&
      Boolean(report.intake.afterSubmit.intakeSubmittedAt) &&
      report.board.localCampaignId === campaignId;

    if (!report.ok) throw new Error("Clean-room path did not fully pass");
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    report.ok = false;
  } finally {
    await writeFile(
      path.join(OUT, "customer-one-clean-room-qa.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
    await browser.close();
  }

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
