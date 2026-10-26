/**
 * Item #4 only. Isolated. Studio Plan problem areas: details and actions
 * stand alone. Does not remint Maya. Does not reset the live phone draft.
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

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--ignore-certificate-errors"],
});
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 360, height: 800 },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
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
  {
    draft: {
      version: 1,
      status: "working_draft",
      editable: true,
      updatedAt: now,
      revision: 4,
      cursor: {
        conversationLocation: "conversation-room-stage:plan",
        flowStep: "plan",
      },
      attribution: [],
      slices: {
        discoveryAnswers: opening,
        currentConversationLocation: "conversation-room-stage:plan",
        routeRecommendation: {
          roadId: "i75",
          projectNeed: opening.projectNeed,
          recommendedAt: now,
        },
        customerSelectedRoute: { roadId: "i75", selectedAt: now },
        selectedServices: [{ jobId: "v2-rtu-flyer", roadId: "i75", addedAt: now }],
      },
    },
    guide: opening,
  },
);
await page.goto(`${BASE}/studio-conversation-room?stage=plan&studioPaymentSandbox=1`, {
  waitUntil: "commit",
  timeout: 60000,
});
await page.waitForTimeout(1600);
const film = page.locator("[data-voice-choice-film]");
if (await film.count()) {
  const fill = page.locator('[data-voice-choice-action="off"]').first();
  if (await fill.count()) {
    await fill.dispatchEvent("pointerdown");
    await fill.click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
  }
}
await page.waitForSelector("text=Studio Plan", { timeout: 20000 });

const facts = await page.evaluate(() => {
  const tablet = document.querySelector("[data-surface='tablet']");
  const details = document.querySelector("[data-plan-details='true']");
  const toggle = document.querySelector("[data-plan-details-toggle='true']");
  const actions = document.querySelector("[data-plan-actions]");
  const extrasCard = document.querySelector(
    "[data-surface='studio-plan'] .pb-plan-summary__card",
  );
  const confirm = Array.from(document.querySelectorAll("a[role='button'], button")).find(
    (node) => /continue to checkout/i.test(node.textContent || ""),
  );
  const styleOf = (node) => (node ? getComputedStyle(node) : null);
  const detailsStyle = styleOf(details);
  const toggleStyle = styleOf(toggle);
  const extrasStyle = styleOf(extrasCard);
  const actionsStyle = styleOf(actions);
  const tabletBox = tablet?.getBoundingClientRect();
  const tabletStyle = styleOf(tablet);
  return {
    hasPlan: /studio plan/i.test(document.body.innerText),
    hasDetails: Boolean(details),
    viewportWidth: window.innerWidth,
    tabletWidth: tabletBox ? Math.round(tabletBox.width) : 0,
    tabletBorder: tabletStyle?.borderTopWidth,
    tabletRadius: tabletStyle?.borderTopLeftRadius,
    tabletOverflow: tablet ? tablet.scrollWidth > tablet.clientWidth + 1 : false,
    bodyOverflow: document.body.scrollWidth > window.innerWidth + 1,
    detailsBorder: detailsStyle?.borderTopWidth,
    detailsRadius: detailsStyle?.borderTopLeftRadius,
    toggleBorder: toggleStyle?.borderTopWidth,
    toggleRadius: toggleStyle?.borderTopLeftRadius,
    toggleHeight: toggle ? Math.round(toggle.getBoundingClientRect().height) : 0,
    extrasBorder: extrasStyle?.borderTopWidth ?? null,
    extrasRadius: extrasStyle?.borderTopLeftRadius ?? null,
    actionsBorder: actionsStyle?.borderTopWidth ?? null,
    actionsRadius: actionsStyle?.borderTopLeftRadius ?? null,
    actionsOutside: Boolean(confirm) && !tablet?.contains(confirm),
    confirmPresent: Boolean(confirm),
  };
});

await page.locator("[data-plan-details='true']").first().scrollIntoViewIfNeeded();
await page.screenshot({
  path: path.join(out, "item4-plan-windows-details.jpg"),
  type: "jpeg",
  quality: 82,
});
if (await page.locator("[data-plan-actions]").count()) {
  await page.locator("[data-plan-actions]").first().scrollIntoViewIfNeeded();
}
await page.screenshot({
  path: path.join(out, "item4-plan-windows-actions.jpg"),
  type: "jpeg",
  quality: 82,
});
writeFileSync(path.join(out, "item4-plan-windows-facts.json"), JSON.stringify(facts, null, 2));

await page.goto(`${BASE}/studio-conversation-room?stage=checkout&studioPaymentSandbox=1`, {
  waitUntil: "commit",
  timeout: 60000,
});
await page.waitForTimeout(1400);
const checkoutFacts = await page.evaluate(() => {
  const tablet = document.querySelector("[data-stage='checkout'][data-surface='tablet']");
  const panel = document.querySelector("[data-panel='checkout']");
  const cards = Array.from(document.querySelectorAll("[data-panel='checkout'] .co-card"));
  const card = cards[cards.length - 1] ?? null;
  const styleOf = (node) => (node ? getComputedStyle(node) : null);
  const tabletStyle = styleOf(tablet);
  const panelStyle = styleOf(panel);
  const cardStyle = styleOf(card);
  return {
    hasCheckout: /what happens next/i.test(document.body.innerText),
    tabletBorder: tabletStyle?.borderTopWidth ?? null,
    tabletRadius: tabletStyle?.borderTopLeftRadius ?? null,
    panelBorder: panelStyle?.borderTopWidth ?? null,
    panelRadius: panelStyle?.borderTopLeftRadius ?? null,
    cardBorder: cardStyle?.borderTopWidth ?? null,
    cardRadius: cardStyle?.borderTopLeftRadius ?? null,
    cardBorders: cards.map((node) => styleOf(node)?.borderTopWidth ?? null),
    cardCount: cards.length,
    cardSurface: card?.closest("[data-panel='checkout']")?.getAttribute("data-surface") ?? null,
    cardInsideOneTablet: Boolean(card?.closest("[data-layout='one-tablet']")),
  };
});
const next = page.locator("text=What Happens Next").first();
if (await next.count()) {
  await next.scrollIntoViewIfNeeded();
}
await page.screenshot({
  path: path.join(out, "item4-checkout-windows-next.jpg"),
  type: "jpeg",
  quality: 82,
});
writeFileSync(path.join(out, "item4-checkout-windows-facts.json"), JSON.stringify(checkoutFacts, null, 2));
await browser.close();
process.stdout.write(`${JSON.stringify(facts, null, 2)}\n`);

if (!facts.hasPlan) throw new Error("Studio Plan missing");
if (!facts.hasDetails) throw new Error("Plan details missing");
if (facts.detailsBorder !== "0px") throw new Error(`Plan details still boxed: ${facts.detailsBorder}`);
if (facts.detailsRadius !== "0px") throw new Error(`Plan details still rounded: ${facts.detailsRadius}`);
if (facts.toggleBorder !== "1px") throw new Error(`Plan details toggle missing outline: ${facts.toggleBorder}`);
if (facts.toggleRadius === "0px") throw new Error("Plan details toggle lost its outline radius");
if (facts.toggleHeight < 40) {
  throw new Error(`Plan details outline is still a hairline: ${facts.toggleHeight}px`);
}
if (facts.extrasBorder && facts.extrasBorder !== "0px") {
  throw new Error(`extras card still boxed: ${facts.extrasBorder}`);
}
if (!facts.confirmPresent) throw new Error("Continue to Checkout missing");
if (!facts.actionsOutside) throw new Error("Continue to Checkout still inside the inner tablet");
if (facts.actionsBorder && facts.actionsBorder !== "0px") {
  throw new Error(`Action row still a second surface: ${facts.actionsBorder}`);
}
if (facts.actionsRadius && facts.actionsRadius !== "0px") {
  throw new Error(`Action row still a second rail: ${facts.actionsRadius}`);
}
if (facts.tabletBorder !== "0px") throw new Error(`Studio Plan frame still on: ${facts.tabletBorder}`);
if (facts.tabletRadius !== "0px") throw new Error(`Studio Plan frame still rounded: ${facts.tabletRadius}`);
if (facts.tabletWidth > facts.viewportWidth) {
  throw new Error(`Tablet wider than viewport: ${facts.tabletWidth}/${facts.viewportWidth}`);
}
if (facts.bodyOverflow) throw new Error("Studio Plan body is wider than the phone");
if (facts.tabletOverflow) throw new Error("Studio Plan tablet canvas is overflowing horizontally");
process.stdout.write(`${JSON.stringify(checkoutFacts, null, 2)}\n`);
if (!checkoutFacts.hasCheckout) throw new Error("Checkout What Happens Next missing");
if (checkoutFacts.tabletBorder !== "0px") {
  throw new Error(`Checkout frame still on: ${checkoutFacts.tabletBorder}`);
}
if (checkoutFacts.tabletRadius !== "0px") {
  throw new Error(`Checkout frame still rounded: ${checkoutFacts.tabletRadius}`);
}
if (checkoutFacts.cardBorder && checkoutFacts.cardBorder !== "0px") {
  throw new Error(`Checkout card still boxed: ${checkoutFacts.cardBorder}`);
}
if (checkoutFacts.cardRadius && checkoutFacts.cardRadius !== "0px") {
  throw new Error(`Checkout card still rounded: ${checkoutFacts.cardRadius}`);
}
if ((checkoutFacts.cardBorders ?? []).some((border) => border && border !== "0px")) {
  throw new Error(`Checkout card still boxed: ${JSON.stringify(checkoutFacts.cardBorders)}`);
}
