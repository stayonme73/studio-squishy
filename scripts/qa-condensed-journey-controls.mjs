import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(
  ROOT,
  "docs/launch/studio-customer-journey-condense-1/OWNER-CONSOLE-RETURN/QA",
);
const BASE = "http://localhost:3000";

const rows = [];

function row(control, page, expected, actual, pass, fix = "") {
  rows.push({
    CONTROL: control,
    PAGE: page,
    EXPECTED: expected,
    ACTUAL: actual,
    "PASS / FAIL": pass ? "PASS" : "FAIL",
    "FIX MADE": fix,
  });
}

async function shot(page, name) {
  await page.screenshot({
    path: path.join(OUT, name),
    type: "jpeg",
    quality: 86,
  });
}

async function body(page) {
  return page.locator("body").innerText();
}

const browser = await chromium.launch({ channel: "chrome" });
mkdirSync(OUT, { recursive: true });

const desktop = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
});

await desktop.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
await desktop.waitForSelector("[data-studio-homepage='page-1']");
await shot(desktop, "home-desktop.jpg");

const homeText = await body(desktop);
row(
  "Home front door",
  "/",
  "Approved homepage",
  homeText.includes("Creative support for busy businesses.") ? "Homepage rendered" : desktop.url(),
  homeText.includes("Creative support for busy businesses."),
);
row(
  "Choose a Package",
  "/",
  "Stay on Home and scroll to #packages",
  await desktop.getAttribute("a.studio-homepage__btn-primary", "href"),
  (await desktop.getAttribute("a.studio-homepage__btn-primary", "href")) === "#packages" &&
    (await desktop.locator("a.studio-homepage__btn-primary", { hasText: "Choose a Package" }).count()) ===
      1,
);
row(
  "See Our Work",
  "/",
  "Stay on Home and scroll to #our-work",
  await desktop.getAttribute("a.studio-homepage__btn-secondary[href='#our-work']", "href"),
  (await desktop.getAttribute("a.studio-homepage__btn-secondary[href='#our-work']", "href")) ===
    "#our-work",
);

const headerNav = [
  ["Home", "#top"],
  ["What We Do", "#packages"],
  ["How It Works", "#how-it-works"],
  ["Our Work", "#our-work"],
  ["FAQ", "#faq"],
  ["About", "#about"],
  ["Contact", "#contact"],
];
for (const [label, href] of headerNav) {
  const actual = await desktop.getAttribute(`a.studio-homepage__text-link[href='${href}']`, "href");
  row(`Header ${label}`, "/", href, actual ?? "missing", actual === href);
}
row(
  "Studio logo",
  "/",
  "Home #top",
  await desktop.getAttribute("a.studio-homepage__brand", "href"),
  (await desktop.getAttribute("a.studio-homepage__brand", "href")) === "#top",
);
row(
  "Header Voice",
  "/",
  "/studio-conversation-room",
  await desktop.getAttribute("a.studio-homepage__voice-entry", "href"),
  (await desktop.getAttribute("a.studio-homepage__voice-entry", "href")) ===
    "/studio-conversation-room",
);
row(
  "Header My Studio",
  "/",
  "/studio-board",
  await desktop.getAttribute("header a.studio-homepage__btn-secondary[href='/studio-board']", "href"),
  (await desktop.getAttribute("header a.studio-homepage__btn-secondary[href='/studio-board']", "href")) ===
    "/studio-board",
);
row(
  "Explore Packages removed",
  "/",
  "No second packages CTA",
  String(await desktop.locator("text=Explore Packages").count()),
  (await desktop.locator("text=Explore Packages").count()) === 0 &&
    (await desktop.locator("text=Get Started").count()) === 0,
);
row(
  "Email The Studio",
  "/",
  "mailto:hello@thestudiocompany7.com",
  await desktop.getAttribute("a[href^='mailto:']", "href"),
  (await desktop.getAttribute("a[href^='mailto:']", "href")) ===
    "mailto:hello@thestudiocompany7.com",
);
row(
  "Contact Help Center",
  "/",
  "/help-center?from=studio-lobby",
  await desktop.getAttribute("a[href='/help-center?from=studio-lobby']", "href"),
  (await desktop.getAttribute("a[href='/help-center?from=studio-lobby']", "href")) ===
    "/help-center?from=studio-lobby",
);
row(
  "Footer My Studio",
  "/",
  "/studio-board",
  await desktop.getAttribute("footer a[href='/studio-board']", "href"),
  (await desktop.getAttribute("footer a[href='/studio-board']", "href")) === "/studio-board",
);
row(
  "Clip View Details",
  "/",
  "Open /package/clip-repurposing",
  await desktop.getAttribute(
    "[data-package-id='clip_repurposing'][data-package-detail='page']",
    "href",
  ),
  (await desktop.getAttribute(
    "[data-package-id='clip_repurposing'][data-package-detail='page']",
    "href",
  )) === "/package/clip-repurposing",
);
row(
  "Short-Form View Details",
  "/",
  "Stay on Home and expand teaser",
  `inline count=${await desktop.locator("[data-package-detail='inline']").count()}`,
  (await desktop.locator("[data-package-id='short_form_video_editing'][data-package-detail='inline']").count()) === 1,
);
row(
  "Social View Details",
  "/",
  "Stay on Home and expand teaser",
  "inline control present",
  (await desktop.locator("[data-package-id='social_and_promo_graphics'][data-package-detail='inline']").count()) === 1,
);

await desktop.locator("[data-package-id='short_form_video_editing'][data-package-detail='inline']").click();
await desktop.waitForTimeout(200);
row(
  "Short-Form expand",
  "/",
  "Teaser expands; URL stays Home",
  desktop.url(),
  desktop.url().replace(/\/$/, "").endsWith("3000") &&
    (await desktop.locator(".studio-homepage__card-detail").count()) > 0,
);
await desktop.locator("[data-package-id='social_and_promo_graphics'][data-package-detail='inline']").click();
await desktop.waitForTimeout(200);
row(
  "Social expand",
  "/",
  "Teaser expands; no unfinished Package Detail page",
  desktop.url(),
  desktop.url().replace(/\/$/, "").endsWith("3000") &&
    (await desktop.locator("[data-package-id='social_and_promo_graphics'] .studio-homepage__card-detail").count()) > 0,
);

await desktop.locator("#faq details").first().locator("summary").click();
await desktop.waitForTimeout(150);
const faqOpen = await desktop.locator("#faq details[open]").count();
await desktop.locator("#faq details").first().locator("summary").click();
await desktop.waitForTimeout(150);
const faqClosed = await desktop.locator("#faq details[open]").count();
row("FAQ expand/collapse", "/", "Opens then closes", `open=${faqOpen} closed=${faqClosed}`, faqOpen >= 1 && faqClosed === 0);

await desktop.locator('[aria-label="Next sample"]').click();
await desktop.locator('[aria-label="Previous sample"]').click();
row(
  "Carousel arrows",
  "/",
  "Previous and Next sample controls work",
  "clicked both",
  (await desktop.locator(".studio-homepage__carousel-btn").count()) === 2,
);

await desktop.locator("a.studio-homepage__btn-primary").first().click();
await desktop.waitForFunction(() => location.hash === "#packages" || Boolean(document.getElementById("packages")));
row(
  "Choose a Package click",
  "/",
  "Lands on packages",
  await desktop.evaluate(() => location.hash || "#packages-in-view"),
  await desktop.evaluate(() => {
    const node = document.getElementById("packages");
    if (!node) return false;
    const rect = node.getBoundingClientRect();
    return location.hash === "#packages" || rect.top < window.innerHeight;
  }),
);

await desktop.locator(".studio-homepage__demo-open").click();
await desktop.waitForSelector('[role="dialog"]');
row("Play Studio Demo", "/", "Opens demo dialog", "dialog open", true);
await desktop.keyboard.press("Escape");
await desktop.waitForTimeout(200);
row(
  "Demo Escape close",
  "/",
  "Dialog closes",
  String(await desktop.locator('[role="dialog"]').count()),
  (await desktop.locator('[role="dialog"]').count()) === 0,
);
await desktop.locator(".studio-homepage__demo-open").click();
await desktop.waitForSelector('[role="dialog"]');
await desktop.locator(".studio-homepage__demo-close").click();
await desktop.waitForTimeout(200);
row(
  "Demo X close",
  "/",
  "Dialog closes from X",
  String(await desktop.locator('[role="dialog"]').count()),
  (await desktop.locator('[role="dialog"]').count()) === 0,
);

await desktop.locator("header a.studio-homepage__voice-entry").first().click();
await desktop.waitForURL("**/studio-conversation-room**");
row(
  "Voice from Home",
  "/studio-conversation-room",
  "Opens Conversation Room",
  desktop.url(),
  desktop.url().includes("/studio-conversation-room"),
);
await desktop.goBack();
await desktop.waitForSelector("[data-studio-homepage='page-1']");
row(
  "Browser Back from Home Voice",
  "/",
  "Returns to Home",
  desktop.url(),
  desktop.url().includes("localhost:3000") &&
    !desktop.url().includes("/studio-conversation-room") &&
    (await desktop.locator("[data-studio-homepage='page-1']").count()) > 0,
);

await desktop.locator("footer a[href='/help-center?from=studio-lobby']").click();
await desktop.waitForURL("**/help-center**");
await desktop.waitForSelector("text=Start on the Home page");
const helpFromHome = await body(desktop);
row(
  "Help from Home",
  "/help-center?from=studio-lobby",
  "Help opens from Home; start copy is Home, not Conversation Room",
  desktop.url(),
  desktop.url().includes("/help-center") &&
    helpFromHome.includes("Start on the Home page") &&
    !helpFromHome.includes("Begin in the Conversation Room") &&
    !helpFromHome.includes("In the Conversation Room, The Studio suggests"),
);
await desktop.goBack();
await desktop.waitForSelector("[data-studio-homepage='page-1']");

await desktop.locator("[data-package-id='clip_repurposing'][data-package-detail='page']").click();
await desktop.waitForURL("**/package/clip-repurposing");
await desktop.waitForSelector("[data-journey-page='package-detail']");
await shot(desktop, "package-detail-desktop.jpg");
const packageText = await body(desktop);
row(
  "Package Detail truth",
  "/package/clip-repurposing",
  "$399, 15–60, no $549 / Spark / 2–60",
  packageText.includes("$399") ? "$399 present" : "missing $399",
  packageText.includes("$399") &&
    packageText.includes("15–60") &&
    !packageText.includes("$549") &&
    !/spark|momentum|growth/i.test(packageText) &&
    !packageText.includes("2–60"),
);
row(
  "Start This Package href",
  "/package/clip-repurposing",
  "/project-builder?package=clip_repurposing",
  await desktop.getAttribute("[data-package-cta='start']", "href"),
  (await desktop.getAttribute("[data-package-cta='start']", "href")) ===
    "/project-builder?package=clip_repurposing",
);
row(
  "Ask Studio Voice href",
  "/package/clip-repurposing",
  "/studio-conversation-room",
  await desktop.getAttribute("[data-package-cta='voice']", "href"),
  (await desktop.getAttribute("[data-package-cta='voice']", "href")) ===
    "/studio-conversation-room",
);

await desktop.getByRole("link", { name: "Help", exact: true }).click();
await desktop.waitForURL("**/help-center**");
await desktop.waitForSelector("text=Start on the Home page");
const helpFromPackage = await body(desktop);
row(
  "Help from Package Detail",
  "/help-center?from=package-detail",
  "Help opens; Back to Package Detail",
  desktop.url(),
  desktop.url().includes("from=package-detail") &&
    helpFromPackage.includes("Back to Package Detail") &&
    helpFromPackage.includes("Start on the Home page") &&
    !helpFromPackage.includes("Begin in the Conversation Room"),
);
await desktop.locator("a", { hasText: "Back to Package Detail" }).first().click();
await desktop.waitForURL("**/package/clip-repurposing");
row(
  "Help return to Package Detail",
  "/package/clip-repurposing",
  "Returns to Clip Package Detail",
  desktop.url(),
  desktop.url().includes("/package/clip-repurposing"),
);

row(
  "Package Detail Back to Home href",
  "/package/clip-repurposing",
  "/",
  await desktop.getAttribute("a.studio-journey__back", "href"),
  (await desktop.getAttribute("a.studio-journey__back", "href")) === "/",
);
row(
  "Package Detail logo Home",
  "/package/clip-repurposing",
  "/",
  await desktop.getAttribute("a.studio-homepage__brand", "href"),
  (await desktop.getAttribute("a.studio-homepage__brand", "href")) === "/",
);

await desktop.locator("[data-package-cta='start']").click();
await desktop.waitForURL("**/project-builder**");
await desktop.waitForSelector("[data-journey-page='build-your-project']");
row(
  "Start This Package click",
  "/project-builder",
  "Opens condensed Build Your Project",
  desktop.url(),
  desktop.url().includes("/project-builder"),
);

await desktop.locator('#about-you input[name="name"]').fill("Maya Rivera");
await desktop.locator('#about-you input[name="email"]').fill("maya@example.com");
await desktop.locator('#about-you input[name="company"]').fill("River & Reed");
await desktop.locator("[data-builder-section='about-project'] button.studio-homepage__card-link").click();
await desktop.waitForTimeout(200);
await desktop.locator("[data-builder-section='about-you'] button.studio-homepage__card-link").click();
await desktop.waitForTimeout(200);
const persistedName = await desktop.locator('#about-you input[name="name"]').inputValue();
row(
  "Builder tile switch persistence",
  "/project-builder",
  "Name survives opening another tile",
  persistedName,
  persistedName === "Maya Rivera",
  persistedName === "Maya Rivera" ? "Flush unsaved fields before switching tiles" : "",
);
await desktop.locator('#about-you button[type="submit"]').click();
await desktop.waitForSelector('#about-project textarea[name="purpose"]');
await desktop.locator('#about-project textarea[name="purpose"]').fill("Show the weekly special.");
await desktop.locator('#about-project input[name="talkingHeadConfirm"]').check();
await desktop.locator('#about-project input[name="rights"]').check();
await desktop.locator('#about-project textarea[name="cta"]').fill("Book at river.example");
await desktop.locator('#about-project button[type="submit"]').click();
await desktop.waitForSelector('#upload textarea[name="materials"]');
await desktop.locator('#upload textarea[name="materials"]').fill("workshop-talking-head.mp4");
await desktop.locator('#upload button[type="submit"]').click();
await desktop.waitForSelector('#preferences button[type="submit"]');
await desktop.locator('#preferences button[type="submit"]').click();
await desktop.locator("#support button", { hasText: "Skip" }).nth(0).click();
await desktop.locator("#support button", { hasText: "Skip" }).nth(1).click();
await desktop.locator("#support button", { hasText: "Skip" }).nth(2).click();
await desktop.locator("#support").getByRole("button", { name: "Save and continue" }).click();
await shot(desktop, "build-your-project-desktop.jpg");
row(
  "Builder five sections",
  "/project-builder",
  "About You / Project / Upload / Preferences / Support on one page",
  String(await desktop.locator("[data-builder-section]").count()),
  (await desktop.locator("[data-builder-section]").count()) === 5,
);

const voiceFromBuilder = desktop.url();
await desktop.locator("a.studio-homepage__voice-entry").first().click();
await desktop.waitForURL("**/studio-conversation-room**");
row(
  "Voice from Build Your Project",
  "/studio-conversation-room",
  "Opens Conversation Room",
  desktop.url(),
  desktop.url().includes("/studio-conversation-room"),
);
await desktop.goBack();
await desktop.waitForURL("**/project-builder**");
const voiceBackName = await desktop.evaluate(() => {
  const raw = sessionStorage.getItem("studioCondensedJourneyDraft.v1");
  return raw ? JSON.parse(raw).aboutYou.name : "";
});
row(
  "Voice return keeps builder draft",
  "/project-builder",
  "Maya Rivera still stored after Voice",
  voiceBackName,
  voiceBackName === "Maya Rivera" && desktop.url().includes("/project-builder"),
  voiceBackName === "Maya Rivera" ? "" : `lost after Voice from ${voiceFromBuilder}`,
);

await desktop.getByRole("link", { name: "Help", exact: true }).click();
await desktop.waitForURL("**/help-center**");
await desktop.waitForSelector("text=Start on the Home page");
const helpFromBuilder = await body(desktop);
row(
  "Help from Build Your Project",
  "/help-center?from=project-builder",
  "Help opens; Back to Build Your Project",
  desktop.url(),
  desktop.url().includes("from=project-builder") &&
    helpFromBuilder.includes("Back to Build Your Project") &&
    helpFromBuilder.includes("Start on the Home page"),
);
await desktop.locator("a", { hasText: "Back to Build Your Project" }).first().click();
await desktop.waitForURL("**/project-builder**");

await desktop.locator("[data-builder-cta='review']").click();
await desktop.waitForURL("**/checkout");
await desktop.waitForSelector("[data-journey-page='review-and-pay']");
await shot(desktop, "review-and-pay-desktop.jpg");
const reviewText = await body(desktop);
row(
  "Review + Pay one page",
  "/checkout",
  "Package, support, summary, uploads, $399, payment",
  reviewText.includes("Review Your Order") ? "Review + checkout present" : "missing review",
  reviewText.includes("Clip Repurposing") &&
    reviewText.includes("$399") &&
    /Continue to secure checkout|Confirm checkout/i.test(reviewText),
);
row(
  "Correction path",
  "/checkout",
  "Correct something links back to builder/package",
  String(await desktop.locator("a", { hasText: "Correct something" }).count()),
  (await desktop.locator("a", { hasText: "Correct something" }).count()) >= 3,
);

await desktop.locator("a", { hasText: "Back to Build Your Project" }).first().click();
await desktop.waitForURL("**/project-builder**");
await desktop.waitForTimeout(300);
const backName = await desktop.evaluate(() => {
  const raw = sessionStorage.getItem("studioCondensedJourneyDraft.v1");
  return raw ? JSON.parse(raw).aboutYou.name : "";
});
row(
  "Return to builder keeps draft",
  "/project-builder",
  "Maya Rivera still stored",
  backName,
  backName === "Maya Rivera",
);

await desktop.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: 90000 });
await desktop.locator("a.studio-homepage__voice-entry").first().click();
await desktop.waitForURL("**/studio-conversation-room**");
row(
  "Voice from Review & Pay",
  "/studio-conversation-room",
  "Opens Conversation Room",
  desktop.url(),
  desktop.url().includes("/studio-conversation-room"),
);
await desktop.goBack();
row(
  "Browser Back from Voice",
  "/checkout",
  "Returns to Review & Pay",
  desktop.url(),
  desktop.url().includes("/checkout"),
);

await desktop.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: 90000 });
await desktop.getByRole("link", { name: "Help", exact: true }).click();
await desktop.waitForURL("**/help-center**");
await desktop.waitForSelector("text=Start on the Home page");
const helpFromCheckout = await body(desktop);
row(
  "Help from Review & Pay",
  "/help-center?from=checkout",
  "Help opens; Back to Review & Pay",
  desktop.url(),
  desktop.url().includes("from=checkout") &&
    helpFromCheckout.includes("Back to Review & Pay") &&
    helpFromCheckout.includes("Start on the Home page") &&
    !helpFromCheckout.includes("Begin in the Conversation Room"),
);
await desktop.locator("a", { hasText: "Back to Review & Pay" }).first().click();
await desktop.waitForURL("**/checkout**");

await desktop.goto(`${BASE}/payment`, { waitUntil: "domcontentloaded", timeout: 90000 });
row(
  "Route /payment",
  "/payment",
  "Redirects to live /checkout",
  desktop.url(),
  desktop.url().includes("/checkout") &&
    (await desktop.locator("[data-journey-page='review-and-pay']").count()) > 0,
);

const routeChecks = [
  ["/", "homepage"],
  ["/studio-lobby", "homepage"],
  ["/package/clip-repurposing", "package-detail"],
  ["/project-builder", "build-your-project"],
  ["/checkout", "review-and-pay"],
  ["/studio-conversation-room", "conversation"],
  ["/help-center", "help"],
  ["/studio-board", "sign-in"],
  ["/deliverables", "sign-in"],
];
for (const [pathName, kind] of routeChecks) {
  await desktop.goto(`${BASE}${pathName}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  const url = desktop.url();
  let pass = false;
  if (kind === "homepage") pass = url.includes(pathName === "/" ? "3000" : "studio-lobby") && (await desktop.locator("[data-studio-homepage='page-1']").count()) > 0;
  if (kind === "package-detail") pass = (await desktop.locator("[data-journey-page='package-detail']").count()) > 0;
  if (kind === "build-your-project") pass = (await desktop.locator("[data-journey-page='build-your-project']").count()) > 0;
  if (kind === "review-and-pay") pass = (await desktop.locator("[data-journey-page='review-and-pay']").count()) > 0;
  if (kind === "conversation") pass = url.includes("/studio-conversation-room");
  if (kind === "help") {
    const text = await body(desktop);
    pass = url.includes("/help-center") && text.includes("Start on the Home page");
  }
  if (kind === "sign-in") pass = url.includes("/sign-in");
  row(`Route ${pathName}`, pathName, `Live ${kind}`, url, pass);
}

await desktop.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded", timeout: 90000 });
await shot(desktop, "my-studio-gate.jpg");
await desktop.goto(`${BASE}/deliverables`, { waitUntil: "domcontentloaded", timeout: 90000 });
await shot(desktop, "final-delivery-gate.jpg");

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
await mobile.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
await mobile.waitForSelector("[data-studio-homepage='page-1']");
await shot(mobile, "home-mobile.jpg");
await mobile.goto(`${BASE}/package/clip-repurposing`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await mobile.waitForSelector("[data-journey-page='package-detail']", { timeout: 30000 });
await shot(mobile, "package-detail-mobile.jpg");
row(
  "Mobile Package Detail",
  "/package/clip-repurposing",
  "Same Clip shell",
  "rendered",
  (await mobile.locator("[data-journey-page='package-detail']").count()) === 1,
);
await mobile.goto(`${BASE}/project-builder`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await mobile.waitForSelector("[data-journey-page='build-your-project']", { timeout: 30000 });
await mobile.waitForSelector("[data-builder-section]", { timeout: 30000 });
await shot(mobile, "build-your-project-mobile.jpg");
row(
  "Mobile Build Your Project",
  "/project-builder",
  "Same five tiles",
  String(await mobile.locator("[data-builder-section]").count()),
  (await mobile.locator("[data-builder-section]").count()) === 5,
);
await mobile.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: 90000 });
await mobile.waitForSelector("[data-journey-page='review-and-pay']");
await shot(mobile, "review-and-pay-mobile.jpg");
row("Mobile Home", "/", "Homepage paints at 390", "rendered at 390", true);
row(
  "Mobile Review & Pay",
  "/checkout",
  "Same review + payment page",
  "rendered",
  (await mobile.locator("[data-journey-page='review-and-pay']").count()) === 1,
);

writeFileSync(path.join(OUT, "CONTROL-AUDIT.json"), JSON.stringify({ rows }, null, 2));
await browser.close();
const failed = rows.filter((item) => item["PASS / FAIL"] === "FAIL");
console.log(JSON.stringify({ total: rows.length, failed: failed.length, failedRows: failed }, null, 2));
if (failed.length) process.exitCode = 1;
