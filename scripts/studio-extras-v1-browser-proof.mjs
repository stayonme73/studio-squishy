/**
 * Studio Extras V1 — headless phone (390) + laptop (1440) proof.
 * Stripe test mode only. Usage: node scripts/studio-extras-v1-browser-proof.mjs <phase>
 *   phase "pre"  — builder, Review & Pay, Help, Voice (no payment)
 *   phase "pay"  — one Stripe test-mode purchase
 *   phase "board…" — Studio Board extras panel for the saved session
 *   phase "post" — post-payment intake, waiting, review, revision, delivery
 *                 on the already-paid project (does not charge again)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const BASE = process.env.PROOF_BASE ?? "http://localhost:3000";
const OUT = path.join("docs", "launch", "studio-extras-v1-build-1", "proof");
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  phone: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } },
  laptop: { viewport: { width: 1440, height: 900 } },
};

const DRAFT_KEY = "studioCondensedJourneyDraft.v1";
/** Holds the signed-in session cookie. Kept outside the repo and never printed. */
const SESSION_FILE = path.join(process.env.TEMP ?? "/tmp", "studio-extras-proof-session.json");

function seededDraft(packageId) {
  return {
    version: 1,
    packageId,
    aboutYou: { name: "Extras Proof", email: "clip-cert@local.dev", company: "Ana's Bakery" },
    aboutProject: {
      purpose: "Fall pie preorders open October 15.",
      context: "Neighborhood bakery, weekend rush.",
      cta: "Order at anasbakery.com or call 555-123-4567",
      facts: "Apple and pecan pies, $28 each, pickup only.",
      assets: "One recorded talk about our fall pies.",
      rights: true,
      qualifyingSource: true,
      intelligible: true,
      markedMoments: true,
      usableFootage: true,
    },
    upload: { materials: "One recorded talk, about 12 minutes." },
    preferences: { mustKeep: "", mustNotInclude: "", studioDecide: true },
    support: {},
    completedSections: ["about-you", "about-project", "upload", "preferences"],
  };
}

/** Horizontal scroll, off-screen controls, overlapping controls, and controls covered by sticky/fixed layers. */
async function layoutAudit(page, scopeSel) {
  return page.evaluate(async (scopeSel) => {
    const scope = scopeSel ? document.querySelector(scopeSel) : document.body;
    if (!scope) return { error: `scope not found: ${scopeSel}` };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const name = (el) => `${el.tagName.toLowerCase()}:${(el.innerText || el.getAttribute("aria-label") || el.getAttribute("name") || "").trim().slice(0, 40)}`;
    const controls = [...scope.querySelectorAll("button, a[href], input, textarea, select")].filter(visible);
    const horizontalScroll = document.documentElement.scrollWidth > window.innerWidth + 1;
    const offscreen = controls
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.left < -1 || r.right > window.innerWidth + 1;
      })
      .map(name);
    const overlaps = [];
    for (let i = 0; i < controls.length; i += 1) {
      for (let j = i + 1; j < controls.length; j += 1) {
        const a = controls[i];
        const b = controls[j];
        if (a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const x = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const y = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (x > 2 && y > 2) overlaps.push(`${name(a)} × ${name(b)}`);
      }
    }
    const covered = [];
    const tooSmall = [];
    for (const el of controls) {
      el.scrollIntoView({ block: "center", inline: "nearest" });
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
      if (hit && !el.contains(hit) && !hit.contains(el) && !(el.labels && [...el.labels].some((l) => l.contains(hit)))) {
        covered.push(`${name(el)} under ${name(hit)}`);
      }
      if (window.innerWidth <= 480 && el.tagName === "BUTTON" && (r.height < 32 || r.width < 32)) tooSmall.push(name(el));
    }
    window.scrollTo(0, 0);
    return { horizontalScroll, controls: controls.length, offscreen, overlaps, covered, tooSmall };
  }, scopeSel);
}

function clean(audit) {
  return (
    !audit.error &&
    !audit.horizontalScroll &&
    audit.offscreen.length === 0 &&
    audit.overlaps.length === 0 &&
    audit.covered.length === 0 &&
    audit.tooSmall.length === 0
  );
}

async function shot(page, label, el) {
  const file = path.join(OUT, `${label}.png`);
  if (el) await el.screenshot({ path: file });
  else await page.screenshot({ path: file, fullPage: true });
  return file.replaceAll("\\", "/");
}

async function seed(page, packageId) {
  await page.goto(`${BASE}/project-builder`, { waitUntil: "domcontentloaded" });
  await page.evaluate(([key, draft]) => sessionStorage.setItem(key, JSON.stringify(draft)), [DRAFT_KEY, seededDraft(packageId)]);
  await page.goto(`${BASE}/project-builder?package=${packageId}`, { waitUntil: "networkidle" });
}

async function openExtras(page) {
  const section = page.locator('[data-builder-section="support"]');
  await section.waitFor();
  const toggle = section.locator("button[aria-expanded]");
  // The builder opens the first incomplete section on load.
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await section.locator(".studio-journey__support-row").first().waitFor();
  return section;
}

async function rowLabels(section) {
  return section.locator(".studio-journey__support-row > div:first-child > p:first-child").allInnerTexts();
}

async function prePhase(device) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(VIEWPORTS[device]);
  const page = await context.newPage();
  const result = { device, steps: {} };

  // Clip — eligibility, promise, limit, Skip.
  await seed(page, "clip_repurposing");
  let section = await openExtras(page);
  result.steps.clipEligible = await rowLabels(section);
  result.steps.clipPromise = await section.locator(".studio-journey__included-list p").allInnerTexts();
  result.steps.skipButtonVisible = await section.locator("[data-builder-extras-skip]").isVisible();
  result.steps.clipOpenShot = await shot(page, `${device}-01-builder-extras-open`, section);
  result.steps.clipOpenAudit = await layoutAudit(page, '[data-builder-section="support"]');

  await section.locator('button[data-support-id="flyer"]', { hasText: "Add" }).click();
  await section.locator('button[data-support-id="ad_creative"]', { hasText: "Add" }).click();
  const addStates = {};
  for (const id of ["review_request_kit", "email_and_text", "ad_creative", "flyer"]) {
    const add = section.locator(`button[data-support-id="${id}"]`, { hasText: "Add" });
    addStates[id] = {
      disabled: await add.isDisabled(),
      selected: await add.getAttribute("data-selected"),
      describedBy: await add.getAttribute("aria-describedby"),
      look: await add.evaluate((el) => {
        const s = getComputedStyle(el);
        return { opacity: s.opacity, cursor: s.cursor };
      }),
    };
  }
  await section.locator('button[data-support-id="email_and_text"]', { hasText: "Add" }).scrollIntoViewIfNeeded();
  result.steps.clipLimitViewportShot = await page
    .screenshot({ path: path.join(OUT, `${device}-02b-builder-extras-limit-viewport.png`) })
    .then(() => path.join(OUT, `${device}-02b-builder-extras-limit-viewport.png`).replaceAll("\\", "/"));
  result.steps.addStatesAtLimit = addStates;
  result.steps.limitMessage = await section.locator("#builder-extras-limit").innerText();
  result.steps.skipButtonAfterSelect = await section.locator("[data-builder-extras-skip]").count();
  result.steps.clipLimitShot = await shot(page, `${device}-02-builder-extras-two-selected`, section);
  result.steps.clipLimitAudit = await layoutAudit(page, '[data-builder-section="support"]');

  await section.getByRole("button", { name: /save and continue/i }).click();
  result.steps.summaryAfterSave = await section.locator("p").first().innerText();
  await page.locator('[data-builder-cta="review"]').click();
  await page.waitForURL(/\/checkout/, { timeout: 120000 });
  await page.waitForLoadState("networkidle");
  const extrasCard = page.locator("[data-review-extras]");
  await extrasCard.waitFor({ timeout: 60000 });
  result.steps.reviewExtras = await extrasCard.innerText();
  result.steps.reviewPriceText = await page.locator("body").innerText().then((t) => (t.match(/\$\d[\d,.]*/g) ?? []).slice(0, 6));
  result.steps.reviewShot = await shot(page, `${device}-03-review-and-pay`);
  result.steps.reviewAudit = await layoutAudit(page, null);

  // Social — Ad Creative never offered; Menu / Price List offered.
  await seed(page, "social_and_promo_graphics");
  section = await openExtras(page);
  result.steps.socialEligible = await rowLabels(section);
  result.steps.socialShot = await shot(page, `${device}-04-builder-extras-social`, section);
  result.steps.socialAudit = await layoutAudit(page, '[data-builder-section="support"]');
  await section.locator("[data-builder-extras-skip]").click();
  result.steps.socialSkipChoices = await section
    .locator('button[data-selected="true"]')
    .allInnerTexts();

  // Help Center — same promise.
  await page.goto(`${BASE}/help-center`, { waitUntil: "networkidle" });
  const faq = page.getByText("WHAT ARE THE CURRENT PACKAGES?", { exact: false }).first();
  await faq.scrollIntoViewIfNeeded();
  await faq.click().catch(() => {});
  await page.waitForTimeout(400);
  const helpText = await page.locator("body").innerText();
  result.steps.help = {
    whatYouCanAdd: helpText.includes("On Build Your Project you can add up to two Studio Extras, or skip them."),
    promise: helpText.includes("applies a Courtesy Adjustment of 5% of what you paid for one Extra, or 10% for two."),
    thankYouSeparate: helpText.includes("The Courtesy Adjustment is separate from the Studio Thank-You."),
    revisions: helpText.includes("There is no separate count for Extras."),
    noLocalAi: !/AI \+ Local Visibility(?! is not offered)/.test(helpText),
  };
  result.steps.helpShot = await shot(page, `${device}-05-help-center`);
  result.steps.helpAudit = await layoutAudit(page, null);

  // Studio Voice — same endpoint the Conversation Room asks.
  const questions = [
    "What Studio Extras can I add?",
    "Do Studio Extras cost extra?",
    "Do changes to studio extras use a revision round?",
    "What if an Extra cannot be completed?",
    "Can I add AI and local visibility?",
  ];
  result.steps.voice = {};
  for (const question of questions) {
    const answer = await page.evaluate(async (q) => {
      const res = await fetch("/api/studio-customer-life/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const json = await res.json();
      return json.answer?.text ?? json.text ?? JSON.stringify(json).slice(0, 300);
    }, question);
    result.steps.voice[question] = answer;
  }

  await browser.close();
  return result;
}

/** One Stripe test-mode purchase: Clip + Flyer + Review Request Kit, as the local clip-cert fixture. */
async function payPhase() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(VIEWPORTS.phone);
  const page = await context.newPage();
  const out = { steps: {} };
  const signIn = await context.request.post(`${BASE}/api/auth/local-clip-cert`);
  out.steps.signIn = signIn.status();
  await seed(page, "clip_repurposing");
  const section = await openExtras(page);
  await section.locator('button[data-support-id="flyer"]', { hasText: "Add" }).click();
  await section.locator('button[data-support-id="review_request_kit"]', { hasText: "Add" }).click();
  await section.getByRole("button", { name: /save and continue/i }).click();
  await page.locator('[data-builder-cta="review"]').click();
  await page.waitForURL(/\/checkout/, { timeout: 120000 });
  await page.locator("[data-review-extras]").waitFor({ timeout: 60000 });
  out.steps.reviewExtras = await page.locator("[data-review-extras]").innerText();
  await page.locator('input[type="checkbox"]').last().check();
  await page.getByRole("button", { name: /continue to secure checkout/i }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 120000 });
  out.steps.stripeHost = new URL(page.url()).host;
  const stripeText = await page.locator("body").innerText();
  out.steps.stripeTestMode = /TEST MODE|Sandbox/.test(stripeText) || page.url().includes("cs_test_");
  out.steps.stripeAmount = (stripeText.match(/\$\d[\d,.]*/) ?? [null])[0];
  await page.waitForLoadState("networkidle");
  out.steps.stripeShot = await shot(page, "phone-06-stripe-test-checkout");
  if (!out.steps.stripeTestMode) throw new Error("Refusing to pay: Stripe page is not in test mode.");
  const email = page.locator("#email");
  if (await email.isVisible().catch(() => false)) await email.fill("clip-cert@local.dev");
  const cardTab = page.locator('[data-testid="card-accordion-item-button"]');
  await cardTab.waitFor({ state: "attached", timeout: 30000 });
  await cardTab.dispatchEvent("click");
  await page.locator("#cardNumber").waitFor({ timeout: 30000 });
  await page.locator("#cardNumber").fill("4242 4242 4242 4242");
  await page.locator("#cardExpiry").fill("12 / 34");
  await page.locator("#cardCvc").fill("123");
  const name = page.locator("#billingName");
  if (await name.isVisible().catch(() => false)) await name.fill("Extras Proof");
  const zip = page.locator("#billingPostalCode");
  if (await zip.isVisible().catch(() => false)) await zip.fill("30303");
  const saveInfo = page.locator("#enableStripePass");
  if ((await saveInfo.count()) > 0 && (await saveInfo.isChecked())) await saveInfo.uncheck({ force: true });
  await shot(page, "phone-06b-stripe-filled");
  await page.locator('button[type="submit"]').first().click();
  try {
    await page.waitForURL((url) => url.host.startsWith("localhost"), { timeout: 90000 });
  } catch (error) {
    await shot(page, "phone-06c-stripe-after-submit");
    throw error;
  }
  await page.waitForLoadState("load");
  await page.waitForTimeout(8000);
  await context.storageState({ path: SESSION_FILE });
  out.steps.returnUrl = page.url().replace(/session_id=[^&]+/, "session_id=<redacted>");
  out.steps.returnShot = await shot(page, "phone-07-after-payment");
  out.steps.campaignId = await page.evaluate(() => {
    const raw = sessionStorage.getItem("studioCondensedJourneyDraft.v1");
    return raw ? JSON.parse(raw).checkoutCampaignId ?? null : null;
  });
  await browser.close();
  return out;
}

/** Read the customer's Extras panel exactly as rendered. */
async function readPanel(page, scope) {
  return scope.locator("[data-studio-extra]").evaluateAll((items) =>
    items.map((el) => ({
      id: el.getAttribute("data-studio-extra"),
      state: el.getAttribute("data-studio-extra-state"),
      status: el.querySelector(".sx-extra__status")?.textContent?.trim() ?? "",
      waitingOn: [...el.querySelectorAll(".sx-extra__waiting li, .sx-extra__waiting p")].map((n) => n.textContent.trim()).filter(Boolean),
      files: [...el.querySelectorAll(".sx-file__label")].map((n) => n.textContent.trim()),
      actions: [...el.querySelectorAll(".sx-extra__actions button")].map((n) => n.textContent.trim()),
    })),
  );
}

/** Studio Board Extras panel on both widths, same signed-in project. */
async function boardPhase(tag) {
  const out = {};
  for (const device of ["phone", "laptop"]) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ ...VIEWPORTS[device], storageState: SESSION_FILE });
    const page = await context.newPage();
    await page.goto(`${BASE}/studio-board`, { waitUntil: "load", timeout: 240000 });
    const panel = page.locator('[data-studio-extras-placement="board"]');
    await panel.waitFor({ timeout: 240000 });
    await panel.locator("[data-studio-extra]").first().waitFor({ timeout: 60000 });
    await panel.scrollIntoViewIfNeeded();
    out[device] = {
      extras: await readPanel(page, panel),
      lead: await panel.locator(".sx-panel__lead").allInnerTexts(),
      courtesy: await panel.locator(".sx-panel__courtesy").allInnerTexts(),
      shot: await shot(page, `${device}-${tag}-board-extras`, panel),
      audit: await layoutAudit(page, '[data-studio-extras-placement="board"]'),
      pageAudit: await layoutAudit(page, null).then((a) => ({ horizontalScroll: a.horizontalScroll })),
    };
    await browser.close();
  }
  out.verdict = {
    sameTruth: JSON.stringify(out.phone.extras) === JSON.stringify(out.laptop.extras),
    layoutPhone: clean(out.phone.audit) && !out.phone.pageAudit.horizontalScroll,
    layoutLaptop: clean(out.laptop.audit) && !out.laptop.pageAudit.horizontalScroll,
  };
  return out;
}

const PAID_CAMPAIGN = "b9ac06e7-6887-461e-93b4-dd38cdabfedf";
const CLIP_JOB = `${PAID_CAMPAIGN}:v2-rtu-clip-repurposing`;

function wordingScan(text) {
  return {
    localAi: /AI \+ Local Visibility|Local AI Visibility|ai_local_visibility/i.test(text),
    prices: [...new Set(text.match(/\$\d[\d,.]*/g) ?? [])].slice(0, 12),
    includedNoExtraCharge: text.includes("included with your package at no additional charge") || text.includes("Included at no additional charge"),
    waitingOnYou: text.includes("Waiting on you"),
    courtesy: text.includes("Courtesy Adjustment"),
  };
}

async function signedPage(device) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(VIEWPORTS[device]);
  const signIn = await context.request.post(`${BASE}/api/auth/local-clip-cert`);
  const page = await context.newPage();
  return { browser, context, page, signIn: signIn.status() };
}

async function extrasApi(context) {
  const res = await context.request.get(`${BASE}/api/campaigns/${PAID_CAMPAIGN}/studio-extras`);
  const json = await res.json().catch(() => ({}));
  return { status: res.status(), view: json.studioExtras ?? null };
}

async function captureSurface(page, device, tag, scopeSel) {
  const scope = scopeSel ? page.locator(scopeSel).first() : null;
  const visible = scope ? await scope.isVisible().catch(() => false) : false;
  return {
    shot: await shot(page, `${device}-${tag}`, visible ? scope : null),
    audit: scopeSel && visible ? await layoutAudit(page, scopeSel) : null,
    horizontalScroll: (await layoutAudit(page, null)).horizontalScroll,
    wording: wordingScan(await page.locator("body").innerText()),
  };
}

async function openBoard(page) {
  await page.goto(`${BASE}/studio-board`, { waitUntil: "load", timeout: 240000 });
  const panel = page.locator('[data-studio-extras-placement="board"]');
  await panel.waitFor({ timeout: 120000 });
  await panel.locator("[data-studio-extra]").first().waitFor({ timeout: 60000 });
  return panel;
}

/** Fill any still-empty required Project Intake answers, then continue. */
async function completeIntake(page) {
  await page.goto(
    `${BASE}/studio-conversation-room?stage=intake&campaignId=${PAID_CAMPAIGN}`,
    { waitUntil: "load", timeout: 180000 },
  );
  const cont = page.locator("[data-intake-action='continue']");
  const present = (await cont.count()) > 0;
  if (!present) {
    return { present: false, url: page.url(), heading: (await page.locator("body").innerText()).slice(0, 500) };
  }
  await cont.waitFor({ timeout: 60000 });
  const cards = page.locator("article.route-map-social-intake__card");
  const count = await cards.count();
  for (let i = 0; i < count; i += 1) {
    const card = cards.nth(i);
    const text = await card.innerText();
    if (!text.includes("Required")) continue;
    if ((await card.locator('[data-selected="true"]').count()) === 0) {
      const chips = card.locator("button[data-selected]");
      const labels = await chips.allInnerTexts();
      let pick = labels.findIndex((label) => /permission from everyone/i.test(label));
      if (pick < 0) pick = labels.findIndex((label) => /describe what I have/i.test(label));
      if (pick < 0 && labels.length > 0) pick = 0;
      if (pick >= 0) await chips.nth(pick).click();
    }
    const area = card.locator("textarea");
    if ((await area.count()) > 0 && !(await area.first().inputValue()).trim()) {
      await area.first().fill("One recorded talk about our fall pies, about 12 minutes, filmed vertically in English.");
    }
  }
  const disabled = await cont.isDisabled();
  let after = page.url();
  if (!disabled) {
    await cont.click();
    await page.waitForLoadState("load", { timeout: 180000 }).catch(() => {});
    await page.waitForTimeout(4000);
    after = page.url();
  }
  const hint = await page.locator("#intake-continue-hint").innerText().catch(() => "");
  return { present: true, continueDisabled: disabled, url: after, hint };
}

async function submitNamedExtra(page, pattern, fill) {
  const item = page.locator(".sb-materials-intake__item").filter({ hasText: pattern }).first();
  if ((await item.count()) === 0) return { found: false, pattern: String(pattern) };
  const prompt = await item.locator(".sb-materials-intake__prompt").innerText();
  const submit = item.locator(".sb-materials-intake__submit");
  if ((await submit.count()) === 0) return { found: true, prompt, submitted: false, reason: "no submit" };
  await fill(item);
  await submit.click();
  const success = item.locator(".sb-materials-intake__success");
  const error = page.locator(".sb-materials-intake__error");
  await Promise.race([
    success.waitFor({ timeout: 240000 }),
    error.waitFor({ timeout: 240000 }),
  ]).catch(() => {});
  return {
    found: true,
    prompt,
    submitted: await success.isVisible().catch(() => false),
    error: (await error.innerText().catch(() => "")) || null,
  };
}

async function readBoard(device, tag) {
  const session = await signedPage(device);
  const page = session.page;
  const panel = await openBoard(page);
  const api = await extrasApi(session.context);
  const captured = await captureSurface(page, device, tag, '[data-studio-extras-placement="board"]');
  const materials = page.locator(".sb-card--materials");
  const materialText = (await materials.count()) ? await materials.first().innerText() : "";
  const out = {
    signIn: session.signIn,
    extras: await readPanel(page, panel),
    lead: await panel.locator(".sx-panel__lead").allInnerTexts(),
    courtesy: await panel.locator(".sx-panel__courtesy").allInnerTexts(),
    apiStates: (api.view?.extras ?? []).map((extra) => ({ id: extra.id, state: extra.state, status: extra.statusLine })),
    materialPrompts: materialText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /review link|text your customers|logo|recording|flyer|offer/i.test(line))
      .slice(0, 20),
    materialShot: (await materials.count())
      ? await shot(page, `${device}-${tag}-materials`, materials.first())
      : null,
    ...captured,
    materialsAudit: (await materials.count()) ? await layoutAudit(page, ".sb-card--materials") : null,
  };
  await session.browser.close();
  return out;
}

async function postPhase() {
  const out = { campaignId: PAID_CAMPAIGN, steps: {} };
  const intakeShots = {};
  for (const device of ["phone", "laptop"]) {
    const session = await signedPage(device);
    await session.page.goto(
      `${BASE}/studio-conversation-room?stage=intake&campaignId=${PAID_CAMPAIGN}`,
      { waitUntil: "load", timeout: 180000 },
    );
    await session.page.waitForTimeout(2500);
    const form = session.page.locator("[data-intake-action='continue']");
    intakeShots[device] = {
      signIn: session.signIn,
      formPresent: (await form.count()) > 0,
      continueDisabled: (await form.count()) ? await form.isDisabled() : null,
      shot: await shot(session.page, `${device}-08-post-payment-intake`),
      audit: (await form.count()) ? await layoutAudit(session.page, "form") : await layoutAudit(session.page, null),
      wording: wordingScan(await session.page.locator("body").innerText()),
    };
    await session.browser.close();
  }
  out.steps.intakeBefore = intakeShots;

  const intakeActor = await signedPage("phone");
  out.steps.intakeSubmit = await completeIntake(intakeActor.page);
  out.steps.intakeAfterShot = await shot(intakeActor.page, "phone-09-intake-after-continue");
  await intakeActor.browser.close();

  out.steps.boardWaiting = {
    phone: await readBoard("phone", "10-board-waiting"),
    laptop: await readBoard("laptop", "10-board-waiting"),
  };

  const supplier = await signedPage("phone");
  await openBoard(supplier.page);
  out.steps.reviewLink = await submitNamedExtra(supplier.page, /review link/i, async (item) => {
    await item.locator('input[type="url"]').fill("https://g.page/r/anas-bakery/review");
  });
  await supplier.page.reload({ waitUntil: "load", timeout: 180000 });
  await openBoard(supplier.page);
  out.steps.textConsent = await submitNamedExtra(supplier.page, /text your customers/i, async (item) => {
    await item.locator("textarea").first().fill(
      "The people I will text have agreed to receive text messages from Ana's Bakery.",
    );
  });
  await supplier.browser.close();

  out.steps.boardAfterInput = {
    phone: await readBoard("phone", "11-board-after-input"),
    laptop: await readBoard("laptop", "11-board-after-input"),
  };

  const reviewShots = {};
  for (const device of ["phone", "laptop"]) {
    const session = await signedPage(device);
    await session.page.goto(`${BASE}/feedback-studio?jobId=${encodeURIComponent(CLIP_JOB)}`, {
      waitUntil: "load",
      timeout: 180000,
    });
    await session.page.waitForTimeout(3000);
    const panel = session.page.locator('[data-studio-extras-placement="review"]');
    reviewShots[device] = {
      url: session.page.url(),
      extras: (await panel.count()) ? await readPanel(session.page, panel) : [],
      panelPresent: (await panel.count()) > 0,
      bodyExcerpt: (await session.page.locator("body").innerText()).slice(0, 1200),
      shot: await shot(session.page, `${device}-12-review`),
      audit: (await panel.count()) ? await layoutAudit(session.page, '[data-studio-extras-placement="review"]') : null,
      horizontalScroll: (await layoutAudit(session.page, null)).horizontalScroll,
      wording: wordingScan(await session.page.locator("body").innerText()),
    };
    await session.browser.close();
  }
  out.steps.review = reviewShots;

  const reviser = await signedPage("phone");
  await openBoard(reviser.page);
  const kit = reviser.page.locator('[data-studio-extra="review_request_kit"]');
  const change = kit.getByRole("button", { name: "Request a change" });
  if (await change.isVisible().catch(() => false)) {
    await change.click();
    await kit.locator("textarea").fill("Please mention weekend pickup.");
    await kit.getByRole("button", { name: "Send this change" }).click();
    await reviser.page.waitForTimeout(2000);
    out.steps.revisionSent = await readPanel(reviser.page, reviser.page.locator('[data-studio-extras-placement="board"]'));
    out.steps.revisionShot = await shot(reviser.page, "phone-13-revision-sent", kit);
  } else {
    out.steps.revisionSent = { available: false, state: await kit.getAttribute("data-studio-extra-state") };
  }
  await reviser.browser.close();

  if (out.steps.revisionSent?.available === false) {
    out.steps.revisionAfter = null;
  } else {
    const watcher = await signedPage("phone");
    const started = Date.now();
    let latest = null;
    while (Date.now() - started < 180000) {
      latest = await extrasApi(watcher.context);
      const record = latest.view?.extras?.find((extra) => extra.id === "review_request_kit");
      if (record && record.state !== "revision_requested" && record.state !== "in_production" && record.state !== "waiting_on_system") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
    await watcher.browser.close();
    out.steps.revisionAfter = latest;
    out.steps.revisionBoard = await readBoard("phone", "14-board-revision");
  }

  const approver = await signedPage("phone");
  await openBoard(approver.page);
  const approveKit = approver.page.locator('[data-studio-extra="review_request_kit"]');
  const approve = approveKit.getByRole("button", { name: "Approve" });
  if (await approve.isVisible().catch(() => false)) {
    await approve.click();
    await approver.page.waitForTimeout(2000);
    out.steps.approved = await readPanel(approver.page, approver.page.locator('[data-studio-extras-placement="board"]'));
  } else {
    out.steps.approved = { available: false, state: await approveKit.getAttribute("data-studio-extra-state") };
  }
  await approver.browser.close();

  const delivery = {};
  for (const device of ["phone", "laptop"]) {
    const session = await signedPage(device);
    await session.page.goto(`${BASE}/deliverables?jobId=${encodeURIComponent(CLIP_JOB)}`, {
      waitUntil: "load",
      timeout: 180000,
    });
    await session.page.waitForTimeout(3000);
    const panel = session.page.locator('[data-studio-extras-placement="delivery"]');
    delivery[device] = {
      url: session.page.url(),
      panelPresent: (await panel.count()) > 0,
      extras: (await panel.count()) ? await readPanel(session.page, panel) : [],
      shot: await shot(session.page, `${device}-15-final-delivery`),
      audit: (await panel.count()) ? await layoutAudit(session.page, '[data-studio-extras-placement="delivery"]') : null,
      horizontalScroll: (await layoutAudit(session.page, null)).horizontalScroll,
      wording: wordingScan(await session.page.locator("body").innerText()),
    };
    await session.browser.close();
  }
  out.steps.delivery = delivery;

  const waitingPhone = out.steps.boardWaiting.phone.extras;
  const waitingLaptop = out.steps.boardWaiting.laptop.extras;
  const afterPhone = out.steps.boardAfterInput.phone.extras;
  const afterLaptop = out.steps.boardAfterInput.laptop.extras;
  const kitBefore = waitingPhone.find((extra) => extra.id === "review_request_kit");
  const kitAfter = afterPhone.find((extra) => extra.id === "review_request_kit");
  out.verdict = {
    intakeFormBoth: intakeShots.phone.formPresent && intakeShots.laptop.formPresent,
    extrasPersistBoth:
      waitingPhone.map((extra) => extra.id).sort().join() === "flyer,review_request_kit" &&
      waitingLaptop.map((extra) => extra.id).sort().join() === "flyer,review_request_kit",
    sameWaitingTruth: JSON.stringify(waitingPhone) === JSON.stringify(waitingLaptop),
    sameAfterTruth: JSON.stringify(afterPhone) === JSON.stringify(afterLaptop),
    waitingOnClient: kitBefore?.state === "waiting_on_client",
    waitCleared: Boolean(kitAfter && kitAfter.state !== "waiting_on_client"),
    kitAfter: kitAfter?.state ?? null,
    reviewPanelBoth: reviewShots.phone.panelPresent && reviewShots.laptop.panelPresent,
    revisionAvailable: out.steps.revisionSent?.available !== false,
    deliveryPanelBoth: delivery.phone.panelPresent && delivery.laptop.panelPresent,
    noLocalAi: [intakeShots.phone, intakeShots.laptop, out.steps.boardWaiting.phone, out.steps.boardWaiting.laptop, reviewShots.phone, reviewShots.laptop, delivery.phone, delivery.laptop].every(
      (row) => row.wording && !row.wording.localAi,
    ),
  };
  return out;
}

const phase = process.argv[2] ?? "pre";
const results = {};
if (phase === "pay") Object.assign(results, await payPhase());
if (phase.startsWith("board")) Object.assign(results, await boardPhase(phase));
if (phase === "post") Object.assign(results, await postPhase());
if (phase === "pre") {
  for (const device of ["phone", "laptop"]) {
    results[device] = await prePhase(device);
  }
  const p = results.phone.steps;
  const l = results.laptop.steps;
  const audits = (s) => [s.clipOpenAudit, s.clipLimitAudit, s.reviewAudit, s.socialAudit, s.helpAudit];
  results.verdict = {
    layoutPhone: audits(p).every(clean),
    layoutLaptop: audits(l).every(clean),
    sameEligibility:
      JSON.stringify(p.clipEligible) === JSON.stringify(l.clipEligible) &&
      JSON.stringify(p.socialEligible) === JSON.stringify(l.socialEligible),
    clipEligibleCorrect: JSON.stringify(p.clipEligible) === JSON.stringify(["Review Request Kit", "Email + Text", "Ad Creative", "Flyer"]),
    socialEligibleCorrect: JSON.stringify(p.socialEligible) === JSON.stringify(["Review Request Kit", "Email + Text", "Flyer", "Menu / Price List"]),
    limitEnforced: [p, l].every(
      (s) => s.addStatesAtLimit.review_request_kit.disabled && s.addStatesAtLimit.email_and_text.disabled && !s.addStatesAtLimit.flyer.disabled,
    ),
    disabledLooksDisabled: [p, l].every(
      (s) =>
        Number(s.addStatesAtLimit.email_and_text.look.opacity) < 0.6 &&
        s.addStatesAtLimit.email_and_text.look.cursor === "not-allowed" &&
        Number(s.addStatesAtLimit.flyer.look.opacity) === 1,
    ),
    sameReviewWording: p.reviewExtras === l.reviewExtras,
    sameVoice: JSON.stringify(p.voice) === JSON.stringify(l.voice),
    helpComplete: [p, l].every((s) => Object.values(s.help).every(Boolean)),
  };
}
const file = path.join(OUT, `results-${phase}.json`);
writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
console.log(JSON.stringify(results.verdict ?? results, null, 2));
console.log(`results: ${file}`);
