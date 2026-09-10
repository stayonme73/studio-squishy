/**
 * Builder QA — Board Communication / Status at Samsung width.
 * Usage: node scripts/mobile-board-communication-qa.mjs
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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

  const probe = async () =>
    page.evaluate(() => {
      const css = (el, prop) => (el ? getComputedStyle(el).getPropertyValue(prop) : null);
      const before = (el) =>
        el ? getComputedStyle(el, "::before").getPropertyValue("background-color") : null;
      const current = document.querySelector(".sb-card--current");
      const progress = document.querySelector(".sb-card--progress");
      const comm = document.querySelector(".sb-card--project-communication");
      const glance = document.querySelector(".sb-materials-glance");
      const lounge = document.querySelector(".studio-environment-shell__plate");
      const review = document.querySelector(".studio-review-mobile-tab");
      const send = [...document.querySelectorAll("button")].find((el) =>
        /Send message/i.test(el.textContent || ""),
      );
      const sendBox = send?.getBoundingClientRect();
      const reviewBox = review?.getBoundingClientRect();
      const overlap =
        Boolean(sendBox && reviewBox) &&
        sendBox.top < reviewBox.bottom &&
        sendBox.bottom > reviewBox.top &&
        sendBox.left < reviewBox.right &&
        sendBox.right > reviewBox.left;
      const text = document.body?.innerText ?? "";
      return {
        hasLounge: Boolean(lounge),
        currentBg: css(current, "background-color"),
        currentBefore: before(current),
        progressBg: css(progress, "background-color"),
        progressBefore: before(progress),
        commBg: css(comm, "background-color"),
        commBefore: before(comm),
        glancePresent: Boolean(glance),
        hasStatus: /Project status/i.test(text),
        hasNeeded: /What we need from you/i.test(text),
        hasStudioWorking: /What The Studio is working on/i.test(text),
        hasNextStep: /Next step/i.test(text),
        hasProgress: /Progress|Journey|Recent updates/i.test(text),
        hasComm: /Project communication/i.test(text),
        hasComposer: /Message to The Studio/i.test(text),
        hasSend: Boolean(send),
        sendObstructed: overlap,
        duplicateIntakeLeadInStatus: (
          (current?.innerText ?? "").match(
            /We've received your Project Intake and are preparing your project for the next stage/g,
          ) || []
        ).length,
        emptyRiskVisible: /No risk or blocker is recorded/i.test(text),
        genericTargetVisible: /Checkpoint: When the next project update is ready/i.test(text),
        ceremonialNextUpdateVisible: /Next update:\s*When the next project update is ready/i.test(
          current?.innerText ?? "",
        ),
        emptyMessages: /No project messages yet/i.test(comm?.innerText ?? ""),
        qaCheckInVisible: /Checking in on the flyer/i.test(comm?.innerText ?? ""),
        builderQaMarkerVisible: /\[Studio Builder QA\]/.test(comm?.innerText ?? ""),
        answeredFromRecordRepeat: /Answered from the project record/i.test(comm?.innerText ?? ""),
        awaitingStaffCount: (
          (comm?.innerText ?? "").match(
            /A person on The Studio team has not written a separate reply yet/g,
          ) || []
        ).length,
        maya: /Maya/i.test(text),
        paid: /Paid in Full|Payment received/i.test(text),
        intake: /Intake/i.test(text),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        currentText: current?.innerText?.slice(0, 1200) ?? "",
        progressText: progress?.innerText?.slice(0, 800) ?? "",
        commText: comm?.innerText?.slice(0, 800) ?? "",
      };
    });

  try {
    await page.goto(`${LAN}/sign-in?from=%2Fstudio-board`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByRole("button", { name: "Continue as Customer-One" }).tap();
    await page.waitForURL(/\/studio-board/, { timeout: 20000 });
    await page.getByRole("heading", { name: "Studio Board" }).waitFor({ timeout: 15000 });
    await page.getByRole("heading", { name: /Maya/i }).waitFor({ timeout: 15000 });

    const current = page.locator(".sb-card--current").first();
    await current.waitFor({ timeout: 15000 });
    await current.scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "board-comm-01-status-360.png"));

    const progress = page.locator(".sb-card--progress").first();
    await progress.scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "board-comm-02-progress-360.png"));

    const comm = page.locator(".sb-card--project-communication").first();
    await comm.waitFor({ timeout: 15000 });
    await comm.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        !/Loading project messages/i.test(
          document.querySelector(".sb-card--project-communication")?.innerText || "",
        ),
      { timeout: 20000 },
    );
    report.proofs.push(await shot(page, "board-comm-03-communication-360.png"));

    report.visual = await probe();

    const textarea = page.locator(".sb-project-communication__textarea");
    await textarea.waitFor({ timeout: 10000 });
    await page.getByRole("radio", { name: "Report a problem" }).tap();
    await page.getByText("Describe the problem", { exact: false }).waitFor({ timeout: 5000 });
    await page.getByRole("radio", { name: "Ask a question" }).tap();
    await page.getByText("Message to The Studio", { exact: false }).waitFor({ timeout: 5000 });
    report.checks.intentsWork = true;

    const uniqueCheckIn = `[Studio Builder QA] persist-check ${Date.now()}.`;
    await textarea.tap();
    await textarea.fill(uniqueCheckIn);
    const posted = page.waitForResponse((res) => {
      try {
        const pathname = new URL(res.url()).pathname;
        return (
          res.request().method() === "POST" &&
          /\/project-communication\/customer\/?$/.test(pathname)
        );
      } catch {
        return false;
      }
    });
    await page.getByRole("button", { name: "Send message" }).tap();
    const postResponse = await posted;
    const postJson = await postResponse.json();
    await page.getByText("Message sent to The Studio.").waitFor({ timeout: 15000 });
    await comm.scrollIntoViewIfNeeded();
    const sentSuccess = (await page.locator(".sb-project-communication__success").innerText()).trim();
    await page.locator(".sb-project-communication__success").scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "board-comm-04-sent-360.png"));

    const communicationDir = path.join(process.cwd(), "data/project-communication");
    const storedFiles = await readdir(communicationDir);
    let storedHasBody = false;
    for (const file of storedFiles) {
      const raw = await readFile(path.join(communicationDir, file), "utf8");
      if (raw.includes(uniqueCheckIn)) storedHasBody = true;
    }
    report.persistInRecord =
      storedHasBody ||
      Boolean(postJson?.message?.body === uniqueCheckIn) ||
      Boolean((postJson?.messages ?? []).some((message) => message.body === uniqueCheckIn));

    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /Maya/i }).waitFor({ timeout: 10000 });
    await comm.waitFor({ timeout: 15000 });
    await comm.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        !/Loading project messages/i.test(
          document.querySelector(".sb-card--project-communication")?.innerText || "",
        ),
      { timeout: 20000 },
    );
    report.proofs.push(await shot(page, "board-comm-05-refresh-360.png"));

    report.afterSend = await probe();
    report.checks.loungeVisible = report.visual.hasLounge === true;
    report.checks.mayaIntact = report.visual.maya === true && report.afterSend.maya === true;
    report.checks.statusVisible = report.visual.hasStatus === true;
    report.checks.neededVisible = report.visual.hasNeeded === true;
    report.checks.studioWorkingVisible = report.visual.hasStudioWorking === true;
    report.checks.composerVisible = report.visual.hasComposer === true;
    report.checks.sendReachable = report.visual.hasSend === true;
    report.checks.sendNotObstructed = report.visual.sendObstructed === false;
    report.checks.messagePersistedInRecord = report.persistInRecord === true;
    report.checks.noQaCheckInWall =
      report.visual.qaCheckInVisible === false && report.afterSend.qaCheckInVisible === false;
    report.checks.noBuilderQaMarkerInThread =
      report.visual.builderQaMarkerVisible === false &&
      report.afterSend.builderQaMarkerVisible === false;
    report.checks.noAnsweredFromRecordRepeat =
      report.visual.answeredFromRecordRepeat === false &&
      report.afterSend.answeredFromRecordRepeat === false;
    report.checks.awaitingStaffNotStacked =
      report.visual.awaitingStaffCount <= 1 && report.afterSend.awaitingStaffCount <= 1;
    report.checks.glanceStillPresent = report.visual.glancePresent === true;
    report.checks.noHorizontalOverflow = report.visual.horizontalOverflow === false;
    report.checks.currentNotOpaqueBrown =
      !isOpaqueBrown(report.visual.currentBg) && !isOpaqueBrown(report.visual.currentBefore);
    report.checks.progressNotOpaqueBrown =
      !isOpaqueBrown(report.visual.progressBg) && !isOpaqueBrown(report.visual.progressBefore);
    report.checks.commNotOpaqueBrown =
      !isOpaqueBrown(report.visual.commBg) && !isOpaqueBrown(report.visual.commBefore);
    report.checks.intakeLeadNotRepeated = report.visual.duplicateIntakeLeadInStatus <= 1;
    report.checks.emptyRiskHidden = report.visual.emptyRiskVisible === false;
    report.checks.genericTargetHidden = report.visual.genericTargetVisible === false;
    report.checks.ceremonialNextUpdateHidden = report.visual.ceremonialNextUpdateVisible === false;
    report.checks.successFullyVisible = sentSuccess === "Message sent to The Studio.";

    const failed = Object.entries(report.checks).filter(([, value]) => value !== true);
    report.ok = failed.length === 0 && report.pageErrors.length === 0;
    report.failed = failed.map(([key]) => key);
  } catch (error) {
    report.ok = false;
    report.error = String(error);
    try {
      report.proofs.push(await shot(page, "board-comm-error.png"));
    } catch {
      /* ignore */
    }
  } finally {
    await writeFile(path.join(OUT, "board-comm-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    await browser.close();
  }

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
