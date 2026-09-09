/**
 * Builder QA — Materials mobile presentation (Lounge + light glass, no rights submit).
 * Usage: node scripts/mobile-materials-presentation-qa.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const LAN = "https://10.1.10.208:3000";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

function rgbOf(value) {
  const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function isOpaqueBrown(value) {
  const rgb = rgbOf(value);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  const alphaMatch = String(value).match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/);
  const alpha = alphaMatch ? Number(alphaMatch[4]) : 1;
  if (alpha < 0.4) return false;
  const brightness = (r + g + b) / 3;
  if (brightness > 228) return false;
  return r > 140 && g > 110 && b > 70 && r > b && r - b > 20 && brightness < 215;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { ok: false, checks: {}, proofs: [], pageErrors: [] };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on("pageerror", (error) => {
    const message = String(error);
    if (message.includes("appendChild")) return;
    report.pageErrors.push(message.slice(0, 400));
  });

  try {
    await page.goto(`${LAN}/sign-in?from=%2Fstudio-board`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByRole("button", { name: "Continue as Customer-One" }).tap();
    await page.waitForURL(/\/studio-board/, { timeout: 20000 });
    await page.getByRole("heading", { name: "Studio Board" }).waitFor({ timeout: 15000 });
    await page.getByText("Paid in Full", { exact: false }).waitFor({ timeout: 20000 });
    await page.getByText("Maya’s Mobile Boutique", { exact: false }).waitFor({ timeout: 10000 });

    await page.getByRole("button", { name: /Add more \(optional\)/i }).waitFor({ timeout: 20000 });
    await page.waitForFunction(
      () =>
        !/Loading materials/i.test(
          document.querySelector(".sb-materials-glance")?.innerText || "",
        ),
      { timeout: 20000 },
    );
    const glance = page.locator(".sb-materials-glance");
    await glance.waitFor({ timeout: 15000 });
    const nextCard = page.locator(".sb-card--materials-next").first();
    await nextCard.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const next = document.querySelector(".sb-card--materials-next");
      const review = document.querySelector(".studio-review-mobile-tab");
      if (!next || !review) return;
      const nextBox = next.getBoundingClientRect();
      const reviewBox = review.getBoundingClientRect();
      if (nextBox.bottom > reviewBox.top - 8) {
        window.scrollBy(0, nextBox.bottom - reviewBox.top + 12);
      }
    });
    report.proofs.push(await shot(page, "materials-presentation-01-glance-360.png"));

    report.visual = await page.evaluate(() => {
      const glanceNode = document.querySelector(".sb-materials-glance");
      const intake = document.querySelector(".sb-card--materials");
      const item = document.querySelector(".sb-materials-board-list__item");
      const lounge = document.querySelector(".studio-environment-shell__plate");
      const review = document.querySelector(".studio-review-mobile-tab");
      const css = (el, prop) => (el ? getComputedStyle(el).getPropertyValue(prop) : null);
      const text = document.body?.innerText ?? "";
      const reviewBox = review?.getBoundingClientRect();
      const glanceBefore = glanceNode
        ? getComputedStyle(glanceNode, "::before").getPropertyValue("background-color")
        : null;
      const intakeBefore = intake
        ? getComputedStyle(intake, "::before").getPropertyValue("background-color")
        : null;
      const nextBox = document.querySelector(".sb-card--materials-next")?.getBoundingClientRect();
      const nextObstructed =
        Boolean(nextBox && reviewBox) &&
        nextBox.bottom > reviewBox.top + 2 &&
        nextBox.top < reviewBox.bottom;
      const send = [...document.querySelectorAll("button")].find((el) =>
        /Send to Studio/i.test(el.textContent || ""),
      );
      return {
        hasLounge: Boolean(lounge),
        hasGlance: Boolean(glanceNode),
        glanceBg: css(glanceNode, "background-color"),
        glanceBefore,
        intakeBg: css(intake, "background-color"),
        intakeBefore,
        itemBg: css(item, "background-color"),
        intakeItemBg: css(document.querySelector(".sb-materials-intake__item"), "background-color"),
        caughtUpVisible: /Materials caught up/i.test(text),
        underReviewRepeat: /No further action is needed right now/i.test(text),
        passedChecksRepeat: /passed your rights confirmations and technical checks/i.test(text),
        hasReceived: /Materials Received/i.test(text),
        hasStillNeed: /Materials We Still Need/i.test(text),
        hasNext: /What You Should Do Next/i.test(text),
        addMore: /Add more \(optional\)/i.test(text),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        reviewHeight: reviewBox ? Math.round(reviewBox.height) : 0,
        nextObstructed,
        sendVisible: Boolean(send),
      };
    });

    report.checks.loungeVisible = report.visual.hasLounge === true;
    report.checks.glancePresent = report.visual.hasGlance === true;
    report.checks.glanceNotOpaqueBrown =
      !isOpaqueBrown(report.visual.glanceBg) && !isOpaqueBrown(report.visual.glanceBefore);
    report.checks.intakeNotOpaqueBrown =
      !isOpaqueBrown(report.visual.intakeBg) && !isOpaqueBrown(report.visual.intakeBefore);
    report.checks.itemNotOpaqueBrown = !isOpaqueBrown(report.visual.itemBg);
    report.checks.intakeItemNotOpaqueBrown = !isOpaqueBrown(report.visual.intakeItemBg);
    report.checks.caughtUpNotRepeated = report.visual.caughtUpVisible === false;
    report.checks.underReviewNotRepeated = report.visual.underReviewRepeat === false;
    report.checks.clearedParagraphHidden = report.visual.passedChecksRepeat === false;
    report.checks.glanceHasHaveNeedNext =
      report.visual.hasReceived && report.visual.hasStillNeed && report.visual.hasNext;
    report.checks.addMoreVisible = report.visual.addMore === true;
    report.checks.noHorizontalOverflow = report.visual.horizontalOverflow === false;
    report.checks.nextNotObstructed = report.visual.nextObstructed === false;

    const addMore = page.getByRole("button", { name: /Add more \(optional\)/i });
    await addMore.scrollIntoViewIfNeeded();
    const expanded = await addMore.getAttribute("aria-expanded");
    if (expanded !== "true") {
      await addMore.tap();
    }
    await page.getByText(/If you have a logo file/i).waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: "Send to Studio" }).first().waitFor({ timeout: 10000 });
    await page.locator(".sb-materials-intake__rights").first().waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: "Send to Studio" }).first().scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "materials-presentation-02-rights-360.png"));

    report.form = await page.evaluate(() => {
      const rights = document.querySelector(".sb-materials-intake__rights");
      const send = [...document.querySelectorAll("button")].find((el) =>
        /Send to Studio/i.test(el.textContent || ""),
      );
      const review = document.querySelector(".studio-review-mobile-tab");
      const sendBox = send?.getBoundingClientRect();
      const reviewBox = review?.getBoundingClientRect();
      const overlap =
        Boolean(sendBox && reviewBox) &&
        sendBox.top < reviewBox.bottom &&
        sendBox.bottom > reviewBox.top &&
        sendBox.left < reviewBox.right &&
        sendBox.right > reviewBox.left;
      const text = rights?.innerText ?? "";
      return {
        hasRightsTitle: /Rights for this file/i.test(text),
        hasAuthority: /I own this file, or I have permission/i.test(text),
        hasCommercial: /commercial work for this project/i.test(text),
        hasCrop: /crop, resize, or adapt/i.test(text),
        hasPeople: /recognizable people/i.test(text),
        hasThirdParty: /third-party/i.test(text),
        sendVisible: Boolean(send),
        sendObstructed: overlap,
        chooseFile: /Choose file/i.test(document.body?.innerText ?? ""),
        neededForRepeat: /Needed for Make Me a Flyer/i.test(document.body?.innerText ?? ""),
      };
    });
    report.checks.optionalReasonNotRepeated = report.form.neededForRepeat === false;
    report.checks.rightsComplete =
      report.form.hasAuthority &&
      report.form.hasCommercial &&
      report.form.hasCrop &&
      report.form.hasPeople &&
      report.form.hasThirdParty;
    report.checks.sendReachable = report.form.sendVisible === true;
    report.checks.sendNotObstructed = report.form.sendObstructed === false;
    report.checks.chooseFileVisible = report.form.chooseFile === true;

    const failed = Object.entries(report.checks).filter(([, value]) => value !== true);
    report.ok = failed.length === 0 && report.pageErrors.length === 0;
    report.failed = failed.map(([key]) => key);
  } catch (error) {
    report.ok = false;
    report.error = String(error);
    try {
      report.proofs.push(await shot(page, "materials-presentation-error.png"));
    } catch {
      /* ignore */
    }
  } finally {
    await writeFile(
      path.join(OUT, "materials-presentation-report.json"),
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
