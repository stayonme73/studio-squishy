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
  await page.screenshot({ path: path.join(OUT, name), type: "jpeg", quality: 86 });
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
    shot: "builder-clip-desktop.jpg",
    mobileShot: "builder-clip-mobile.jpg",
    mustFields: ["qualifyingSource", "intelligible"],
    mustNotFields: ["markedMoments", "usableFootage"],
    supportCount: 3,
    fill: async (page) => {
      await page.locator('[data-builder-section="about-project"] textarea[name="purpose"]').fill(
        "Show the weekly special.",
      );
      await page.locator('[data-builder-section="about-project"] input[name="qualifyingSource"]').check();
      await page.locator('[data-builder-section="about-project"] input[name="intelligible"]').check();
      await page.locator('[data-builder-section="about-project"] input[name="rights"]').check();
      await page.locator('[data-builder-section="about-project"] textarea[name="cta"]').fill(
        "Book at river.example",
      );
    },
  },
  {
    id: "short_form_video_editing",
    slug: "short-form-video-editing",
    name: "Short-Form Video Editing",
    price: "$249",
    shot: "builder-short-form-desktop.jpg",
    mobileShot: "builder-short-form-mobile.jpg",
    mustFields: ["markedMoments", "usableFootage"],
    mustNotFields: ["qualifyingSource", "intelligible"],
    supportCount: 3,
    fill: async (page) => {
      await page.locator('[data-builder-section="about-project"] textarea[name="purpose"]').fill(
        "Promote the weekend class.",
      );
      await page.locator('[data-builder-section="about-project"] input[name="markedMoments"]').check();
      await page.locator('[data-builder-section="about-project"] input[name="usableFootage"]').check();
      await page.locator('[data-builder-section="about-project"] input[name="rights"]').check();
    },
  },
  {
    id: "social_and_promo_graphics",
    slug: "social-promo-graphics",
    name: "Social & Promo Graphics",
    price: "$199",
    shot: "builder-social-desktop.jpg",
    mobileShot: "builder-social-mobile.jpg",
    mustFields: ["rights", "facts"],
    mustNotFields: ["qualifyingSource", "markedMoments", "intelligible"],
    supportCount: 5,
    fill: async (page) => {
      await page.locator('[data-builder-section="about-project"] textarea[name="purpose"]').fill(
        "Spring menu launch.",
      );
      await page.locator('[data-builder-section="about-project"] input[name="rights"]').check();
    },
  },
];

const browser = await chromium.launch({ channel: "chrome" });
mkdirSync(OUT, { recursive: true });
const desktop = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
});

for (const item of packages) {
  await desktop.goto(`${BASE}/package/${item.slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await desktop.evaluate(() => sessionStorage.removeItem("studioCondensedJourneyDraft.v1"));
  await desktop.locator("[data-package-cta='start']").click();
  await desktop.waitForURL("**/project-builder**");
  await desktop.waitForSelector("[data-journey-page='build-your-project']");
  await desktop.locator('#about-you input[name="name"]').fill("Maya Rivera");
  await desktop.locator('#about-you input[name="email"]').fill("maya@example.com");
  await desktop.locator('#about-you button[type="submit"]').click();
  await desktop.waitForSelector('[data-builder-section="about-project"] textarea[name="purpose"]');
  const present = [];
  const missing = [];
  for (const field of item.mustFields) {
    const count = await desktop.locator(`[name="${field}"]`).count();
    if (count === 1) present.push(field);
    else missing.push(field);
  }
  const leaked = [];
  for (const field of item.mustNotFields) {
    if ((await desktop.locator(`[name="${field}"]`).count()) > 0) leaked.push(field);
  }
  await shot(desktop, item.shot);
  row(
    `${item.name} project questions`,
    "/project-builder",
    "Package-specific, no leakage",
    `present=${present.join(",")} leaked=${leaked.join(",") || "none"}`,
    missing.length === 0 && leaked.length === 0,
  );
  await item.fill(desktop);
  await desktop.locator('[data-builder-section="about-project"] button[type="submit"]').click();
  await desktop.waitForSelector('#upload textarea[name="materials"]');
  await desktop.locator('#upload textarea[name="materials"]').fill("source-notes.txt");
  await desktop.locator('#upload button[type="submit"]').click();
  await desktop.waitForSelector('#preferences button[type="submit"]');
  await desktop.locator('#preferences button[type="submit"]').click();
  await desktop.waitForSelector("#support");
  const supportRows = await desktop.locator("#support .studio-journey__support-row").count();
  row(
    `${item.name} support options`,
    "/project-builder",
    String(item.supportCount),
    String(supportRows),
    supportRows === item.supportCount,
  );
  const skipButtons = desktop.locator("#support button", { hasText: "Skip" });
  const skipCount = await skipButtons.count();
  for (let index = 0; index < skipCount; index += 1) {
    await skipButtons.nth(index).click();
  }
  await desktop.locator("#support").getByRole("button", { name: "Save and continue" }).click();
  await desktop.locator("[data-builder-cta='review']").click();
  await desktop.waitForURL("**/checkout");
  const review = await body(desktop);
  row(
    `${item.name} Review persistence`,
    "/checkout",
    `${item.name} ${item.price} Maya Rivera`,
    review.includes(item.price) ? "package + customer present" : "missing",
    review.includes(item.name) &&
      review.includes(item.price) &&
      review.includes("Maya Rivera") &&
      !review.includes("Project Intake opens"),
  );
  await desktop.locator("a", { hasText: "Back to Build Your Project" }).first().click();
  await desktop.waitForURL("**/project-builder**");
  const backName = await desktop.evaluate(() => {
    const raw = sessionStorage.getItem("studioCondensedJourneyDraft.v1");
    return raw ? JSON.parse(raw) : {};
  });
  row(
    `${item.name} Back keeps state`,
    "/project-builder",
    "Maya Rivera + package",
    `${backName.aboutYou?.name} ${backName.packageId}`,
    backName.aboutYou?.name === "Maya Rivera" && backName.packageId === item.id,
  );
}

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
for (const item of packages) {
  await mobile.goto(`${BASE}/project-builder?package=${item.id}`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await mobile.waitForSelector("[data-journey-page='build-your-project']");
  await mobile.locator("[data-builder-section='about-project'] button.studio-homepage__card-link").click();
  await mobile.waitForSelector('[data-builder-section="about-project"] textarea[name="purpose"]');
  await shot(mobile, item.mobileShot);
  let mobilePresent = 0;
  const mobileLeaked = [];
  for (const field of item.mustFields) {
    if ((await mobile.locator(`[name="${field}"]`).count()) === 1) mobilePresent += 1;
  }
  for (const field of item.mustNotFields) {
    if ((await mobile.locator(`[name="${field}"]`).count()) > 0) mobileLeaked.push(field);
  }
  row(
    `Mobile ${item.name} builder`,
    "/project-builder",
    "Package-specific questions",
    `present=${mobilePresent} leaked=${mobileLeaked.join(",") || "none"}`,
    mobilePresent === item.mustFields.length && mobileLeaked.length === 0,
  );
}

writeFileSync(path.join(OUT, "PACKAGE-AWARE-BUILDER-AUDIT.json"), JSON.stringify({ rows }, null, 2));
await browser.close();
const failed = rows.filter((item) => item["PASS / FAIL"] === "FAIL");
console.log(JSON.stringify({ total: rows.length, failed: failed.length, failedRows: failed }, null, 2));
if (failed.length) process.exitCode = 1;
