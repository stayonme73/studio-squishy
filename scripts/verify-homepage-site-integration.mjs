/**
 * Verify approved homepage is the front door, then capture existing-room inventory.
 * Does not implement Page 2. Does not change original rooms.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(
  ROOT,
  "docs/launch/studio-homepage-original-site-integration-1/INVENTORY",
);

async function shot(page, name) {
  await page.screenshot({
    path: path.join(OUT, name),
    type: "jpeg",
    quality: 88,
  });
}

const browser = await chromium.launch({ channel: "chrome" });
mkdirSync(OUT, { recursive: true });
const report = {
  frontDoor: "/",
  lobbyAlias: "/studio-lobby",
  checks: {},
  routes: {},
};

const desktop = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 2,
});

await desktop.goto("http://127.0.0.1:3000/", {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await desktop.waitForSelector("[data-studio-homepage='page-1']", { timeout: 30000 });
report.checks.rootIsHomepage = true;
report.checks.getStartedHref = await desktop.getAttribute(
  "a.studio-homepage__btn-primary",
  "href",
);
report.checks.myStudioHref = await desktop.getAttribute(
  "a.studio-homepage__btn-secondary[href='/studio-board']",
  "href",
);
report.checks.voiceHref = await desktop.getAttribute(
  "a.studio-homepage__voice-entry",
  "href",
);
report.checks.viewDetailsInline = await desktop.locator(
  "[data-package-detail='inline']",
).count();
await shot(desktop, "01-homepage-desktop.jpg");

await desktop.locator("a.studio-homepage__btn-primary").first().click();
await desktop.waitForTimeout(400);
report.checks.getStartedStayedOnHome = desktop.url().replace(/\/$/, "").endsWith("3000");
report.checks.getStartedHash = await desktop.evaluate(() => location.hash);
await shot(desktop, "02-homepage-packages-after-get-started.jpg");

await desktop.locator("[data-package-detail='inline']").first().click();
await desktop.waitForTimeout(300);
report.checks.viewDetailsStayedOnHome = desktop.url().includes("127.0.0.1:3000");
report.checks.viewDetailsExpanded = await desktop.locator(
  ".studio-homepage__card-detail",
).count();
await shot(desktop, "03-homepage-view-details-expanded.jpg");

await desktop.goto("http://127.0.0.1:3000/studio-lobby", {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await desktop.waitForSelector("[data-studio-homepage='page-1']", { timeout: 30000 });
report.checks.studioLobbyIsHomepage = true;
await shot(desktop, "04-studio-lobby-is-homepage.jpg");

for (const [name, url] of [
  ["conversation", "http://127.0.0.1:3000/studio-conversation-room"],
  ["help", "http://127.0.0.1:3000/help-center?from=studio-lobby"],
  ["board", "http://127.0.0.1:3000/studio-board"],
  ["deliverables", "http://127.0.0.1:3000/deliverables"],
  ["project-builder", "http://127.0.0.1:3000/project-builder"],
  ["route-map", "http://127.0.0.1:3000/route-map"],
  ["studio-guide", "http://127.0.0.1:3000/studio-guide"],
  ["checkout", "http://127.0.0.1:3000/checkout"],
]) {
  const response = await desktop.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await desktop.waitForTimeout(500);
  const finalUrl = desktop.url();
  report.routes[name] = {
    requested: url,
    status: response?.status() ?? null,
    finalUrl,
    title: await desktop.title(),
  };
  await shot(desktop, `room-${name}.jpg`);
}

await desktop.goBack();
await desktop.waitForTimeout(200);
report.checks.backFromLastRoom = desktop.url();

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
await mobile.goto("http://127.0.0.1:3000/", {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await mobile.waitForSelector("[data-studio-homepage='page-1']", { timeout: 30000 });
await shot(mobile, "05-homepage-mobile.jpg");
await mobile.locator("a.studio-homepage__btn-primary").first().click();
await mobile.waitForTimeout(400);
await shot(mobile, "06-homepage-mobile-packages.jpg");
await mobile.goto("http://127.0.0.1:3000/studio-conversation-room", {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await mobile.waitForTimeout(500);
await shot(mobile, "room-conversation-mobile.jpg");
await mobile.goto("http://127.0.0.1:3000/help-center?from=studio-lobby", {
  waitUntil: "domcontentloaded",
  timeout: 90000,
});
await mobile.waitForTimeout(400);
await shot(mobile, "room-help-mobile.jpg");

await browser.close();
writeFileSync(
  path.join(OUT, "VERIFY.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
