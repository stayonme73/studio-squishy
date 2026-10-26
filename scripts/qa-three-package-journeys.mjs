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

const packages = [
  {
    id: "clip_repurposing",
    slug: "clip-repurposing",
    name: "Clip Repurposing",
    price: "$399",
    must: ["15–60"],
    mustNot: ["$549", "$249", "$199", "Spark", "2–60", "1024x1024"],
    homeHref: "/package/clip-repurposing",
  },
  {
    id: "short_form_video_editing",
    slug: "short-form-video-editing",
    name: "Short-Form Video Editing",
    price: "$249",
    must: ["45 seconds", "cover / title graphics"],
    mustNot: ["$399", "$199", "15–60", "1024x1024", "Spark"],
    homeHref: "/package/short-form-video-editing",
    desktopShot: "short-form-desktop.jpg",
    mobileShot: "short-form-mobile.jpg",
  },
  {
    id: "social_and_promo_graphics",
    slug: "social-promo-graphics",
    name: "Social & Promo Graphics",
    price: "$199",
    must: ["1024x1024", "4 coordinated square"],
    mustNot: ["$399", "$249", "15–60", "45 seconds", "Spark"],
    homeHref: "/package/social-promo-graphics",
    desktopShot: "social-promo-desktop.jpg",
    mobileShot: "social-promo-mobile.jpg",
  },
];

const browser = await chromium.launch({ channel: "chrome" });
mkdirSync(OUT, { recursive: true });

const desktop = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
});

await desktop.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 90000 });
await desktop.waitForSelector("[data-studio-homepage='page-1']");
for (const item of packages) {
  const href = await desktop.getAttribute(
    `[data-package-id='${item.id}'][data-package-detail='page']`,
    "href",
  );
  row(
    `Home ${item.name} View Details`,
    "/",
    item.homeHref,
    href ?? "missing",
    href === item.homeHref,
  );
}

await desktop.goto(`${BASE}/help-center?from=studio-lobby`, {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await desktop.waitForSelector("text=Start on the Home page");
const homeHelp = await body(desktop);
row(
  "Help Back to Home",
  "/help-center?from=studio-lobby",
  "Back to Home",
  homeHelp.includes("Back to Home") ? "Back to Home" : "missing",
  homeHelp.includes("Back to Home") && !homeHelp.includes("Back to Studio Lobby"),
  "Visible Help label is now Back to Home",
);

for (const item of packages) {
  await desktop.goto(`${BASE}/package/${item.slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await desktop.waitForSelector("[data-journey-page='package-detail']");
  if (item.desktopShot) await shot(desktop, item.desktopShot);
  const text = await body(desktop);
  const selected = await desktop.getAttribute("[data-selected-package]", "data-selected-package");
  row(
    `${item.name} Package Detail truth`,
    `/package/${item.slug}`,
    `${item.price} and no leakage`,
    text.includes(item.price) ? `${item.price} present` : "missing price",
    selected === item.id &&
      text.includes(item.name) &&
      text.includes(item.price) &&
      item.must.every((needle) => text.includes(needle)) &&
      item.mustNot.every((needle) => !text.includes(needle)),
  );
  row(
    `${item.name} Start This Package`,
    `/package/${item.slug}`,
    `/project-builder?package=${item.id}`,
    await desktop.getAttribute("[data-package-cta='start']", "href"),
    (await desktop.getAttribute("[data-package-cta='start']", "href")) ===
      `/project-builder?package=${item.id}`,
  );

  await desktop.evaluate(() => sessionStorage.removeItem("studioCondensedJourneyDraft.v1"));
  await desktop.locator("[data-package-cta='start']").click();
  await desktop.waitForURL("**/project-builder**");
  await desktop.waitForSelector("[data-journey-page='build-your-project']");
  await desktop.waitForSelector('#about-you input[name="name"]');
  const builderPackage = await desktop.getAttribute(
    "[data-selected-package]",
    "data-selected-package",
  );
  const builderName = await desktop.locator("h1.studio-journey__title").innerText();
  row(
    `${item.name} survives into builder`,
    "/project-builder",
    item.name,
    `${builderPackage} ${builderName}`,
    builderPackage === item.id && builderName.includes(item.name),
  );

  await desktop.locator('#about-you input[name="name"]').fill("Maya Rivera");
  await desktop.locator('#about-you input[name="email"]').fill("maya@example.com");
  await desktop.locator('#about-you button[type="submit"]').click();
  await desktop.waitForSelector('#about-project textarea[name="purpose"]');
  await desktop.locator('#about-project textarea[name="purpose"]').fill("Show the weekly special.");
  await desktop.locator('#about-project input[name="talkingHeadConfirm"]').check();
  await desktop.locator('#about-project input[name="rights"]').check();
  await desktop.locator('#about-project textarea[name="cta"]').fill("Book at river.example");
  await desktop.locator('#about-project button[type="submit"]').click();
  await desktop.waitForSelector('#upload textarea[name="materials"]');
  await desktop.locator('#upload textarea[name="materials"]').fill("source-file.mp4");
  await desktop.locator('#upload button[type="submit"]').click();
  await desktop.waitForSelector('#preferences button[type="submit"]');
  await desktop.locator('#preferences button[type="submit"]').click();
  await desktop.locator("#support button", { hasText: "Skip" }).nth(0).click();
  await desktop.locator("#support button", { hasText: "Skip" }).nth(1).click();
  await desktop.locator("#support button", { hasText: "Skip" }).nth(2).click();
  await desktop.locator("#support").getByRole("button", { name: "Save and continue" }).click();
  await desktop.locator("[data-builder-cta='review']").click();
  await desktop.waitForURL("**/checkout");
  await desktop.waitForSelector("[data-journey-page='review-and-pay']");
  const reviewText = await body(desktop);
  const reviewPackage = await desktop.getAttribute(
    "[data-selected-package]",
    "data-selected-package",
  );
  row(
    `${item.name} survives into Review & Pay`,
    "/checkout",
    `${item.name} ${item.price}`,
    `${reviewPackage} ${reviewText.includes(item.price) ? item.price : "missing"}`,
    reviewPackage === item.id &&
      reviewText.includes(item.name) &&
      reviewText.includes(item.price) &&
      !reviewText.includes("Project Intake opens") &&
      reviewText.includes("Build Your Project"),
    "Review next-step copy uses Build Your Project",
  );

  await desktop.locator("a.studio-homepage__voice-entry").first().click();
  await desktop.waitForURL("**/studio-conversation-room**");
  await desktop.goBack();
  await desktop.waitForURL("**/checkout**");
  const afterVoice = await desktop.evaluate(() => {
    const raw = sessionStorage.getItem("studioCondensedJourneyDraft.v1");
    return raw ? JSON.parse(raw) : {};
  });
  row(
    `${item.name} Voice return keeps package`,
    "/checkout",
    item.id,
    afterVoice.packageId,
    afterVoice.packageId === item.id && afterVoice.aboutYou?.name === "Maya Rivera",
  );
}

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
for (const item of packages) {
  await mobile.goto(`${BASE}/package/${item.slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await mobile.waitForSelector("[data-journey-page='package-detail']", { timeout: 30000 });
  if (item.mobileShot) await shot(mobile, item.mobileShot);
  const selected = await mobile.getAttribute("[data-selected-package]", "data-selected-package");
  row(
    `Mobile ${item.name}`,
    `/package/${item.slug}`,
    "Same package shell",
    selected ?? "missing",
    selected === item.id,
  );
}

writeFileSync(path.join(OUT, "THREE-PACKAGE-AUDIT.json"), JSON.stringify({ rows }, null, 2));
await browser.close();
const failed = rows.filter((item) => item["PASS / FAIL"] === "FAIL");
console.log(JSON.stringify({ total: rows.length, failed: failed.length, failedRows: failed }, null, 2));
if (failed.length) process.exitCode = 1;
