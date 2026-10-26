/**
 * Item #1 only. Isolated context. Does not remint Maya.
 * Cert path: ?studioPaymentSandbox=1 → Continue uses sandbox-confirm → Intake.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(
  root,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);
mkdirSync(out, { recursive: true });

const BASE = process.argv[2] || "https://localhost:3000";
const MAYA = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const now = new Date().toISOString();

const opening = {
  preferredName: "Maya",
  projectNeed: "I need a flyer for a grand opening.",
  businessName: "Home Kitchen",
  requestedDeadline: "October 15, 2026",
  deadlineStatus: "unconfirmed",
  existingMaterialsNote: "I have a logo.",
  confirmedAt: now,
};

function workingDraft() {
  return {
    version: 1,
    status: "working_draft",
    editable: true,
    updatedAt: now,
    revision: 4,
    cursor: {
      conversationLocation: "conversation-room-stage:checkout",
      flowStep: "checkout",
    },
    attribution: [],
    slices: {
      discoveryAnswers: opening,
      currentConversationLocation: "conversation-room-stage:checkout",
      routeRecommendation: {
        roadId: "i75",
        projectNeed: opening.projectNeed,
        recommendedAt: now,
      },
      customerSelectedRoute: { roadId: "i75", selectedAt: now },
      selectedServices: [{ jobId: "v2-rtu-flyer", roadId: "i75", addedAt: now }],
    },
  };
}

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-certificate-errors"],
});
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

const posts = [];
page.on("request", (req) => {
  if (req.method() !== "POST") return;
  if (!/\/api\/payments\//.test(req.url())) return;
  let body = null;
  try {
    body = JSON.parse(req.postData() || "null");
  } catch {
    body = req.postData();
  }
  posts.push({ url: req.url(), preferSandbox: body?.preferSandbox === true });
});

await page.addInitScript(
  ({ draft, guide }) => {
    localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(draft));
    localStorage.setItem(
      "studio-guide:capture-draft:v1",
      JSON.stringify({ schemaVersion: 1, ...guide, source: "lobby-guide-conversation" }),
    );
    sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
    document.cookie = "studio_voice_first_entry=; path=/; max-age=0; SameSite=Lax";
    sessionStorage.setItem("studio-guide:ui-step:v1", "checkout");
  },
  { draft: workingDraft(), guide: opening },
);

await page.goto(
  `${BASE}/studio-conversation-room?stage=checkout&studioPaymentSandbox=1`,
  { waitUntil: "domcontentloaded", timeout: 60000 },
);

const film = page.locator("[data-voice-choice-film]");
if (await film.count()) {
  const fill = page.locator('[data-voice-choice-action="off"]').first();
  if (await fill.count()) {
    await fill.click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(600);
  }
}

await page.waitForSelector("[data-checkout-pay='continue']", { timeout: 25000 });
const terms = page.locator("[data-checkout-terms='1']").first();
await terms.check({ force: true }).catch(async () => {
  await terms.click({ force: true });
});
await page.waitForTimeout(400);

const before = await page.evaluate(() => {
  const pay = document.querySelector("[data-checkout-pay='continue']");
  const box = document.querySelector("[data-checkout-terms='1']");
  return {
    href: window.location.href,
    label: pay?.textContent?.trim() ?? null,
    termsChecked: box instanceof HTMLInputElement ? box.checked : null,
    sandboxFixture: Boolean(
      document.querySelector("[data-developer-fixture='sandbox-confirm']"),
    ),
  };
});
await page.screenshot({
  path: path.join(out, "item1-checkout-before.jpg"),
  type: "jpeg",
  quality: 82,
});

const pay = page.locator("[data-checkout-pay='continue']").first();
await pay.dispatchEvent("pointerdown", { button: 0 });
await pay.dispatchEvent("pointerup", { button: 0 });
await pay.click({ force: true }).catch(() => {});

await page
  .waitForResponse((res) => res.url().includes("/api/payments/sandbox-confirm"), {
    timeout: 15000,
  })
  .catch(() => {});
await page
  .waitForSelector(
    "text=Preparing your project for production, text=Project Intake, [data-stage='intake'], [data-panel='intake']",
    { timeout: 15000 },
  )
  .catch(() => {});
await page.waitForTimeout(800);

const after = await page.evaluate((mayaId) => {
  const alert = document.querySelector("[role='alert']");
  const tablet = document.querySelector("[data-surface='tablet']");
  let campaignId = null;
  try {
    const raw = localStorage.getItem("studio-squishy:current-campaign");
    const parsed = raw ? JSON.parse(raw) : null;
    campaignId = parsed?.campaignId ?? parsed?.id ?? null;
  } catch {
    campaignId = null;
  }
  return {
    href: window.location.href,
    stage: tablet?.getAttribute("data-stage") ?? null,
    heading: document.querySelector("[data-surface='tablet'] h1, [data-surface='tablet'] h2")
      ?.textContent?.trim() ?? null,
    alert: alert?.textContent?.trim() ?? null,
    campaignId,
    touchedMaya: String(campaignId || "").includes(mayaId),
    intakeVisible: Boolean(
      document.querySelector("[data-panel='intake'], [data-stage='intake']") ||
        /intake|preparing your project/i.test(document.body.innerText),
    ),
  };
}, MAYA);

await page.screenshot({
  path: path.join(out, "item1-checkout-after.jpg"),
  type: "jpeg",
  quality: 82,
});

const facts = { before, after, posts };
writeFileSync(
  path.join(out, "item1-sandbox-checkout-facts.json"),
  JSON.stringify(facts, null, 2),
);
process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);

await context.close();
await browser.close();

if (!before.termsChecked) throw new Error("terms checkbox did not check");
if (!posts.some((p) => p.url.includes("checkout-session") && p.preferSandbox)) {
  throw new Error("Continue did not start sandbox checkout-session");
}
if (!posts.some((p) => p.url.includes("sandbox-confirm"))) {
  throw new Error("sandbox-confirm did not run");
}
if (after.touchedMaya) throw new Error("Maya campaign was touched");
if (!after.intakeVisible && after.stage !== "intake") {
  throw new Error(`did not reach intake: ${JSON.stringify(after)}`);
}
