/**
 * Builder QA — full Studio Board page at Samsung width, before Review Room.
 * Usage: node scripts/mobile-board-full-page-qa.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { chromium } from "playwright";

const { PNG } = createRequire(import.meta.url)("pngjs");

const LAN = "https://10.1.10.208:3000";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

function avgPng(buf) {
  const png = PNG.sync.read(buf);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    r += png.data[i];
    g += png.data[i + 1];
    b += png.data[i + 2];
    n += 1;
  }
  return {
    r: r / n,
    g: g / n,
    b: b / n,
    lum: (r + g + b) / (3 * n),
  };
}

async function avgClip(page, clip) {
  const buf = await page.screenshot({ clip, type: "png" });
  return avgPng(buf);
}

function looksTeal(sample) {
  return sample.g >= sample.b - 4 && sample.g > sample.r + 15;
}

function isMasterGlassFill(value) {
  const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?/);
  if (!match) return false;
  const alpha = match[4] != null ? Number(match[4]) : 1;
  return Number(match[1]) >= 230 && Number(match[2]) >= 225 && alpha >= 0.4 && alpha <= 0.55;
}

async function shot(page, name, fullPage = false) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage });
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

function isDenim(value) {
  const rgb = rgbOf(value);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return Math.abs(r - 84) <= 8 && Math.abs(g - 124) <= 8 && Math.abs(b - 146) <= 8;
}

function isIvory(value) {
  const rgb = rgbOf(value);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return r >= 230 && g >= 228 && b >= 220 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18;
}

function isYellow(value) {
  const rgb = rgbOf(value);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return Math.abs(r - 247) <= 12 && Math.abs(g - 201) <= 16 && b <= 24;
}

function isInk(value) {
  const rgb = rgbOf(value);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return Math.abs(r - 46) <= 12 && Math.abs(g - 43) <= 12 && Math.abs(b - 40) <= 12;
}

function isEucalyptus(value) {
  const rgb = rgbOf(value);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return Math.abs(r - 69) <= 10 && Math.abs(g - 107) <= 10 && Math.abs(b - 90) <= 10;
}

function isCoral(value) {
  const rgb = rgbOf(value);
  if (!rgb) return false;
  const [r, g, b] = rgb;
  return Math.abs(r - 217) <= 18 && Math.abs(g - 78) <= 18 && Math.abs(b - 43) <= 18;
}

function looksYellow(sample) {
  return (
    Boolean(sample) &&
    sample.r > 170 &&
    sample.g > 130 &&
    sample.b < 80 &&
    sample.r - sample.b > 90
  );
}

function luminance(value) {
  const rgb = rgbOf(value);
  if (!rgb) return 0;
  return (rgb[0] + rgb[1] + rgb[2]) / 3;
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

  const probe = async () =>
    page.evaluate(() => {
      const css = (el, prop) => (el ? getComputedStyle(el).getPropertyValue(prop) : null);
      const before = (el) =>
        el ? getComputedStyle(el, "::before").getPropertyValue("background-color") : null;
      const beforeFilter = (el) =>
        el ? getComputedStyle(el, "::before").getPropertyValue("backdrop-filter") : null;
      const current = document.querySelector(".sb-card--current");
      const progress = document.querySelector(".sb-card--progress");
      const snapshot = document.querySelector(".sb-card--project-snapshot");
      const glance = document.querySelector(".sb-materials-glance");
      const comm = document.querySelector(".sb-card--project-communication");
      const refund = document.querySelector(".sb-card--refund-request");
      const fixture = document.querySelector(".sb-local-test-fixture");
      const lounge = document.querySelector(".studio-environment-shell__plate");
      const frost = document.querySelector(".studio-environment-shell__frost");
      const veil = document.querySelector(".studio-environment-shell__veil");
      const review = document.querySelector(".studio-review-mobile-tab");
      const sidebar = document.querySelector(".sb-sidebar");
      const refundSubmit = document.querySelector(".sb-refund-request__submit");
      const send = document.querySelector(".sb-project-communication__submit");
      const fixtureBtn = document.querySelector(".sb-local-test-fixture__button");
      const activeNav = document.querySelector(".sb-nav__item--active");
      const signOut = document.querySelector(".sb-nav .sb-sign-out");
      const signOutControl = document.querySelector(".sb-nav .sb-sign-out__control");
      const helpNav = [...document.querySelectorAll(".sb-nav__item")].find((el) =>
        /Help Center/i.test(el.textContent || ""),
      );
      const buttonPaint = (el) =>
        el
          ? {
              bg: css(el, "background-color"),
              color: css(el, "color"),
              opacity: css(el, "opacity"),
              disabled: el.disabled,
            }
          : null;
      const overlap = (el) => {
        const box = el?.getBoundingClientRect();
        const reviewBox = review?.getBoundingClientRect();
        return (
          Boolean(box && reviewBox) &&
          box.top < reviewBox.bottom &&
          box.bottom > reviewBox.top &&
          box.left < reviewBox.right &&
          box.right > reviewBox.left
        );
      };
      const typeOf = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const s = getComputedStyle(el);
        return {
          size: parseFloat(s.fontSize),
          weight: s.fontWeight,
          color: s.color,
          transform: s.textTransform,
          bg: s.backgroundColor,
          display: s.display,
          visibility: s.visibility,
        };
      };
      const text = document.body?.innerText ?? "";
      const currentText = current?.innerText ?? "";
      const commText = comm?.innerText ?? "";
      const refundText = refund?.innerText ?? "";
      return {
        hasLounge: Boolean(lounge),
        frostDisplay: css(frost, "display"),
        veilDisplay: css(veil, "display"),
        plateFilter: css(lounge, "filter"),
        sidebarBackdrop: css(sidebar, "backdrop-filter"),
        currentBackdrop: css(current, "backdrop-filter"),
        fixtureHostBackdrop: css(fixture, "backdrop-filter"),
        sidebarBg: css(sidebar, "background-color"),
        sidebarImage: css(sidebar, "background-image"),
        sidebarBefore: before(sidebar),
        sidebarBeforeFilter: beforeFilter(sidebar),
        currentBeforeFilter: beforeFilter(current),
        fixtureBeforeFilter: beforeFilter(fixture),
        activeNavBg: css(activeNav, "background-color"),
        activeNavColor: css(activeNav, "color"),
        activeNavBorder: css(activeNav, "border-top-color"),
        brandTheColor: css(document.querySelector(".sb-brand__the"), "color"),
        brandNameColor: css(document.querySelector(".sb-brand__name"), "color"),
        titleColor: css(document.querySelector(".sb-header-v3__title"), "color"),
        greetingColor: css(document.querySelector(".sb-header-v3__greeting"), "color"),
        nameColor: css(document.querySelector(".sb-header-v3__name"), "color"),
        nameBg: css(document.querySelector(".sb-header-v3__name"), "background-color"),
        signOutPaint: buttonPaint(signOut),
        signOutBorder: css(signOut, "border-top-color"),
        loungeShellPos: css(document.querySelector(".studio-environment-shell"), "position"),
        loungeShellTop: css(document.querySelector(".studio-environment-shell"), "top"),
        loungePlateTransform: css(lounge, "transform"),
        signOutAlignsHelp: (() => {
          if (!helpNav || !signOut) return false;
          const help = helpNav.getBoundingClientRect();
          const sign = signOut.getBoundingClientRect();
          const helpIcon = helpNav.querySelector(".sb-nav__icon");
          const signIcon = signOut.querySelector(".sb-nav__icon");
          if (!helpIcon || !signIcon) return false;
          const helpIconBox = helpIcon.getBoundingClientRect();
          const signIconBox = signIcon.getBoundingClientRect();
          return (
            Math.abs(help.left - sign.left) <= 2 &&
            Math.abs(helpIconBox.left - signIconBox.left) <= 2
          );
        })(),
        helpLeft: helpNav ? Math.round(helpNav.getBoundingClientRect().left) : null,
        signLeft: signOut ? Math.round(signOut.getBoundingClientRect().left) : null,
        helpWidth: helpNav ? Math.round(helpNav.getBoundingClientRect().width) : null,
        signWidth: signOut ? Math.round(signOut.getBoundingClientRect().width) : null,
        helpIconLeft: (() => {
          const icon = helpNav?.querySelector(".sb-nav__icon");
          return icon ? Math.round(icon.getBoundingClientRect().left) : null;
        })(),
        signIconLeft: (() => {
          const icon = signOut?.querySelector(".sb-nav__icon");
          return icon ? Math.round(icon.getBoundingClientRect().left) : null;
        })(),
        signOutControlOpacity: css(signOutControl, "opacity"),
        signOutHasIcon: Boolean(signOut?.querySelector(".sb-nav__icon svg")),
        signOutAsWideAsHelp: (() => {
          if (!helpNav || !signOut) return false;
          const help = helpNav.getBoundingClientRect();
          const sign = signOut.getBoundingClientRect();
          return sign.width + 0.5 >= help.width && sign.width <= help.width + 8;
        })(),
        signOutNotLongBar: (() => {
          if (!helpNav || !signOut) return false;
          const help = helpNav.getBoundingClientRect();
          const sign = signOut.getBoundingClientRect();
          return sign.width <= help.width + 8;
        })(),
        reviewNavHeight: (() => {
          const review = [...document.querySelectorAll(".sb-nav__item")].find((el) =>
            /Review Room/i.test(el.textContent || ""),
          );
          return review ? Math.round(review.getBoundingClientRect().height) : null;
        })(),
        signOutHeight: signOut ? Math.round(signOut.getBoundingClientRect().height) : null,
        activeNavHeight: activeNav ? Math.round(activeNav.getBoundingClientRect().height) : null,
        notesPad: css(document.querySelector(".sb-visibility-continuity__notes"), "padding-left"),
        fixtureEyebrowColor: css(
          document.querySelector(".sb-local-test-fixture__eyebrow"),
          "color",
        ),
        fixtureBox: fixtureBtn
          ? {
              w: Math.round(fixtureBtn.getBoundingClientRect().width),
              h: Math.round(fixtureBtn.getBoundingClientRect().height),
            }
          : null,
        sendBox: send
          ? {
              w: Math.round(send.getBoundingClientRect().width),
              h: Math.round(send.getBoundingClientRect().height),
            }
          : null,
        refundBox: refundSubmit
          ? {
              w: Math.round(refundSubmit.getBoundingClientRect().width),
              h: Math.round(refundSubmit.getBoundingClientRect().height),
            }
          : null,
        sendPaint: buttonPaint(send),
        refundSubmitPaint: buttonPaint(refundSubmit),
        fixturePaint: buttonPaint(fixtureBtn),
        currentBefore: before(current),
        progressBefore: before(progress),
        snapshotBefore: before(snapshot),
        commBefore: before(comm),
        refundBefore: before(refund),
        fixtureBefore: before(fixture),
        glancePresent: Boolean(glance),
        hasRefund: Boolean(refund),
        hasFixture: Boolean(fixture),
        fixtureLocalLabel: /LOCAL DEVELOPER TEST/i.test(fixture?.innerText ?? ""),
        maya: /Maya/i.test(text),
        boutique: /Mobile Boutique/i.test(text),
        flyer: /Flyer|Make Me a Flyer|Make My Flyer/i.test(text),
        paid: /Paid in Full|\$69/i.test(text),
        pendingPayment: /Payment Pending/i.test(text),
        intake: /Intake submitted|Project Intake Received|Project Intake submitted/i.test(text),
        neededNothing: /Nothing is required from you right now/i.test(currentText),
        studioWorking: /What The Studio is working on/i.test(currentText),
        whoActs: /The Studio/i.test(currentText),
        duplicateIntakeLead: (
          currentText.match(
            /We've received your Project Intake and are preparing your project for the next stage/g,
          ) || []
        ).length,
        duplicateStage: /Project Stage/i.test(currentText),
        emptyRisk: /No risk or blocker is recorded/i.test(text),
        qaCheckIn: /Checking in on the flyer/i.test(commText),
        qaMarker: /\[Studio Builder QA\]/.test(commText),
        answeredRepeat: /Answered from the project record/i.test(commText),
        refundPolicyRepeat:
          /Refund eligibility is determined per service/i.test(refundText) &&
          /may be eligible or may be approved/i.test(refundText),
        refundBuildingConcepts: /Building Concepts/i.test(refundText),
        hasComposer: /Message to The Studio/i.test(commText),
        hasAsk: /Ask a question/i.test(commText),
        hasProblem: /Report a problem/i.test(commText),
        refundSubmitVisible: Boolean(refundSubmit),
        refundSubmitObstructed: overlap(refundSubmit),
        sendObstructed: overlap(send),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        refundText: refundText.slice(0, 700),
        type: {
          page: typeOf(".sb-header-v3__title"),
          card: typeOf(".sb-card--current .sb-card__tab"),
          greeting: typeOf(".sb-header-v3__greeting"),
          snapshotSub: typeOf(".sb-project-snapshot__heading"),
          statusSub: typeOf(".sb-visibility-continuity__heading"),
          field: typeOf(".sb-visibility-continuity__row dt"),
          value: typeOf(".sb-visibility-continuity__row dd"),
          campaignName: typeOf(".sb-current-campaign__name"),
          metricLabel: typeOf(".sb-current-campaign__label"),
          metricValue: typeOf(".sb-current-campaign__value"),
          journeyCurrent: typeOf(".sb-journey__step--current .sb-journey__label"),
          journeyDetail: typeOf(".sb-journey__step--current .sb-journey__detail"),
          journeyComplete: typeOf(".sb-journey__step--complete .sb-journey__label"),
          journeyUpcoming: typeOf(".sb-journey__step--upcoming .sb-journey__label"),
          updateHeading: typeOf(".sb-progress-panel__timeline-heading"),
          updateDate: typeOf(".sb-progress-panel__update-date"),
          updateMessage: typeOf(".sb-progress-panel__update-message"),
          viewAction: typeOf(".campaign-brief-actions__view"),
          commLabel: typeOf(".sb-project-communication__label"),
          refundLabel: typeOf(".sb-refund-request__label"),
          sendAction: typeOf(".sb-project-communication__submit"),
          refundAction: typeOf(".sb-refund-request__submit"),
          fixtureAction: typeOf(".sb-local-test-fixture__button"),
          fixtureEyebrow: typeOf(".sb-local-test-fixture__eyebrow"),
          snapshotPrimary: typeOf(".sb-project-snapshot__primary"),
          snapshotMeta: typeOf(".sb-project-snapshot__meta"),
          snapshotCheck: typeOf(".sb-project-snapshot__checks li"),
          currentDot: typeOf(".sb-journey__marker--current"),
        },
      };
    });

  try {
    await page.goto(`${LAN}/sign-in?from=%2Fstudio-board`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    const signInCta = page.getByRole("button", { name: "Sign in" });
    if (await signInCta.count()) {
      report.proofs.push(await shot(page, "board-page-ref-signin-cta-360.png"));
      report.proofs.push(
        await signInCta.screenshot({ path: path.join(OUT, "board-page-ref-signin-btn-only.png") }).then(
          () => path.join(OUT, "board-page-ref-signin-btn-only.png"),
        ),
      );
      report.signInPixels = avgPng(await signInCta.screenshot());
    }
    await page.getByRole("button", { name: "Continue as Customer-One" }).tap();
    await page.waitForURL(/\/studio-board/, { timeout: 20000 });
    await page.getByRole("heading", { name: "Studio Board" }).waitFor({ timeout: 15000 });
    await page.getByRole("heading", { name: /Maya/i }).waitFor({ timeout: 15000 });

    await page.evaluate(() => window.scrollTo(0, 0));
    report.proofs.push(await shot(page, "board-page-00-top-nav-360.png"));
    report.proofs.push(await shot(page, "board-type-00-top-360.png"));
    report.navPixels = await avgClip(page, { x: 24, y: 36, width: 312, height: 72 });
    report.loungeBeforeScroll = await page.evaluate(() => {
      const plate = document.querySelector(".studio-environment-shell__plate");
      const shell = document.querySelector(".studio-environment-shell");
      return {
        plateTop: plate?.getBoundingClientRect().top ?? null,
        plateLeft: plate?.getBoundingClientRect().left ?? null,
        shellTop: shell?.getBoundingClientRect().top ?? null,
        transform: plate ? getComputedStyle(plate).transform : null,
      };
    });
    await page.evaluate(() => {
      const main = document.querySelector("main");
      if (main) main.scrollTop = 900;
      window.scrollTo(0, 900);
    });
    await page.waitForTimeout(120);
    report.proofs.push(await shot(page, "board-type-00b-scrolled-lounge-360.png"));
    report.loungeAfterScroll = await page.evaluate(() => {
      const plate = document.querySelector(".studio-environment-shell__plate");
      const shell = document.querySelector(".studio-environment-shell");
      return {
        plateTop: plate?.getBoundingClientRect().top ?? null,
        plateLeft: plate?.getBoundingClientRect().left ?? null,
        shellTop: shell?.getBoundingClientRect().top ?? null,
      };
    });
    await page.evaluate(() => {
      const main = document.querySelector("main");
      if (main) main.scrollTop = 0;
      window.scrollTo(0, 0);
    });

    const fixtureBtn = page.locator(".sb-local-test-fixture__button").first();
    await fixtureBtn.scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "board-page-00b-fixture-rest-360.png"));
    report.proofs.push(
      await fixtureBtn
        .screenshot({ path: path.join(OUT, "board-page-00b-fixture-rest-btn-only.png") })
        .then(() => path.join(OUT, "board-page-00b-fixture-rest-btn-only.png")),
    );
    report.fixtureRestPixels = avgPng(await fixtureBtn.screenshot());
    report.fixtureRestPaint = await fixtureBtn.evaluate((el) => ({
      bg: getComputedStyle(el).backgroundColor,
      color: getComputedStyle(el).color,
    }));
    await fixtureBtn.evaluate((el) => el.setAttribute("data-fixture-pressed", "true"));
    await page.waitForTimeout(80);
    report.proofs.push(await shot(page, "board-page-00c-fixture-pressed-360.png"));
    report.proofs.push(
      await fixtureBtn
        .screenshot({ path: path.join(OUT, "board-page-00c-fixture-pressed-btn-only.png") })
        .then(() => path.join(OUT, "board-page-00c-fixture-pressed-btn-only.png")),
    );
    report.fixturePressedPixels = avgPng(await fixtureBtn.screenshot());
    report.fixturePressedPaint = await fixtureBtn.evaluate((el) => ({
      bg: getComputedStyle(el).backgroundColor,
      color: getComputedStyle(el).color,
    }));
    await fixtureBtn.evaluate((el) => el.removeAttribute("data-fixture-pressed"));

    await page.locator(".sb-card--current").first().scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "board-page-01-status-360.png"));
    report.proofs.push(await shot(page, "board-type-01-current-project-360.png"));

    await page.locator(".sb-card--progress").first().scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "board-page-02-journey-360.png"));
    report.proofs.push(await shot(page, "board-type-02-journey-360.png"));

    await page.locator(".sb-card--project-snapshot").first().scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "board-page-03-snapshot-360.png"));
    report.proofs.push(await shot(page, "board-type-03-snapshot-360.png"));

    const glance = page.locator(".sb-materials-glance").first();
    if (await glance.count()) {
      await glance.scrollIntoViewIfNeeded();
      report.proofs.push(await shot(page, "board-page-04-materials-360.png"));
      report.proofs.push(await shot(page, "board-type-04-materials-360.png"));
    }

    const comm = page.locator(".sb-card--project-communication").first();
    await comm.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        !/Loading project messages/i.test(
          document.querySelector(".sb-card--project-communication")?.innerText || "",
        ),
      { timeout: 20000 },
    );
    await page.getByRole("radio", { name: "Report a problem" }).tap();
    await page.getByText("Describe the problem", { exact: false }).waitFor({ timeout: 5000 });
    await page.getByRole("radio", { name: "Ask a question" }).tap();
    report.proofs.push(await shot(page, "board-page-05-communication-360.png"));
    report.proofs.push(await shot(page, "board-type-05-communication-360.png"));

    const composer = page.locator(".sb-project-communication__textarea").first();
    await composer.fill("Builder QA denim enable check.");
    await page.waitForFunction(() => {
      const send = document.querySelector(".sb-project-communication__submit");
      return Boolean(send && !send.disabled);
    });
    const sendBtn = page.locator(".sb-project-communication__submit");
    await sendBtn.scrollIntoViewIfNeeded();
    report.enabledSend = await probe();
    report.proofs.push(await shot(page, "board-page-05b-send-enabled-360.png"));
    report.proofs.push(
      await sendBtn
        .screenshot({ path: path.join(OUT, "board-page-send-btn-only.png") })
        .then(() => path.join(OUT, "board-page-send-btn-only.png")),
    );
    report.sendPixels = avgPng(await sendBtn.screenshot());
    await composer.fill("");

    const refund = page.locator(".sb-card--refund-request").first();
    await refund.waitFor({ timeout: 15000 });
    await refund.scrollIntoViewIfNeeded();
    const reason = page.locator(".sb-refund-request__textarea").nth(0);
    const outcome = page.locator(".sb-refund-request__textarea").nth(1);
    await reason.fill("Builder QA denim enable check.");
    await outcome.fill("Full refund review for this service.");
    await page.waitForFunction(() => {
      const submit = document.querySelector(".sb-refund-request__submit");
      return Boolean(submit && !submit.disabled);
    });
    const refundBtn = page.locator(".sb-refund-request__submit");
    await refundBtn.scrollIntoViewIfNeeded();
    report.enabledRefund = await probe();
    report.proofs.push(await shot(page, "board-page-06b-refund-enabled-360.png"));
    report.proofs.push(
      await refundBtn
        .screenshot({ path: path.join(OUT, "board-page-refund-submit-btn-only.png") })
        .then(() => path.join(OUT, "board-page-refund-submit-btn-only.png")),
    );
    report.refundPixels = avgPng(await refundBtn.screenshot());
    await reason.fill("");
    await outcome.fill("");
    await refundBtn.scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "board-page-06-refund-360.png"));
    report.proofs.push(await shot(page, "board-type-06-refund-360.png"));
    report.proofs.push(
      await refundBtn
        .screenshot({ path: path.join(OUT, "board-page-refund-disabled-btn-only.png") })
        .then(() => path.join(OUT, "board-page-refund-disabled-btn-only.png")),
    );
    report.disabledRefundPixels = avgPng(await refundBtn.screenshot());
    const sendDisabled = page.locator(".sb-project-communication__submit");
    await sendDisabled.scrollIntoViewIfNeeded();
    report.proofs.push(
      await sendDisabled
        .screenshot({ path: path.join(OUT, "board-page-send-disabled-btn-only.png") })
        .then(() => path.join(OUT, "board-page-send-disabled-btn-only.png")),
    );
    report.disabledSendPixels = avgPng(await sendDisabled.screenshot());

    report.visual = await probe();
    report.proofs.push(await shot(page, "board-page-08-full-360.png", true));
    report.proofs.push(await shot(page, "board-type-08-full-360.png", true));

    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /Maya/i }).waitFor({ timeout: 10000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    report.proofs.push(await shot(page, "board-page-07-refresh-top-360.png"));
    await page.locator(".sb-card--refund-request").first().scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "board-page-07-refresh-360.png"));
    report.afterRefresh = await probe();

    report.checks.loungeVisible = report.visual.hasLounge === true;
    report.checks.mayaIntact =
      report.visual.maya === true && report.afterRefresh.maya === true;
    report.checks.paidIntact =
      report.visual.paid === true && report.afterRefresh.paid === true;
    report.checks.intakeIntact =
      report.visual.intake === true && report.afterRefresh.intake === true;
    report.checks.noPaymentPending = report.visual.pendingPayment === false;
    report.checks.neededVisible = report.visual.neededNothing === true;
    report.checks.studioWorkingVisible = report.visual.studioWorking === true;
    report.checks.glanceStillPresent = report.visual.glancePresent === true;
    report.checks.communicationClean =
      report.visual.qaCheckIn === false && report.visual.qaMarker === false;
    report.checks.composerIntact = report.visual.hasAsk === true && report.visual.hasProblem === true;
    report.checks.refundPresent = report.visual.hasRefund === true;
    report.checks.refundNotOpaqueBrown =
      !isOpaqueBrown(report.visual.refundBefore) &&
      !isOpaqueBrown(report.afterRefresh.refundBefore);
    report.checks.snapshotNotOpaqueBrown = !isOpaqueBrown(report.visual.snapshotBefore);
    report.checks.currentNotOpaqueBrown = !isOpaqueBrown(report.visual.currentBefore);
    report.checks.refundSubmitReachable =
      report.visual.refundSubmitVisible === true &&
      report.visual.refundSubmitObstructed === false;
    report.checks.sendNotObstructed = report.visual.sendObstructed === false;
    report.checks.noQaClutter = report.afterRefresh.qaCheckIn === false;
    report.checks.refundPolicyNotStacked = report.visual.refundPolicyRepeat === false;
    report.checks.refundNoBuildingConcepts = report.visual.refundBuildingConcepts === false;
    report.checks.duplicateStageHidden = report.visual.duplicateStage === false;
    report.checks.fixtureLocalOnly =
      report.visual.hasFixture === true && report.visual.fixtureLocalLabel === true;
    report.checks.noHorizontalOverflow = report.visual.horizontalOverflow === false;
    report.checks.sessionPersisted = report.afterRefresh.maya === true;
    report.checks.sidebarNotOpaqueBrown =
      !isOpaqueBrown(report.visual.sidebarBg) &&
      !isOpaqueBrown(report.visual.sidebarBefore) &&
      (report.visual.sidebarImage === "none" || report.visual.sidebarImage === "none, none" || !report.visual.sidebarImage);
    report.checks.disabledSendStillDisabled = report.visual.sendPaint?.disabled === true;
    report.checks.disabledRefundStillDisabled = report.visual.refundSubmitPaint?.disabled === true;
    report.checks.enabledSendYellow =
      report.enabledSend?.sendPaint?.disabled === false &&
      isYellow(report.enabledSend?.sendPaint?.bg) &&
      isInk(report.enabledSend?.sendPaint?.color) &&
      looksYellow(report.sendPixels) &&
      looksTeal(report.sendPixels) === false;
    report.checks.enabledRefundYellow =
      report.enabledRefund?.refundSubmitPaint?.disabled === false &&
      isYellow(report.enabledRefund?.refundSubmitPaint?.bg) &&
      isInk(report.enabledRefund?.refundSubmitPaint?.color) &&
      looksYellow(report.refundPixels) &&
      looksTeal(report.refundPixels) === false;
    report.checks.disabledCtasNotEnabled =
      report.visual.sendPaint?.disabled === true &&
      report.visual.refundSubmitPaint?.disabled === true;
    report.checks.sendNotTeal = report.sendPixels ? looksTeal(report.sendPixels) === false : false;
    report.checks.sendNotDenim =
      isDenim(report.enabledSend?.sendPaint?.bg) === false &&
      isDenim(report.visual.sendPaint?.bg) === false;
    report.checks.refundNotDenim =
      isDenim(report.enabledRefund?.refundSubmitPaint?.bg) === false &&
      isDenim(report.visual.refundSubmitPaint?.bg) === false;
    report.checks.boardSharedEnvironment =
      report.visual.frostDisplay !== "none" &&
      report.visual.veilDisplay !== "none" &&
      typeof report.visual.plateFilter === "string" &&
      report.visual.plateFilter.includes("blur(2px)");
    report.checks.boardContentGlassFill = isMasterGlassFill(report.visual.sidebarBg);
    report.checks.selectedNavFilled =
      typeof report.visual.activeNavBg === "string" &&
      report.visual.activeNavBg !== "rgba(0, 0, 0, 0)" &&
      report.visual.activeNavBg !== "transparent";
    report.checks.fixtureRestYellow =
      isYellow(report.fixtureRestPaint?.bg) && isInk(report.fixtureRestPaint?.color);
    report.checks.fixturePressedYellow =
      isYellow(report.fixturePressedPaint?.bg) &&
      isInk(report.fixturePressedPaint?.color) &&
      looksYellow(report.fixturePressedPixels);
    report.checks.boardCtasYellowMatch =
      isYellow(report.fixtureRestPaint?.bg) &&
      isYellow(report.enabledSend?.sendPaint?.bg) &&
      isYellow(report.enabledRefund?.refundSubmitPaint?.bg) &&
      isInk(report.fixtureRestPaint?.color) &&
      isInk(report.enabledSend?.sendPaint?.color) &&
      isInk(report.enabledRefund?.refundSubmitPaint?.color) &&
      looksYellow(report.fixtureRestPixels) &&
      looksYellow(report.sendPixels) &&
      looksYellow(report.refundPixels);
    report.checks.boardCtasSameSize =
      Boolean(report.visual.fixtureBox && report.visual.sendBox && report.visual.refundBox) &&
      Math.abs(report.visual.fixtureBox.h - report.visual.sendBox.h) <= 2 &&
      Math.abs(report.visual.sendBox.h - report.visual.refundBox.h) <= 2 &&
      Math.abs(report.visual.fixtureBox.w - report.visual.sendBox.w) <= 8 &&
      Math.abs(report.visual.sendBox.w - report.visual.refundBox.w) <= 8;
    report.checks.studioWordmarkDenim =
      isDenim(report.visual.brandTheColor) && isDenim(report.visual.brandNameColor);
    report.checks.studioBoardTitleDenim = isDenim(report.visual.titleColor);
    report.checks.selectedNavYellowCopy =
      isYellow(report.visual.activeNavColor) && isYellow(report.visual.activeNavBorder);
    report.checks.fixtureEyebrowNotYellow =
      isEucalyptus(report.visual.fixtureEyebrowColor) &&
      isYellow(report.visual.fixtureEyebrowColor) === false;

    const type = report.visual.type || {};
    report.checks.typePageLargest =
      Boolean(type.page && type.card) && type.page.size > type.card.size + 4;
    report.checks.typeCardEucalyptus = isEucalyptus(type.card?.color);
    report.checks.typeSubDenim =
      isDenim(type.snapshotSub?.color) && isDenim(type.statusSub?.color);
    report.checks.typeFieldReadable = Boolean(type.field) && type.field.size >= 14;
    report.checks.typeNoTinyHugeJump =
      Boolean(type.field && type.value) && type.value.size / type.field.size <= 1.35;
    report.checks.typeFieldNotSubsection =
      isEucalyptus(type.field?.color) &&
      isDenim(type.statusSub?.color) &&
      isDenim(type.field?.color) === false;
    report.checks.typeValueInk = isInk(type.value?.color);
    report.checks.typeJourneyCurrentCurrent =
      isDenim(type.journeyCurrent?.color) &&
      isInk(type.journeyComplete?.color) &&
      Boolean(type.journeyDetail) &&
      Math.abs(type.journeyDetail.size - type.value.size) <= 1 &&
      isInk(type.journeyDetail.color);
    report.checks.typeCurrentDotHidden =
      !type.currentDot ||
      type.currentDot.display === "none" ||
      type.currentDot.visibility === "hidden";
    report.checks.typeUpdatesHierarchy =
      Boolean(type.updateDate && type.updateMessage) &&
      type.updateDate.size <= type.updateMessage.size - 2 &&
      isDenim(type.updateHeading?.color) &&
      isInk(type.updateMessage?.color) &&
      isCoral(type.updateDate.color);
    report.checks.typeSnapshotLevels =
      Boolean(type.snapshotPrimary && type.snapshotMeta && type.snapshotCheck) &&
      type.snapshotPrimary.size > type.snapshotMeta.size &&
      type.snapshotPrimary.size > type.snapshotCheck.size &&
      isInk(type.snapshotPrimary.color);
    report.checks.typeCommLabelsReadable =
      Boolean(type.commLabel) && type.commLabel.size >= 14;
    report.checks.typeViewSecondary =
      isDenim(type.viewAction?.color) && isIvory(type.viewAction?.bg);
    report.checks.typeActionRelated =
      Boolean(type.sendAction && type.viewAction && type.refundAction) &&
      Math.abs(type.sendAction.size - type.viewAction.size) <= 1.5 &&
      Math.abs(type.sendAction.size - type.refundAction.size) <= 1.5 &&
      type.viewAction.transform === "none";
    report.checks.typeCampaignNameNotPage =
      Boolean(type.campaignName && type.page) && type.campaignName.size + 2 < type.page.size;
    report.checks.signOutSelectedLikeBoard =
      isYellow(report.visual.signOutPaint?.color) &&
      isYellow(report.visual.signOutBorder) &&
      report.visual.signOutPaint?.bg !== "rgba(0, 0, 0, 0)" &&
      report.visual.signOutPaint?.bg !== "transparent";
    report.checks.signOutMatchesBoardFill =
      Boolean(report.visual.signOutPaint?.bg) &&
      report.visual.signOutPaint?.bg === report.visual.activeNavBg;
    report.checks.navChipsCompact =
      Boolean(report.visual.signOutHeight && report.visual.activeNavHeight) &&
      report.visual.signOutHeight >= 36 &&
      report.visual.signOutHeight <= 48 &&
      report.visual.activeNavHeight <= 40;
    report.checks.loungeStaysStill =
      report.loungeBeforeScroll?.plateTop != null &&
      report.loungeAfterScroll?.plateTop != null &&
      Math.abs(report.loungeBeforeScroll.plateTop - report.loungeAfterScroll.plateTop) <= 1 &&
      Math.abs(report.loungeBeforeScroll.plateLeft - report.loungeAfterScroll.plateLeft) <= 1 &&
      Math.abs(report.loungeBeforeScroll.shellTop - report.loungeAfterScroll.shellTop) <= 1;
    report.checks.signOutAlignsHelp = report.visual.signOutAlignsHelp === true;
    report.checks.signOutHasIcon = report.visual.signOutHasIcon === true;
    report.checks.signOutOverlayHidden = report.visual.signOutControlOpacity === "0";
    report.checks.signOutAsWideAsHelp = report.visual.signOutAsWideAsHelp === true;
    report.checks.signOutNotLongBar = report.visual.signOutNotLongBar === true;
    report.checks.greetingCoral =
      isCoral(report.visual.greetingColor) && isCoral(report.visual.nameColor);
    report.checks.mayaHighlightRemoved =
      !report.visual.nameBg ||
      report.visual.nameBg === "rgba(0, 0, 0, 0)" ||
      report.visual.nameBg === "transparent";
    report.checks.recordedValueAligned =
      !report.visual.notesPad || parseFloat(report.visual.notesPad) === 0;
    report.checks.typeSupportingCoral =
      isCoral(type.snapshotMeta?.color) &&
      isCoral(type.snapshotCheck?.color) &&
      isCoral(type.updateDate?.color) &&
      isCoral(type.journeyUpcoming?.color);
    report.checks.typeUpdatesHierarchy =
      Boolean(type.updateDate && type.updateMessage) &&
      type.updateDate.size <= type.updateMessage.size - 2 &&
      isDenim(type.updateHeading?.color) &&
      isInk(type.updateMessage?.color) &&
      isCoral(type.updateDate.color);

    const failed = Object.entries(report.checks).filter(([, value]) => value !== true);
    report.ok = failed.length === 0 && report.pageErrors.length === 0;
    report.failed = failed.map(([key]) => key);
  } catch (error) {
    report.ok = false;
    report.error = String(error);
    try {
      report.proofs.push(await shot(page, "board-page-error.png"));
    } catch {
      /* ignore */
    }
  } finally {
    await writeFile(path.join(OUT, "board-page-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
  }

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
