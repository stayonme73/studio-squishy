/**
 * Item #4 only. Isolated. Finds stacked decorative frames
 * (bordered + rounded ancestors) on customer pages. Does not remint Maya.
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
const now = new Date().toISOString();

const opening = {
  preferredName: "Tagia",
  projectNeed: "Marketing materials",
  businessName: "The Studio",
  requestedDeadline: "Within 2 weeks",
  deadlineStatus: "unconfirmed",
  existingMaterialsNote: "Nothing yet",
  confirmedAt: now,
};

const viewports = [
  { id: "phone", width: 360, height: 800, isMobile: true },
  { id: "laptop", width: 1280, height: 800, isMobile: false },
];

const pages = [
  { id: "lobby", url: `${BASE}/?studioPaymentSandbox=1`, wait: "main, h1, [data-layout]" },
  { id: "opening", url: `${BASE}/studio-conversation-room?stage=opening&studioPaymentSandbox=1`, wait: "[data-layout='one-tablet']" },
  { id: "route", url: `${BASE}/studio-conversation-room?stage=route&studioPaymentSandbox=1`, wait: "[data-layout='one-tablet']" },
  { id: "services", url: `${BASE}/studio-conversation-room?stage=services&studioPaymentSandbox=1`, wait: "[data-layout='one-tablet']" },
  { id: "plan", url: `${BASE}/studio-conversation-room?stage=plan&studioPaymentSandbox=1`, wait: "text=Studio Plan" },
  { id: "checkout", url: `${BASE}/studio-conversation-room?stage=checkout&studioPaymentSandbox=1`, wait: "text=What Happens Next" },
  { id: "intake", url: `${BASE}/studio-conversation-room?stage=intake&studioPaymentSandbox=1`, wait: "[data-layout='one-tablet']" },
  { id: "help", url: `${BASE}/help-center`, wait: "h1, .help-center, .hc-card" },
  { id: "sign-in", url: `${BASE}/sign-in`, wait: "h1, form, main" },
  { id: "board", url: `${BASE}/studio-board`, wait: ".sb, h1, main" },
  { id: "record", url: `${BASE}/campaign-details`, wait: "h1, .cd-grid, main" },
  { id: "review", url: `${BASE}/feedback-studio`, wait: "h1, .fs-page, .rd-shell, main" },
  { id: "delivery", url: `${BASE}/deliverables`, wait: "h1, .fd-hero, main" },
];

function draftFor(stage) {
  return {
    version: 1,
    status: stage === "intake" || stage === "checkout" ? "working_draft" : "working_draft",
    editable: true,
    updatedAt: now,
    revision: 4,
    cursor: {
      conversationLocation: `conversation-room-stage:${stage}`,
      flowStep: stage,
    },
    attribution: [],
    slices: {
      discoveryAnswers: opening,
      currentConversationLocation: `conversation-room-stage:${stage}`,
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

const measureStacks = () => {
  const CONTROL = new Set(["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT", "IMG", "SVG", "PATH", "HR"]);
  const isFrame = (el) => {
    if (!el || el === document.documentElement || el === document.body) return false;
    if (CONTROL.has(el.tagName)) return false;
    if (el.getAttribute("data-plan-details-toggle") === "true") return false;
    if (el.hasAttribute("data-voice-pref") || el.hasAttribute("data-voice-choice-action")) {
      return false;
    }
    const s = getComputedStyle(el);
    const width = parseFloat(s.borderTopWidth) || 0;
    if (width < 0.6) return false;
    const color = s.borderTopColor;
    if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") return false;
    const radius = parseFloat(s.borderTopLeftRadius) || 0;
    if (radius < 1) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 40) return false;
    return true;
  };

  const labelOf = (el) => {
    const bits = [
      el.getAttribute("data-layout"),
      el.getAttribute("data-surface"),
      el.getAttribute("data-stage"),
      el.getAttribute("data-panel"),
      el.getAttribute("data-phone-plan"),
      ...String(el.className || "")
        .split(/\s+/)
        .filter((name) => name && !name.includes("module__"))
        .slice(0, 3),
    ].filter(Boolean);
    return `${el.tagName.toLowerCase()}${bits.length ? "." + bits.join(".") : ""}`;
  };

  const seen = new Set();
  const stacks = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!isFrame(el)) continue;
    const chain = [];
    let node = el;
    while (node && node !== document.body) {
      if (isFrame(node)) chain.unshift(labelOf(node));
      node = node.parentElement;
    }
    if (chain.length < 2) continue;
    const key = chain.join(" > ");
    if (seen.has(key)) continue;
    seen.add(key);
    stacks.push({ depth: chain.length, chain });
  }
  stacks.sort((a, b) => b.depth - a.depth);
  return {
    path: location.pathname + location.search,
    title: document.title,
    stackCount: stacks.length,
    maxDepth: stacks[0]?.depth ?? 1,
    stacks: stacks.slice(0, 8),
  };
};

const report = [];
for (const vp of viewports) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
  });
  const page = await context.newPage();
  const auth = await page.request.post(`${BASE}/api/auth/local-customer-one`);
  const authStatus = auth.status();

  for (const screen of pages) {
    const stage = ["opening", "route", "services", "plan", "checkout", "intake"].includes(
      screen.id,
    )
      ? screen.id
      : "plan";
    await page.addInitScript(
      ({ draft, guide }) => {
        localStorage.setItem("studio-squishy:working-draft:v1", JSON.stringify(draft));
        localStorage.setItem(
          "studio-guide:capture-draft:v1",
          JSON.stringify({ schemaVersion: 1, ...guide, source: "lobby-guide-conversation" }),
        );
        sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
        sessionStorage.setItem("studio-voice:first-entry-choice:v1", "done");
        sessionStorage.setItem("studio-guide:ui-step:v1", "summary");
      },
      { draft: draftFor(stage), guide: opening },
    );
    const row = { viewport: vp.id, id: screen.id, authStatus };
    try {
      await page.goto(screen.url, { waitUntil: "commit", timeout: 45000 });
      await page.waitForTimeout(1400);
      const film = page.locator("[data-voice-choice-film]");
      if (await film.count()) {
        const fill = page.locator('[data-voice-choice-action="off"]').first();
        if (await fill.count()) {
          await fill.dispatchEvent("pointerdown");
          await fill.click({ force: true }).catch(() => {});
          await page.waitForTimeout(600);
        }
      }
      await page.waitForSelector(screen.wait, { timeout: 12000 }).catch(() => {});
      const facts = await page.evaluate(measureStacks);
      Object.assign(row, facts);
      if (facts.maxDepth >= 3 || (facts.maxDepth >= 2 && screen.id !== "board")) {
        await page.screenshot({
          path: path.join(out, `layer-audit-${screen.id}-${vp.id}.jpg`),
          type: "jpeg",
          quality: 70,
        });
        row.proof = `layer-audit-${screen.id}-${vp.id}.jpg`;
      }
    } catch (error) {
      row.error = String(error).slice(0, 180);
    }
    report.push(row);
    process.stdout.write(
      `${vp.id} ${screen.id} depth=${row.maxDepth ?? "?"} stacks=${row.stackCount ?? "?"} ${row.error ?? ""}\n`,
    );
  }
  await context.close();
}

await browser.close();
writeFileSync(path.join(out, "layer-audit-facts.json"), JSON.stringify(report, null, 2));
const extras = report.filter((row) => (row.maxDepth ?? 0) >= 2);
process.stdout.write(`\nEXTRA_LAYER_PAGES ${extras.length}/${report.length}\n`);
process.stdout.write(`${JSON.stringify(extras, null, 2)}\n`);
