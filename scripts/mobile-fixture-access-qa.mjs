/**
 * Builder QA — Samsung-facing Materials fixture tap on the current HTTPS LAN.
 * Uses touch/pointer tap, not programmatic click. Does not replay Payment/Intake/Auth.
 *
 * Usage: node scripts/mobile-fixture-access-qa.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const LAN = "https://10.1.10.208:3000";
const PNG_PATH = "/mobile-customer-journey-cert-1/pine-petal-ordinary-mark.png";
const DOWNLOAD_PATH = "/api/local-test-fixtures/pine-petal-ordinary-mark";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function inspect(request, url) {
  const response = await request.get(url);
  return {
    url,
    status: response.status(),
    contentType: response.headers()["content-type"],
    disposition: response.headers()["content-disposition"],
    location: response.headers()["location"],
  };
}

function boardState() {
  const campaignRaw = localStorage.getItem("studio-squishy:current-campaign");
  const campaign = campaignRaw ? JSON.parse(campaignRaw) : null;
  const text = document.body?.innerText ?? "";
  return {
    url: location.href,
    campaignId: campaign?.campaignId ?? null,
    paidAt: campaign?.paymentReceivedAt ?? null,
    intakeAt: campaign?.routeMapIntakeSubmittedAt ?? null,
    hasPaidInFull: /Paid in Full/i.test(text),
    hasMaya: /Maya.?s Mobile Boutique/i.test(text),
  };
}

async function tapControl(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("control has no box");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.touchscreen.tap(x, y);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { ok: false, checks: {}, proofs: [], pageErrors: [], interaction: "touchscreen.tap" };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", (error) => {
    const message = String(error);
    if (message.includes("appendChild")) return;
    report.pageErrors.push(message.slice(0, 400));
  });

  try {
    report.staticLocal = await inspect(context.request, `${BASE}${PNG_PATH}`);
    report.staticLan = await inspect(context.request, `${LAN}${PNG_PATH}`);
    report.downloadLocal = await inspect(context.request, `${BASE}${DOWNLOAD_PATH}`);
    report.downloadLan = await inspect(context.request, `${LAN}${DOWNLOAD_PATH}`);
    report.checks.staticPng200 =
      report.staticLocal.status === 200 && report.staticLan.status === 200;
    report.checks.download200 =
      report.downloadLocal.status === 200 && report.downloadLan.status === 200;
    report.checks.downloadAttachment = /attachment/i.test(
      String(report.downloadLocal.disposition),
    );

    await page.goto(`${LAN}/sign-in?from=%2Fstudio-board`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByRole("button", { name: "Continue as Customer-One" }).tap();
    await page.waitForURL(/\/studio-board/, { timeout: 20000 });
    await page.getByRole("heading", { name: "Studio Board" }).waitFor({
      timeout: 15000,
    });
    await page.getByText("Paid in Full", { exact: false }).waitFor({ timeout: 20000 });
    const boardControl = page.getByRole("link", { name: "Save Studio fixture file" });
    await boardControl.waitFor({ timeout: 10000 });
    report.checks.boardControlVisible = await boardControl.isVisible();
    report.beforeTap = await page.evaluate(boardState);
    report.proofs.push(await shot(page, "fixture-access-01-board-control.png"));

    await tapControl(page, boardControl);
    await page.waitForURL(/\/local-test-fixtures/, { timeout: 15000 });
    report.checks.sameTabFixturePage = /\/local-test-fixtures/.test(page.url());
    await page.getByRole("heading", { name: "Studio test file" }).waitFor({
      timeout: 10000,
    });
    const preview = page.locator("img[alt='Pine and Petal ordinary mark test file']");
    await preview.waitFor({ timeout: 10000 });
    report.checks.previewRendered = (await preview.evaluate((img) => {
      const node = img;
      return Boolean(node.complete && node.naturalWidth > 0);
    })) === true;
    report.visual = await page.evaluate(() => {
      const pageEl = document.querySelector(".local-test-fixture-page");
      const card = document.querySelector(".local-test-fixture-card");
      const cta = document.querySelector(
        ".local-test-fixture-page .lobby-entry-film__cta",
      );
      const title = document.querySelector(
        ".local-test-fixture-page .utility-title",
      );
      const shell = document.querySelector(".studio-environment-shell__plate");
      const spine = document.querySelector("[data-mobile-customer-spine]");
      const css = (el, prop) =>
        el ? getComputedStyle(el).getPropertyValue(prop) : null;
      const rgb = (value) => {
        const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return match
          ? [Number(match[1]), Number(match[2]), Number(match[3])]
          : null;
      };
      const ctaRgb = rgb(css(cta, "background-color"));
      const pageRgb = rgb(css(pageEl, "background-color"));
      const titleRgb = rgb(css(title, "color"));
      const near = (a, b, slack) =>
        Boolean(a && b && Math.abs(a[0] - b[0]) <= slack && Math.abs(a[1] - b[1]) <= slack && Math.abs(a[2] - b[2]) <= slack);
      return {
        hasSpine: Boolean(spine),
        hasLoungePlate: Boolean(shell),
        hasGlassTile: Boolean(card?.classList.contains("studio-tile--standard")),
        hasDenimCta: Boolean(cta),
        pageBackground: css(pageEl, "background-color"),
        cardBackground: css(card, "background-color"),
        cardBackdrop: card
          ? getComputedStyle(card, "::before").getPropertyValue("backdrop-filter")
          : null,
        ctaBackground: css(cta, "background-color"),
        titleColor: css(title, "color"),
        pageIsTransparent:
          css(pageEl, "background-color") === "rgba(0, 0, 0, 0)" ||
          css(pageEl, "background-color") === "transparent" ||
          (pageRgb && pageRgb[0] === 0 && pageRgb[1] === 0 && pageRgb[2] === 0 && String(css(pageEl, "background-color")).includes("0")),
        denimCta: near(ctaRgb, [84, 124, 146], 8),
        inkTitle: near(titleRgb, [46, 43, 40], 12),
      };
    });
    report.checks.loungeShell = report.visual.hasSpine && report.visual.hasLoungePlate;
    report.checks.lightGlassTile = report.visual.hasGlassTile === true;
    report.checks.pageNotOpaqueCream = report.visual.pageIsTransparent === true;
    report.checks.denimPrimary = report.visual.denimCta === true;
    report.checks.inkTitle = report.visual.inkTitle === true;
    report.proofs.push(await shot(page, "fixture-access-02-page.png"));
    report.proofs.push(await shot(page, "fixture-page-lounge-glass-360.png"));

    const saveLink = page.getByRole("link", { name: "Save this file to the phone" });
    await page.waitForFunction(
      () =>
        document.querySelector("[data-local-test-fixture-save='blob']") !== null,
      { timeout: 10000 },
    );
    const saveHref = await saveLink.getAttribute("href");
    report.saveHref = saveHref;
    report.checks.saveHrefIsBlob = String(saveHref).startsWith("blob:");
    report.checks.saveHrefNotHttpsApi = !String(saveHref).includes(
      "/api/local-test-fixtures",
    );

    const apiGetsAfterReady = [];
    page.on("request", (request) => {
      if (request.method() === "GET" && request.url().includes("/api/local-test-fixtures/")) {
        apiGetsAfterReady.push(request.url());
      }
    });

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }),
      tapControl(page, saveLink),
    ]);
    report.downloadFilename = download.suggestedFilename();
    report.checks.downloadSaved = report.downloadFilename === "pine-petal-ordinary-mark.png";
    const savedPath = path.join(OUT, "fixture-download-saved-pine-petal-ordinary-mark.png");
    await download.saveAs(savedPath);
    const savedBytes = await readFile(savedPath);
    report.savedBytes = savedBytes.byteLength;
    report.checks.downloadPngMagic =
      savedBytes[0] === 0x89 &&
      savedBytes[1] === 0x50 &&
      savedBytes[2] === 0x4e &&
      savedBytes[3] === 0x47;
    report.checks.saveDidNotHitHttpsApi = apiGetsAfterReady.length === 0;
    report.proofs.push(savedPath);

    await tapControl(page, page.getByRole("link", { name: "Return to Studio Board" }));
    await page.waitForURL(/\/studio-board/, { timeout: 15000 });
    await page.getByText("Paid in Full", { exact: false }).waitFor({ timeout: 20000 });
    report.afterReturn = await page.evaluate(boardState);
    report.checks.returnToBoard = /\/studio-board/.test(page.url());
    report.checks.returnKeptMaya = report.afterReturn.hasMaya === true;
    report.checks.returnKeptPaid = Boolean(report.afterReturn.paidAt);
    report.checks.returnKeptIntake = Boolean(report.afterReturn.intakeAt);
    report.proofs.push(await shot(page, "fixture-access-03-return.png"));

    const failed = Object.entries(report.checks).filter(([, value]) => value !== true);
    report.ok = failed.length === 0 && report.pageErrors.length === 0;
    report.failed = failed.map(([key]) => key);
  } catch (error) {
    report.ok = false;
    report.error = String(error);
    try {
      report.proofs.push(await shot(page, "fixture-access-error.png"));
    } catch {
      /* ignore */
    }
  } finally {
    await writeFile(
      path.join(OUT, "fixture-access-report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    await browser.close();
  }

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
