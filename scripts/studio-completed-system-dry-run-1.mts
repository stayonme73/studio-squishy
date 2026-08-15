/**
 * STUDIO-COMPLETED-SYSTEM-DRY-RUN-1
 * Customer-style rehearsal — Maya Brooks / Cedar & Bloom / v2-rtu-flyer.
 * Observation only. No remediation. No invented business facts.
 *
 * npx tsx scripts/studio-completed-system-dry-run-1.mts
 */
import { chromium, type Page, type BrowserContext } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync, copyFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const PORT = process.env.CERT_PORT || "3061";
const EXTERNAL_BASE = process.env.CERT_BASE_URL || "";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "dry-run-1-ephemeral-not-for-production";
const OUT = join(
  process.cwd(),
  "docs",
  "launch",
  "studio-completed-system-dry-run-1",
);
const SHOTS = join(OUT, "customer-eyes");
const VOICE_NARRATION_KEY = "studio-voice:narration-preference:v1";

mkdirSync(SHOTS, { recursive: true });

type FindingSeverity = "BLOCKER" | "IMPORTANT FRICTION" | "MINOR POLISH" | "NOTE";
type Finding = {
  severity: FindingSeverity;
  step: string;
  whatMayaSaw: string;
  evidence?: string;
};

type StepLog = {
  step: string;
  url: string;
  stage?: string | null;
  heading?: string;
  notes: string;
  shot?: string;
};

const findings: Finding[] = [];
const journey: StepLog[] = [];
const voiceAnswers: {
  question: string;
  studioResponse: string;
  truthfulFromAuthoritativeState: "YES" | "NO" | "UNFINISHED";
}[] = [];

function note(
  severity: FindingSeverity,
  step: string,
  whatMayaSaw: string,
  evidence?: string,
) {
  findings.push({ severity, step, whatMayaSaw, evidence });
  console.log(`[${severity}] ${step}: ${whatMayaSaw}`);
}

async function shot(page: Page, name: string) {
  const file = join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function pageText(page: Page) {
  return page.evaluate(() => (document.body?.innerText || "").slice(0, 6000));
}

async function logStep(page: Page, step: string, notes: string, shotName?: string) {
  const stage = await page
    .locator("[data-stage]")
    .first()
    .getAttribute("data-stage")
    .catch(() => null);
  const heading = (await page.locator("h1").first().textContent().catch(() => "")) ?? "";
  const shotPath = shotName ? await shot(page, shotName) : undefined;
  journey.push({
    step,
    url: page.url(),
    stage,
    heading: heading.trim().slice(0, 160),
    notes,
    shot: shotPath,
  });
  console.log(`STEP ${step}  stage=${stage ?? "—"}  ${page.url()}`);
}

async function waitForServer(url: string, attempts = 90) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${url}/studio-lobby`, { method: "GET" });
      if (res.ok || res.status === 200 || res.status === 304 || res.status === 404) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

let serverChild: ChildProcess | null = null;
async function startServer(): Promise<string> {
  const base = `http://127.0.0.1:${PORT}`;
  serverChild = spawn(
    "npx",
    ["next", "dev", "-H", "127.0.0.1", "-p", PORT],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SESSION_SECRET,
        NEXT_PUBLIC_SITE_URL: base,
        NEXT_PUBLIC_PAYMENT_SANDBOX: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    },
  );
  const ready = await waitForServer(base);
  if (!ready) {
    serverChild.kill();
    throw new Error(`next dev not ready on ${base}`);
  }
  return base;
}

function stopServer() {
  try {
    serverChild?.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  serverChild = null;
}

async function typeAndContinue(page: Page, text: string) {
  const field = page.locator("#studio-guide-type-field");
  if ((await field.count()) > 0) {
    await field.click({ timeout: 8000 });
    await field.fill(text);
  } else {
    const any = page.getByPlaceholder(/type|name|working|business|date|answer|ask/i).first();
    await any.click({ timeout: 8000 });
    await any.fill(text);
  }
  const continueBtn = page.getByRole("button", { name: /^Continue$/i }).first();
  if ((await continueBtn.count()) > 0) {
    await continueBtn.click();
  } else {
    await page.getByRole("button", { name: /Looks good|Yes, this is correct/i }).first().click();
  }
  await page.waitForTimeout(900);
}

async function askStudio(page: Page, question: string) {
  const ask = page.getByPlaceholder(/Ask a question or tell the Studio/i);
  if ((await ask.count()) === 0) {
    voiceAnswers.push({
      question,
      studioResponse: "(no Ask field visible)",
      truthfulFromAuthoritativeState: "UNFINISHED",
    });
    return;
  }
  await ask.fill(question);
  await page.getByRole("button", { name: /^Send$/i }).click().catch(async () => {
    await ask.press("Enter");
  });
  await page.waitForTimeout(1500);
  const body = await pageText(page);
  voiceAnswers.push({
    question,
    studioResponse: body.slice(0, 800),
    truthfulFromAuthoritativeState: "UNFINISHED",
  });
}

const MAYA_NEED =
  "I need a promotional flyer for my Back-to-School Reset service. I want it to feel calm, polished, organized, and welcoming. I don't want it to look childish or overly busy. The main goal is to get people to book the service.";

const MUST_INCLUDE = [
  "Cedar & Bloom Home Organizing",
  "Back-to-School Reset",
  "2-hour home organization session",
  "$149",
  "August 24 through September 14, 2026",
  "Includes: one 2-hour organizing session; organization of one selected household area; simple organization plan for maintaining the space.",
  "Customers may choose: pantry, entryway, children's homework area, closet, or home office.",
  "(804) 555-0186",
  "cedarandbloom.example",
  "Book Your Reset",
].join("\n");

const STYLE_NOTE =
  "Style: warm, clean, calm, uncluttered. Soft neutral atmosphere with subtle botanical influence. Do not use childish school graphics, cartoon pencils, school buses, loud primary colors, or cluttered layouts. No logo. No photos. No social handles. No testimonials. No discount. No guarantee. Do not state a service area.";

async function main() {
  const base = EXTERNAL_BASE || (await startServer());
  const ownsServer = !EXTERNAL_BASE;
  if (EXTERNAL_BASE) {
    const ready = await waitForServer(EXTERNAL_BASE, 30);
    if (!ready) throw new Error(`No server at ${EXTERNAL_BASE}`);
  }
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.addInitScript((key) => {
    try {
      sessionStorage.setItem(key, "off");
    } catch {
      /* ignore */
    }
  }, VOICE_NARRATION_KEY);

  // --- Lobby ---
  await page.goto(`${base}/studio-lobby`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForTimeout(800);
  await logStep(page, "01-lobby", "First-time Maya arrives at Studio Lobby.", "01-lobby");
  const lobbyText = await pageText(page);
  if (!/LET.?S GET STARTED/i.test(lobbyText) && (await page.getByRole("link", { name: /LET.?S GET STARTED/i }).count()) === 0) {
    note("BLOCKER", "Lobby", "Maya cannot see a clear start action.", lobbyText.slice(0, 400));
  }

  const start = page.getByRole("link", { name: /LET.?S GET STARTED/i }).first();
  if ((await start.count()) > 0) {
    await Promise.all([
      page.waitForURL(/studio-conversation-room|lobby-entry/i, { timeout: 20_000 }),
      start.click(),
    ]).catch(async (err) => {
      note("BLOCKER", "Lobby", `Start click did not enter Conversation Room: ${String(err).slice(0, 200)}`);
    });
    if (/lobby-entry/i.test(page.url())) {
      await page.waitForURL(/studio-conversation-room/i, { timeout: 20_000 }).catch(() => null);
    }
  } else {
    await page.goto(`${base}/studio-conversation-room`, { waitUntil: "domcontentloaded" });
    note("IMPORTANT FRICTION", "Lobby", "Start CTA missing; Scout had to navigate to Conversation Room directly.");
  }
  await page.waitForTimeout(1200);
  await logStep(page, "02-conversation-room", "Entered Conversation Room.", "02-conversation-entry");

  // --- Opening guide ---
  await typeAndContinue(page, "Maya");
  await logStep(page, "03-name", "Told Studio to call her Maya.", "03-name");

  await typeAndContinue(page, MAYA_NEED);
  await logStep(page, "04-need", "Gave exact flyer request.", "04-need");

  await typeAndContinue(page, "Cedar & Bloom Home Organizing");
  await logStep(page, "05-business", "Gave business name.", "05-business");

  // Deadline: offer window starts Aug 24, 2026 — Maya needs the flyer before then.
  const specific = page.getByRole("button", { name: /I have a specific date/i });
  if ((await specific.count()) > 0) {
    await specific.click();
    await page.waitForTimeout(400);
  }
  await typeAndContinue(page, "August 23, 2026");
  await logStep(
    page,
    "06-deadline",
    "Requested flyer before the offer starts (August 23, 2026).",
    "06-deadline",
  );

  const nothing = page.getByRole("button", { name: /^Nothing yet$/i });
  if ((await nothing.count()) > 0) {
    await nothing.click();
    await page.waitForTimeout(300);
  }
  await typeAndContinue(
    page,
    "No logo supplied. No customer images. No social handles. No testimonials.",
  );
  await logStep(page, "07-materials", "Honest: no logo or photos.", "07-materials");

  const looksGood = page.getByRole("button", { name: /Looks good|Yes, this is correct/i }).first();
  if ((await looksGood.count()) > 0) {
    await looksGood.click();
    await page.waitForTimeout(1200);
  }
  await logStep(page, "08-summary", "Confirmed opening answers.", "08-summary");

  // --- Route ---
  await page.waitForTimeout(1500);
  const continueRoute = page.getByRole("button", { name: /Continue with/i }).first();
  if ((await continueRoute.count()) > 0) {
    const label = (await continueRoute.textContent()) ?? "";
    await continueRoute.click();
    await logStep(page, "09-route", `Confirmed suggested route: ${label}`, "09-route");
    if (!/I-?20|Momentum|marketing/i.test(label)) {
      note(
        "IMPORTANT FRICTION",
        "Route",
        `Maya asked for a flyer; suggested route button was “${label.trim()}”.`,
      );
    }
  } else {
    const i20 = page.getByRole("button", { name: /I-?20|Momentum/i }).first();
    if ((await i20.count()) > 0) {
      await i20.click();
      await logStep(page, "09-route", "Chose I-20 / marketing route by tapping a lane.", "09-route");
    } else {
      note("BLOCKER", "Route", "Maya could not find a route to continue.", await pageText(page));
      await logStep(page, "09-route-stuck", "No route CTA.", "09-route-stuck");
    }
  }

  // --- Services ---
  await page.waitForTimeout(1500);
  const openServices = page.getByRole("button", { name: /Open service list/i });
  if ((await openServices.count()) > 0) {
    await openServices.click();
    await page.waitForTimeout(600);
  }
  const flyerCard = page.getByText(/Make Me a Flyer/i).first();
  if ((await flyerCard.count()) > 0) {
    await flyerCard.click().catch(() => null);
  }
  const addFlyer = page.getByRole("button", { name: /\+ Add to Project/i }).first();
  if ((await addFlyer.count()) === 0) {
    // click flyer heading then add
    const anyAdd = page.getByRole("button", { name: /Add to Project/i });
    if ((await anyAdd.count()) > 0) {
      // Prefer the flyer: find nearest to Make Me a Flyer
      await page
        .locator("text=Make Me a Flyer")
        .first()
        .locator("xpath=ancestor::*[.//button][1]")
        .getByRole("button", { name: /Add to Project/i })
        .click()
        .catch(async () => {
          await anyAdd.first().click();
        });
    } else {
      note("BLOCKER", "Services", "No Add to Project control visible.", await pageText(page));
    }
  } else {
    await addFlyer.click();
  }
  await page.waitForTimeout(800);
  await logStep(page, "10-services", "Attempted to add Make Me a Flyer only.", "10-services");

  const reviewPlan = page.getByRole("button", { name: /Review Studio Plan/i });
  if ((await reviewPlan.count()) > 0) {
    await reviewPlan.click();
    await page.waitForTimeout(1000);
  }
  await logStep(page, "11-plan", "Studio Plan review.", "11-plan");
  const planText = await pageText(page);
  if (!/Make Me a Flyer/i.test(planText)) {
    note("BLOCKER", "Studio Plan", "Flyer is not visible on the Studio Plan.", planText.slice(0, 500));
  }
  if (/\bKitchen\b|\bMachine\b|\bQA\b|dispatch|SKU/i.test(planText)) {
    note(
      "IMPORTANT FRICTION",
      "Studio Plan",
      "Maya may be seeing internal production jargon on a customer plan screen.",
    );
  }

  const toCheckout = page.getByRole("button", { name: /Continue to Checkout/i });
  if ((await toCheckout.count()) > 0) {
    await toCheckout.click();
    await page.waitForTimeout(1200);
  }
  await logStep(page, "12-checkout", "Checkout / Review and Confirm.", "12-checkout");
  const checkoutText = await pageText(page);
  if (/Kitchen|Machine|renderer/i.test(checkoutText)) {
    note("MINOR POLISH", "Checkout", "Internal terms visible at checkout.");
  }

  const showPay = page.getByRole("button", { name: /Show payment form/i });
  if ((await showPay.count()) > 0) {
    await showPay.click();
    await page.waitForTimeout(600);
    await logStep(page, "12b-payment-form", "Opened payment panel.", "12b-payment-form");
  }

  const complete = page.getByRole("button", { name: /Complete Checkout/i });
  const sandbox = page.getByRole("button", { name: /Test continue to Project Intake/i });
  let paymentPath: "stripe-hosted" | "sandbox-fixture" | "failed" = "failed";

  if ((await complete.count()) > 0) {
    const before = page.url();
    await complete.click().catch(() => null);
    await page.waitForTimeout(2500);
    if (/checkout\.stripe\.com/i.test(page.url()) || page.url() !== before) {
      paymentPath = "stripe-hosted";
      await logStep(page, "13-stripe", `Maya reached hosted checkout: ${page.url()}`, "13-stripe");
      // Stripe test fill if hosted Checkout is present
      const email = page.locator("input[type=email], input[name=email]").first();
      if ((await email.count()) > 0) {
        await email.fill("maya.brooks.dryrun@example.com").catch(() => null);
      }
      note(
        "NOTE",
        "Payment",
        "Complete Checkout opened (or attempted) Stripe hosted Checkout — customer path.",
      );
    }
  }

  if (paymentPath !== "stripe-hosted") {
    if ((await sandbox.count()) > 0) {
      note(
        "IMPORTANT FRICTION",
        "Payment",
        "Maya’s Complete Checkout did not complete Stripe hosted payment. Scout used the developer sandbox continue (allowed payment mechanic, not customer Stripe proof).",
      );
      await sandbox.click();
      paymentPath = "sandbox-fixture";
      await page.waitForTimeout(2000);
    } else {
      // Developer query param as last-resort payment mechanic
      note(
        "IMPORTANT FRICTION",
        "Payment",
        "No Stripe completion and no customer sandbox CTA. Scout appended studioPaymentSandbox=1 (developer fixture) so the rest of the sealed spine can be observed.",
      );
      const u = new URL(page.url());
      u.searchParams.set("studioPaymentSandbox", "1");
      await page.goto(u.toString(), { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
      const showPay2 = page.getByRole("button", { name: /Show payment form/i });
      if ((await showPay2.count()) > 0) await showPay2.click();
      const sandbox2 = page.getByRole("button", { name: /Test continue to Project Intake|sandbox/i });
      if ((await sandbox2.count()) > 0) {
        await sandbox2.click();
        paymentPath = "sandbox-fixture";
        await page.waitForTimeout(2000);
      }
    }
  }
  await logStep(page, "13-paid", `Payment path=${paymentPath}`, "13-paid");

  // --- Intake ---
  await page.waitForTimeout(1500);
  const continueIntake = page.getByRole("button", { name: /Continue intake/i });
  if ((await continueIntake.count()) > 0) {
    await continueIntake.click();
    await page.waitForTimeout(800);
  }
  await logStep(page, "14-intake-open", "Project Intake opened.", "14-intake");

  // Fill flyer intake fields by label
  async function fillByLabel(re: RegExp, value: string) {
    const loc = page.getByLabel(re).first();
    if ((await loc.count()) > 0) {
      await loc.fill(value);
      return true;
    }
    return false;
  }
  await fillByLabel(/What is this flyer for/i, MAYA_NEED);
  await fillByLabel(/Exact text, offer details/i, `${MUST_INCLUDE}\n\n${STYLE_NOTE}`);
  await fillByLabel(/Logo, photos, colors/i, "I do not have a logo or photos. I have no files to provide.");
  const useSelect = page.getByLabel(/Intended use/i);
  if ((await useSelect.count()) > 0) {
    await useSelect.selectOption({ label: "Both print and digital" }).catch(async () => {
      await useSelect.selectOption("Both print and digital").catch(() => null);
    });
  }
  await fillByLabel(/Required flyer size/i, "");
  await fillByLabel(/required wording or disclosures/i, "");
  await logStep(page, "15-intake-filled", "Maya filled flyer intake with supplied facts only.", "15-intake-filled");

  const saveAccount = page.getByRole("button", {
    name: /SAVE & CONTINUE TO YOUR ACCOUNT|SAVE & CONTINUE TO STUDIO BOARD|Continue to Studio Board/i,
  });
  if ((await saveAccount.count()) > 0) {
    await saveAccount.click();
    await page.waitForTimeout(2000);
  } else {
    note("IMPORTANT FRICTION", "Intake", "Could not find Save & Continue after filling intake.");
  }
  await logStep(page, "16-after-intake", "After intake submit.", "16-after-intake");

  // Account / claim
  if (/sign-up|sign-in|account-handoff|verify-email/i.test(page.url())) {
    await logStep(page, "17-auth", `Landed on auth: ${page.url()}`, "17-auth");
    if (/sign-up|account/i.test(page.url()) || (await page.getByRole("link", { name: /Create account/i }).count()) > 0) {
      const create = page.getByRole("link", { name: /Create account/i }).first();
      if ((await create.count()) > 0) await create.click();
      await page.waitForTimeout(800);
    }
    await page.getByLabel(/email/i).first().fill("maya.brooks.dryrun@example.com").catch(async () => {
      await page.locator("input[type=email], input[name=email]").first().fill("maya.brooks.dryrun@example.com");
    });
    await page.getByLabel(/password/i).first().fill("MayaBrooks-DryRun-0815!").catch(async () => {
      await page.locator("input[type=password]").first().fill("MayaBrooks-DryRun-0815!");
    });
    const nameField = page.getByLabel(/name/i).first();
    if ((await nameField.count()) > 0) await nameField.fill("Maya Brooks");
    const submit = page.getByRole("button", { name: /Create|Sign up|Continue/i }).first();
    if ((await submit.count()) > 0) await submit.click();
    await page.waitForTimeout(2000);
    await logStep(page, "18-signup", "Attempted account create.", "18-signup");
  }

  // Board
  if (!/studio-board/i.test(page.url())) {
    const boardLink = page.getByRole("link", { name: /Studio Board/i }).first();
    if ((await boardLink.count()) > 0) {
      await boardLink.click();
      await page.waitForTimeout(1500);
    } else {
      await page.goto(`${base}/studio-board`, { waitUntil: "domcontentloaded" });
      note("IMPORTANT FRICTION", "Board", "Maya had to be taken to Studio Board; no obvious customer control.");
    }
  }
  await logStep(page, "19-board", "Studio Board.", "19-board");
  const boardText = await pageText(page);
  if (/Kitchen|Machine|dispatch|File Room/i.test(boardText)) {
    note("IMPORTANT FRICTION", "Board", "Internal jargon visible on Studio Board.");
  }
  if (/Sign in is required|auth-required/i.test(boardText)) {
    note("IMPORTANT FRICTION", "Board", "Board asked Maya to sign in after purchase.");
  }

  // Voice questions from Board / Conversation Room
  for (const q of [
    "Did my payment go through?",
    "Do you need anything else from me?",
    "Has anyone started working on my project?",
    "What is the status of my flyer?",
    "When will I be able to review it?",
    "Can I make changes after I see it?",
    "Where do I go to see my finished file?",
  ]) {
    await askStudio(page, q);
  }
  await logStep(page, "20-voice", "Asked seven customer status questions.", "20-voice");

  // Customer Review / Delivery
  for (const dest of ["/feedback-studio", "/deliverables"] as const) {
    await page.goto(`${base}${dest}`, { waitUntil: "domcontentloaded" }).catch(() => null);
    await page.waitForTimeout(800);
    await logStep(page, `21-${dest.slice(1)}`, `Visited ${dest}`, `21-${dest.replace("/", "")}`);
    const t = await pageText(page);
    if (/not found|coming soon|unavailable/i.test(t)) {
      note("NOTE", dest, `Surface did not show a finished customer review/delivery: ${t.slice(0, 240)}`);
    }
  }

  // Leave and return (fresh context) — claim continuity
  const campaignId = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem("studio-squishy:current-campaign");
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { campaignId?: string };
      return parsed.campaignId ?? null;
    } catch {
      return null;
    }
  });
  await context.close();
  const device2: BrowserContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page2 = await device2.newPage();
  await page2.goto(`${base}/studio-board`, { waitUntil: "domcontentloaded" });
  await page2.waitForTimeout(1000);
  await shot(page2, "22-return-new-context");
  const returnText = await page2.evaluate(() => (document.body?.innerText || "").slice(0, 2000));
  journey.push({
    step: "22-new-device-board",
    url: page2.url(),
    notes: `Fresh context Board. campaignId from device A=${campaignId}. Text=${returnText.slice(0, 400)}`,
    shot: join(SHOTS, "22-return-new-context.png"),
  });
  if (/Sign in/i.test(returnText)) {
    note(
      "NOTE",
      "Continuity",
      "New browser requires sign-in (expected). Claim path exists; verify email still needed for a brand-new account.",
    );
  }

  await device2.close();
  await browser.close();

  // Inspect server artifacts for this campaign
  const campaignsDir = join(process.cwd(), "data", "campaigns");
  const artifactsRoot = join(process.cwd(), "data", "campaign-design-artifacts");
  let campaignFile: string | null = null;
  let campaignJson: Record<string, unknown> | null = null;
  if (existsSync(campaignsDir)) {
    const files = readdirSync(campaignsDir).filter((f) => f.endsWith(".json"));
    // pick newest matching cedar/bloom or latest mtime later — inspect all recent
    for (const f of files.reverse()) {
      try {
        const raw = JSON.parse(
          readFileSync(join(campaignsDir, f), "utf8"),
        ) as { record?: { campaignName?: string; campaignId?: string } };
        const name = raw.record?.campaignName ?? "";
        if (/Cedar|Bloom|Maya/i.test(name) || (campaignId && f.startsWith(campaignId))) {
          campaignFile = join(campaignsDir, f);
          campaignJson = raw as Record<string, unknown>;
          break;
        }
      } catch {
        /* ignore */
      }
    }
  }
  let flyerPng: string | null = null;
  let dispatchNote = "No customer design artifact found.";
  if (campaignId && existsSync(join(artifactsRoot, campaignId))) {
    const walk = (dir: string) => {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, ent.name);
        if (ent.isDirectory()) walk(p);
        else if (ent.name === "flyer.png") flyerPng = p;
      }
    };
    walk(join(artifactsRoot, campaignId));
    dispatchNote = flyerPng ? `Flyer PNG at ${flyerPng}` : "Artifact folder exists but flyer.png missing.";
  } else {
    dispatchNote =
      "No campaign-design-artifacts folder for Maya’s campaign. Machine likely did not render (logo required / QA bind unfinished).";
  }

  if (!flyerPng) {
    note(
      "BLOCKER",
      "Flyer production",
      "Maya received no flyer file. Sealed Machine flyer path requires an approved logo material; Maya supplied none. Dispatch fail-closed is honest, but the customer still has no deliverable.",
    );
  }

  const evidence = {
    packageId: "STUDIO-COMPLETED-SYSTEM-DRY-RUN-1",
    recordedAt: new Date().toISOString(),
    runId: randomUUID(),
    customer: "Maya Brooks / Cedar & Bloom Home Organizing",
    sku: "v2-rtu-flyer",
    paymentPath,
    campaignId,
    campaignFile,
    flyerPng,
    dispatchNote,
    journey,
    findings,
    voiceAnswers,
  };
  writeFileSync(join(OUT, "evidence.json"), JSON.stringify(evidence, null, 2), "utf8");
  if (flyerPng) {
    copyFileSync(flyerPng, join(OUT, "maya-flyer.png"));
  }
  console.log(JSON.stringify({ paymentPath, campaignId, flyerPng, findings: findings.length }, null, 2));
  if (ownsServer) stopServer();
}

main().catch((err) => {
  console.error(err);
  stopServer();
  process.exit(1);
});
