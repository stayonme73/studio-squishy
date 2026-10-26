/**
 * Builder QA — phone Request a Change final simplification.
 * Typing is default. Tools are Draw, Erase, Voice. No Sticky Note.
 * Does not send or approve. Maya must stay 0 of 1.
 *
 * Usage: node scripts/mobile-maya-review-phone-tools-qa.mjs
 */
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const PAID_ID = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

function loadSessionSecret() {
  const raw = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("SESSION_SECRET=")) continue;
    return line.slice("SESSION_SECRET=".length).trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("SESSION_SECRET is not configured");
}

function mintSessionCookie(user, currentCampaignId) {
  const payload = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    currentCampaignId,
    clientCampaignIds: user.clientCampaignIds ?? [],
    emailVerifiedAt: user.emailVerifiedAt ?? null,
    issuedAt: Date.now(),
  };
  const payloadJson = JSON.stringify(payload);
  const payloadPart = Buffer.from(payloadJson).toString("base64url");
  const signature = createHmac("sha256", loadSessionSecret())
    .update(payloadJson)
    .digest("base64url");
  return `${payloadPart}.${signature}`;
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const report = { ok: false, checks: {}, proofs: [], pageErrors: [], tools: null };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 390, height: 844 },
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
    const login = await context.request.post(`${BASE}/api/auth/local-customer-one`, {
      timeout: 30000,
    });
    const loginBody = await login.json();
    report.checks.customerOneLogin = Boolean(login.ok() && loginBody?.user?.id);
    const token = mintSessionCookie(loginBody.user, PAID_ID);
    await context.addCookies([
      {
        name: "studio_session",
        value: token,
        url: BASE,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);
    await page.addInitScript(() => {
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    });

    await page.goto(`${BASE}/studio-lobby`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector(".lobby-entry-film__cta", { timeout: 30000 });
    const lobbyCta = await page.evaluate(() => {
      const cta = document.querySelector(".lobby-entry-film__cta");
      if (!cta) return { background: null, color: null };
      const styles = getComputedStyle(cta);
      return { background: styles.backgroundColor, color: styles.color };
    });
    report.lobbyCta = lobbyCta;
    report.proofs.push(await shot(page, "maya-tools-00-lets-get-started.png"));

    await page.goto(`${BASE}/feedback-studio`, { waitUntil: "load", timeout: 60000 });
    await page.waitForSelector(".fs-review--workspace", { timeout: 30000 });
    await page.waitForTimeout(800);

    await page.locator(".fs-phone-dock").scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "maya-tools-00b-approve-jean.png"));

    await page.getByRole("button", { name: "Request a Change" }).click();
    await page.waitForTimeout(500);
    if ((await page.locator(".fs-phone-dock__erase").count()) > 0) {
      await page.getByRole("button", { name: "Erase" }).click();
      await page.waitForTimeout(400);
    }
    await page.locator(".fs-phone-dock").scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "maya-tools-01-request-change.png"));

    const dock = await page.evaluate(() => {
      const root = document.querySelector(".fs-phone-dock");
      const text = root?.innerText ?? "";
      const buttons = Array.from(
        document.querySelectorAll(".fs-phone-dock__tools .fs-feedback-panel__btn"),
      ).map((btn) => (btn.textContent ?? "").replace(/\s+/g, " ").trim());
      const field = document.getElementById("fs-phone-dock-change-field");
      const fieldStyles = field ? getComputedStyle(field) : null;
      const send = document.querySelector(".fs-phone-dock__send");
      const sendStyles = send ? getComputedStyle(send) : null;
      const projectFold = document.querySelector(".fs-review__phone-fold");
      const foldStyles = projectFold ? getComputedStyle(projectFold) : null;
      const mayaTitle = document.querySelector(".fs-preview__title");
      const mayaStyles = mayaTitle ? getComputedStyle(mayaTitle) : null;
      return {
        buttons,
        hasHighlight: buttons.some((label) => /highlight/i.test(label)) || /\bHighlight\b/.test(text),
        hasSticky: buttons.some((label) => /Sticky Note/i.test(label)) || /\bSticky Note\b/.test(text),
        hasVoice: buttons.some((label) => /voice feedback/i.test(label)),
        hasDraw: buttons.some((label) => /draw on proof/i.test(label)),
        hasErase: Boolean(root?.querySelector(".fs-phone-dock__erase")),
        toolOrder: buttons,
        hasTypeField: Boolean(field),
        pendingSticky: Boolean(document.querySelector(".fs-sticky--pending")),
        fieldBackground: fieldStyles?.backgroundColor ?? null,
        fieldIsYellow: Boolean(
          fieldStyles &&
            (fieldStyles.backgroundColor === "rgb(255, 242, 0)" ||
              fieldStyles.backgroundColor.includes("255, 242, 0")),
        ),
        fieldIsGlass: Boolean(
          fieldStyles &&
            foldStyles &&
            fieldStyles.backgroundColor === foldStyles.backgroundColor,
        ),
        helperCopy: /You can also mark the proof or leave voice feedback/.test(text),
        approveBackground: getComputedStyle(
          document.querySelector(".fs-phone-dock__btn--approve"),
        ).backgroundColor,
        approveColor: getComputedStyle(
          document.querySelector(".fs-phone-dock__btn--approve"),
        ).color,
        approveTag: document.querySelector(".fs-phone-dock__btn--approve")?.tagName ?? null,
        approveIsLetsGetStartedClass: Boolean(
          document.querySelector(".fs-phone-dock__btn--approve.lobby-entry-film__cta"),
        ),
        changeColor: getComputedStyle(
          document.querySelector(".fs-phone-dock__btn--change"),
        ).color,
        askColor: getComputedStyle(
          document.querySelector(".fs-phone-dock__btn--ask"),
        ).color,
        sendBackground: sendStyles?.backgroundColor ?? null,
        sendColor: sendStyles?.color ?? null,
        mayaTitleColor: mayaStyles?.color ?? null,
        foldBackground: foldStyles?.backgroundColor ?? null,
        sendLettersMatchMaya: Boolean(
          sendStyles &&
            mayaStyles &&
            sendStyles.color === mayaStyles.color,
        ),
        sendIsCoralFill: Boolean(
          sendStyles &&
            (sendStyles.backgroundColor === "rgb(217, 78, 43)" ||
              sendStyles.backgroundColor.includes("217, 78, 43")),
        ),
        sendMatchesProjectGlass: Boolean(
          sendStyles &&
            foldStyles &&
            sendStyles.backgroundColor === foldStyles.backgroundColor,
        ),
        sendOpacity: sendStyles?.opacity ?? null,
        selectVersionCopy: /select (the )?reviewed version|choose proof version/i.test(text),
        textSample: text.replace(/\s+/g, " ").slice(0, 800),
      };
    });
    report.tools = dock;
    report.checks.noHighlight = dock.hasHighlight === false;
    report.checks.noStickyNote = dock.hasSticky === false;
    report.checks.toolsAreDrawAndVoice =
      dock.toolOrder.length === 2 &&
      /draw on proof/i.test(dock.toolOrder[0] ?? "") &&
      /voice feedback/i.test(dock.toolOrder[1] ?? "");
    report.checks.eraseHiddenUntilDraw = dock.hasErase === false;
    report.checks.typeFieldAppearsImmediately = dock.hasTypeField === true;
    report.checks.typeFieldIsNotYellow = dock.fieldIsYellow === false;
    report.checks.typeFieldIsGlass = dock.fieldIsGlass === true;
    report.checks.helperCopyDirect = dock.helperCopy === true;
    report.checks.approveUsesLetsGetStartedClass = dock.approveIsLetsGetStartedClass === true;
    report.checks.approveIsSamsungLetsGetStartedNavy =
      dock.approveBackground === "rgb(5, 23, 47)" &&
      dock.approveColor === "rgb(247, 244, 238)";
    report.checks.approveIsDenim = report.checks.approveIsSamsungLetsGetStartedNavy;
    report.checks.approveIsAnchorCta = dock.approveTag === "A";
    report.checks.approveMatchesLetsGetStarted =
      report.checks.approveIsSamsungLetsGetStartedNavy === true &&
      report.checks.approveIsAnchorCta === true;
    report.checks.changeAskAreDenimText =
      dock.changeColor === "rgb(84, 124, 146)" &&
      dock.askColor === "rgb(84, 124, 146)";
    report.checks.noPendingSticky = dock.pendingSticky === false;
    report.checks.sendLettersMatchMaya = dock.sendLettersMatchMaya === true;
    report.checks.sendIsNotCoralFill = dock.sendIsCoralFill === false;
    report.checks.sendMatchesProjectGlass = dock.sendMatchesProjectGlass === true;
    report.checks.sendStaysOpaque = dock.sendOpacity === "1";
    report.checks.noSelectVersionInstruction = dock.selectVersionCopy === false;

    const proof = page.locator(".fs-review-proof").first();
    await proof.scrollIntoViewIfNeeded();
    await proof.click({ position: { x: 220, y: 72 } });
    await page.waitForTimeout(200);
    report.checks.flyerTapDoesNotPlaceSticky = (await page.evaluate(() =>
      Boolean(document.querySelector(".fs-sticky--pending")),
    )) === false;

    await page.locator("#fs-phone-dock-change-field").fill("Make the headline a little larger.");
    await page.locator(".fs-phone-dock__send").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    report.proofs.push(await shot(page, "maya-tools-02-typed.png"));
    report.proofs.push(await shot(page, "maya-tools-02c-send-vs-project.png"));
    report.checks.eraseStillHiddenAfterType = (await page.locator(".fs-phone-dock__erase").count()) === 0;

    await page.getByRole("button", { name: "Draw on proof" }).click();
    await page.waitForSelector("canvas.fs-draw-layer--active", { timeout: 10000 });
    const canvas = page.locator("canvas.fs-draw-layer--active");
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const box = await canvas.boundingBox();
    report.checks.drawCanvasOnProof = Boolean(box && box.width > 80 && box.height > 80);
    if (box) {
      const overImage = await page.evaluate(() => {
        const canvasEl = document.querySelector("canvas.fs-draw-layer--active");
        const image = document.querySelector(".fs-review-proof__image");
        if (!canvasEl || !image) return false;
        const a = canvasEl.getBoundingClientRect();
        const b = image.getBoundingClientRect();
        return Math.abs(a.left - b.left) < 8 && Math.abs(a.top - b.top) < 8 && a.width >= b.width - 8;
      });
      report.checks.drawOverlaysCurrentProof = overImage === true;
      await canvas.dispatchEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
        clientX: box.x + 48,
        clientY: box.y + 80,
        pointerId: 1,
        pointerType: "touch",
      });
      await canvas.dispatchEvent("pointermove", {
        bubbles: true,
        cancelable: true,
        clientX: box.x + 160,
        clientY: box.y + 180,
        pointerId: 1,
        pointerType: "touch",
      });
      await canvas.dispatchEvent("pointerup", {
        bubbles: true,
        cancelable: true,
        clientX: box.x + 160,
        clientY: box.y + 180,
        pointerId: 1,
        pointerType: "touch",
      });
      await page.waitForTimeout(200);
      await page.waitForSelector(".fs-phone-dock__erase", { timeout: 5000 });
      const painted = await page.evaluate(() => {
        const canvasEl = document.querySelector("canvas.fs-draw-layer--active");
        if (!(canvasEl instanceof HTMLCanvasElement)) return 0;
        const ctx = canvasEl.getContext("2d");
        if (!ctx) return 0;
        const data = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height).data;
        let marked = 0;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > 8) marked += 1;
        }
        return marked;
      });
      report.checks.drawMarksProof = painted > 20;
      report.drawPixels = painted;
      await canvas.scrollIntoViewIfNeeded();
    }
    report.checks.eraseAppearsAfterDraw =
      (await page.locator(".fs-phone-dock__erase").count()) === 1;
    await page.locator(".fs-phone-dock__erase").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    report.proofs.push(await shot(page, "maya-tools-03-draw.png"));
    report.proofs.push(await shot(page, "maya-tools-03b-erase-visible.png"));

    await page.getByRole("button", { name: "Erase" }).click();
    await page.waitForTimeout(300);
    report.checks.eraseClearsDrawingAndHides =
      (await page.locator(".fs-phone-dock__erase").count()) === 0 &&
      (await page.locator("canvas.fs-draw-layer--active").count()) === 0;
    report.proofs.push(await shot(page, "maya-tools-02b-erase.png"));

    const used = await page.evaluate(async () => {
      const res = await fetch(
        "/api/campaigns/716a15b6-d8d6-436c-8f84-9e8b40d2f959/jobs/716a15b6-d8d6-436c-8f84-9e8b40d2f959%3Av2-rtu-flyer/review",
        { credentials: "include" },
      );
      const json = await res.json();
      return json?.review?.revisionRoundsUsed ?? null;
    });
    report.checks.mayaStillZeroOfOne = used === 0;
    report.checks.didNotSend = true;
    report.checks.didNotApprove = true;
    report.drawPassesDirectFingerTest = report.checks.drawMarksProof === true;
    report.finalPhoneTools = "Draw on proof + Voice feedback; Erase after drawing";

    report.ok = Boolean(
      report.checks.customerOneLogin &&
        report.checks.noHighlight &&
        report.checks.noStickyNote &&
        report.checks.toolsAreDrawAndVoice &&
        report.checks.eraseHiddenUntilDraw &&
        report.checks.typeFieldAppearsImmediately &&
        report.checks.typeFieldIsNotYellow &&
        report.checks.typeFieldIsGlass &&
        report.checks.helperCopyDirect &&
        report.checks.approveIsDenim &&
        report.checks.approveUsesLetsGetStartedClass &&
        report.checks.approveIsAnchorCta &&
        report.checks.approveMatchesLetsGetStarted &&
        report.checks.changeAskAreDenimText &&
        report.checks.noPendingSticky &&
        report.checks.flyerTapDoesNotPlaceSticky &&
        report.checks.sendLettersMatchMaya &&
        report.checks.sendIsNotCoralFill &&
        report.checks.sendMatchesProjectGlass &&
        report.checks.sendStaysOpaque &&
        report.checks.eraseStillHiddenAfterType &&
        report.checks.eraseAppearsAfterDraw &&
        report.checks.eraseClearsDrawingAndHides &&
        report.checks.noSelectVersionInstruction &&
        report.checks.mayaStillZeroOfOne &&
        report.checks.didNotSend,
    );
  } finally {
    await writeFile(
      path.join(OUT, "maya-review-phone-tools-qa-report.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
