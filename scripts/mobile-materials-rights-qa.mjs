/**
 * Builder QA — Materials Upload + Rights on the existing paid Maya flyer.
 * Uses Studio-owned fixtures. Does not create a new Maya account or campaign.
 *
 * Usage: node scripts/mobile-materials-rights-qa.mjs
 */
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);
const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const FIXTURE_DIR = path.join(process.cwd(), "public", "mobile-customer-journey-cert-1");
const ORDINARY_MARK = path.join(FIXTURE_DIR, "pine-petal-ordinary-mark.png");
const CORRUPT_PNG = path.join(FIXTURE_DIR, "northwind-corrupt.png");

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function countMayaAccounts() {
  try {
    const users = JSON.parse(await readFile(USERS_PATH, "utf8"));
    const maya = users.filter((user) => String(user.displayName || "").trim() === "Maya");
    return { total: users.length, maya: maya.length };
  } catch {
    return { total: 0, maya: 0 };
  }
}

function intakeOverlay(campaign) {
  const now = new Date().toISOString();
  return {
    ...campaign,
    routeMapIntakeSubmittedAt: campaign.routeMapIntakeSubmittedAt ?? now,
    routeMapIntake: campaign.routeMapIntake ?? {
      submittedAt: now,
      answers: {
        "shared:materials": "I do not have this yet",
        "v2-rtu-flyer:flyerPurpose": "Grand opening flyer",
        "v2-rtu-flyer:mustInclude": "Maya’s Mobile Boutique",
        "v2-rtu-flyer:intendedUse": "Print",
      },
    },
  };
}

function readBoardMaterialsState() {
  const campaignRaw = localStorage.getItem("studio-squishy:current-campaign");
  const campaign = campaignRaw ? JSON.parse(campaignRaw) : null;
  const text = document.body?.innerText ?? "";
  const review = document.querySelector(".studio-review-mobile-tab");
  const addMore = [...document.querySelectorAll("button")].find((el) =>
    /Add more \(optional\)/i.test(el.textContent || ""),
  );
  const chooseFile = [...document.querySelectorAll("label, button")].find((el) =>
    /Choose file/i.test(el.textContent || ""),
  );
  const send = [...document.querySelectorAll("button")].find((el) =>
    /Send to Studio/i.test(el.textContent || ""),
  );
  const reviewBox = review?.getBoundingClientRect();
  const addBox = addMore?.getBoundingClientRect();
  const overlapAddMoreReview = Boolean(
    reviewBox &&
      addBox &&
      addBox.top < reviewBox.bottom &&
      addBox.bottom > reviewBox.top &&
      addBox.left < reviewBox.right &&
      addBox.right > reviewBox.left,
  );
  return {
    url: location.href,
    campaignId: campaign?.campaignId ?? null,
    paidAt: Boolean(campaign?.paymentReceivedAt),
    amountDue: campaign?.approvedStudioPlan?.amountDueTodayCents ?? null,
    flyer: Boolean(
      campaign?.approvedStudioPlan?.selectedServiceIds?.includes("v2-rtu-flyer"),
    ),
    intakeSubmitted: Boolean(campaign?.routeMapIntakeSubmittedAt),
    title: document.querySelector("#sb-current-campaign-title")?.textContent ?? "",
    nothingRequired: /Nothing is required from you right now/i.test(text),
    materialsCaughtUp: /Materials caught up/i.test(text),
    finishIntakeCopy: /Finish Project Intake first/i.test(text),
    materialRequestsAfterIntake:
      /Material requests will appear here after you complete Project Intake/i.test(text),
    addMoreVisible: Boolean(addMore),
    chooseFileVisible: Boolean(chooseFile),
    sendVisible: Boolean(send),
    rightsVisible: /I own this file, or I have permission/i.test(text),
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    overlapAddMoreReview,
    addMoreHeight: addBox ? Math.round(addBox.height) : 0,
    chooseFileHeight: chooseFile ? Math.round(chooseFile.getBoundingClientRect().height) : 0,
  };
}

async function fillClearanceRights(scope) {
  const rights = scope.locator(".sb-materials-intake__rights").first();
  await rights.waitFor({ timeout: 10000 });
  await rights.locator('input[type="checkbox"]').first().check();
  const groups = rights.locator("fieldset.sb-materials-intake__rights-group");
  await groups.nth(0).getByText("Yes", { exact: true }).click();
  await groups.nth(1).getByText("Yes", { exact: true }).click();
  await groups.nth(2).getByText("No", { exact: true }).click();
  await groups.nth(3).getByText("No", { exact: true }).click();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const mismatchPath = path.join(OUT, "_tmp-mismatch.exe");
  await writeFile(mismatchPath, Buffer.from("not-a-supported-studio-file"));
  const browser = await chromium.launch({ headless: true });
  const report = { ok: false, checks: {}, proofs: [], pageErrors: [] };
  const beforeMaya = await countMayaAccounts();
  report.beforeMaya = beforeMaya;

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
    await page.goto(`${BASE}/sign-in?from=%2Fstudio-board`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.getByRole("button", { name: "Continue as Customer-One" }).click();
    await page.waitForURL(/\/studio-board/, { timeout: 20000 });
    await page.getByRole("heading", { name: "Studio Board" }).waitFor({
      timeout: 15000,
    });

    const sessionUser = await page.evaluate(async () => {
      const response = await fetch("/api/auth/session", { credentials: "include" });
      const body = await response.json().catch(() => ({}));
      return {
        ok: response.ok,
        displayName: body.user?.displayName ?? null,
        currentCampaignId: body.user?.currentCampaignId ?? null,
      };
    });
    report.session = {
      ok: sessionUser.ok,
      displayName: sessionUser.displayName,
      hasCurrentCampaign: Boolean(sessionUser.currentCampaignId),
    };
    report.checks.authenticatedMaya = sessionUser.displayName === "Maya";
    report.checks.fixtureAttachedPaidProject = Boolean(sessionUser.currentCampaignId);

    const campaignId = sessionUser.currentCampaignId;
    const currentRes = await page.evaluate(async () => {
      const response = await fetch("/api/campaigns/current", { credentials: "include" });
      const body = await response.json().catch(() => ({}));
      return { status: response.status, campaign: body.campaign?.record ?? body.campaign ?? null };
    });
    report.currentCampaignStatus = currentRes.status;
    const serverCampaign = currentRes.campaign;
    report.checks.serverCampaignLoaded = Boolean(
      serverCampaign?.campaignId === campaignId &&
        /Boutique/i.test(String(serverCampaign?.campaignName ?? "")),
    );
    report.checks.serverPaidFlyer =
      Boolean(serverCampaign?.paymentReceivedAt) &&
      serverCampaign?.approvedStudioPlan?.selectedServiceIds?.includes("v2-rtu-flyer") &&
      serverCampaign?.approvedStudioPlan?.amountDueTodayCents === 6900;

    await page.evaluate((campaign) => {
      localStorage.setItem(
        "studio-squishy:current-campaign",
        JSON.stringify(campaign),
      );
    }, intakeOverlay(serverCampaign));
    await page.reload({ waitUntil: "load" });
    await page
      .locator("#sb-current-campaign-title")
      .filter({ hasText: /Boutique/i })
      .waitFor({ timeout: 15000 });
    await page.getByRole("button", { name: /Add more \(optional\)/i }).waitFor({
      timeout: 15000,
    });

    const materialsGet = await page.evaluate(async (id) => {
      const response = await fetch(
        `/api/campaigns/${encodeURIComponent(id)}/materials?audience=client`,
        { credentials: "include" },
      );
      const body = await response.json().catch(() => ({}));
      return {
        status: response.status,
        blocking: body.blockingRequiredCount ?? null,
        optional: (body.optionalRequests ?? []).map((item) => ({
          id: item.id,
          category: item.category,
          contentKind: item.contentKind,
          canSubmit: item.canSubmit,
        })),
        consolidated: (body.consolidatedRequests ?? []).length,
        error: body.error ?? null,
      };
    }, campaignId);
    report.materialsGet = {
      status: materialsGet.status,
      blocking: materialsGet.blocking,
      optionalCount: materialsGet.optional.length,
      optionalCategories: materialsGet.optional.map((item) => item.category),
      consolidated: materialsGet.consolidated,
    };
    report.checks.materialsReadable = materialsGet.status === 200;
    report.checks.noRequiredMaterials = materialsGet.blocking === 0;
    report.checks.optionalUploadsExist = materialsGet.optional.some(
      (item) => item.canSubmit && item.contentKind === "file-metadata",
    );

    const logoItem = materialsGet.optional.find(
      (item) => item.category === "logo-brand" && item.canSubmit,
    );
    report.checks.optionalLogoSlot = Boolean(logoItem);

    if (logoItem) {
      const filenameOnly = await page.evaluate(
        async ({ campaignId: id, itemId }) => {
          const response = await fetch(
            `/api/campaigns/${encodeURIComponent(id)}/materials?audience=client`,
            {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "client_submit",
                itemId,
                payload: { fileName: "logo.png", mimeType: "image/png" },
              }),
            },
          );
          const body = await response.json().catch(() => ({}));
          return { status: response.status, error: body.error ?? null };
        },
        { campaignId, itemId: logoItem.id },
      );
      report.filenameOnly = filenameOnly;
      report.checks.filenameOnlyRejected =
        filenameOnly.status >= 400 &&
        /actual file|file upload is required|file name/i.test(String(filenameOnly.error ?? ""));

      const textOnly = await page.evaluate(
        async ({ campaignId: id, itemId }) => {
          const response = await fetch(
            `/api/campaigns/${encodeURIComponent(id)}/materials?audience=client`,
            {
              method: "PATCH",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "client_submit",
                itemId,
                payload: { text: "See my brand guide notes instead of a file." },
              }),
            },
          );
          const body = await response.json().catch(() => ({}));
          return { status: response.status, error: body.error ?? null };
        },
        { campaignId, itemId: logoItem.id },
      );
      report.textOnlyBypass = textOnly;
      report.checks.documentReferencePathRejected =
        textOnly.status >= 400 &&
        /actual file|file upload is required|file name/i.test(String(textOnly.error ?? ""));
    }

    report.checks.documentReferenceNotInvented = !materialsGet.optional.some(
      (item) => item.category === "document-reference",
    );

    await page.evaluate(() =>
      document
        .querySelector(".sb-card--materials, [aria-labelledby='sb-materials-intake-title']")
        ?.scrollIntoView({ block: "center" }),
    );
    await page.waitForTimeout(300);
    const boardEntry = await page.evaluate(readBoardMaterialsState);
    report.boardEntry = boardEntry;
    report.checks.honestOptionalEntry =
      boardEntry.addMoreVisible === true &&
      boardEntry.finishIntakeCopy === false &&
      boardEntry.materialRequestsAfterIntake === false;
    report.checks.noIntakeContradiction =
      boardEntry.finishIntakeCopy === false &&
      boardEntry.materialRequestsAfterIntake === false;
    report.proofs.push(await shot(page, "materials-rights-01-board-entry.png"));

    const addMore = page.getByRole("button", { name: /Add more \(optional\)/i });
    await addMore.scrollIntoViewIfNeeded();
    await addMore.click();
    await page.getByText(/If you have a logo file/i).waitFor({ timeout: 10000 });
    report.proofs.push(await shot(page, "materials-rights-02-add-more.png"));

    const logoCard = page.locator(".sb-materials-intake__item").filter({
      hasText: /logo file/i,
    });
    await logoCard.scrollIntoViewIfNeeded();
    const panelError = page.locator("article[aria-labelledby='sb-materials-intake-title'] .sb-materials-intake__error");

    await logoCard.getByRole("button", { name: /Send to Studio/i }).click();
    await panelError
      .filter({ hasText: /own this file|permission|commercial use|crop, resize/i })
      .waitFor({ timeout: 8000 });
    await panelError.scrollIntoViewIfNeeded();
    const firstSendError = await panelError.innerText();
    report.firstSendError = firstSendError;
    report.checks.rightsRequiredBeforeSend =
      /own this file|permission|commercial use|crop, resize/i.test(firstSendError);
    report.proofs.push(await shot(page, "materials-rights-03-rights-bypass.png"));

    await fillClearanceRights(logoCard);
    await logoCard.getByRole("button", { name: /Send to Studio/i }).click();
    await panelError
      .filter({ hasText: /file upload is required|choose a file/i })
      .waitFor({ timeout: 8000 });
    await panelError.scrollIntoViewIfNeeded();
    const missingFileText = await panelError.innerText();
    report.missingFileError = missingFileText;
    report.checks.missingFileBlocked = /file upload is required|choose a file/i.test(
      missingFileText,
    );
    report.proofs.push(await shot(page, "materials-rights-03b-missing-file.png"));

    await logoCard.locator('input[type="file"]').setInputFiles(mismatchPath);
    await logoCard
      .locator(".sb-materials-intake__file-state--error")
      .filter({ hasText: /not supported/i })
      .waitFor({ timeout: 8000 });
    report.checks.mismatchedTypeBlocked = true;
    report.proofs.push(await shot(page, "materials-rights-04-mismatch.png"));

    await logoCard.locator('input[type="file"]').setInputFiles(CORRUPT_PNG);
    await fillClearanceRights(logoCard);
    const corruptResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/materials") && response.request().method() === "PATCH",
    );
    await logoCard.getByRole("button", { name: /Send to Studio/i }).click();
    const corruptResponse = await corruptResponsePromise;
    report.corruptStatus = corruptResponse.status();
    const corruptBody = await corruptResponse.json().catch(() => ({}));
    const corruptAlert = await panelError.innerText().catch(() => "");
    report.corruptError = String(corruptBody.error ?? corruptAlert);
    report.checks.corruptRejected =
      !corruptResponse.ok() &&
      /could not|reject|empty|unsupported|try again|content|corrupt|incomplete/i.test(
        report.corruptError,
      );
    report.proofs.push(await shot(page, "materials-rights-05-corrupt.png"));

    await logoCard.locator('input[type="file"]').setInputFiles(ORDINARY_MARK);
    await fillClearanceRights(logoCard);
    const successPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/materials") && response.request().method() === "PATCH",
    );
    await logoCard.getByRole("button", { name: /Send to Studio/i }).click();
    const successResponse = await successPromise;
    report.successStatus = successResponse.status();
    report.checks.uploadAccepted = successResponse.ok();
    await page
      .locator(".sb-materials-intake__success, .sb-materials-intake__stored-file")
      .first()
      .waitFor({ timeout: 15000 });
    const afterUpload = await page.evaluate(readBoardMaterialsState);
    report.afterUpload = afterUpload;
    report.checks.stillMayaProject =
      /Boutique/i.test(afterUpload.title) && afterUpload.amountDue === 6900;
    report.checks.noHorizontalOverflow = afterUpload.horizontalOverflow === false;
    report.checks.addMoreTouchTarget = afterUpload.addMoreHeight >= 40;
    report.checks.noReviewOverlap = afterUpload.overlapAddMoreReview === false;
    report.proofs.push(await shot(page, "materials-rights-07-success.png"));

    await page.reload({ waitUntil: "load" });
    await page
      .locator("#sb-current-campaign-title")
      .filter({ hasText: /Boutique/i })
      .waitFor({ timeout: 15000 });
    await page.getByRole("button", { name: /Add more \(optional\)/i }).click();
    await page.getByText(/We have pine-petal-ordinary-mark\.png stored/i).waitFor({
      timeout: 15000,
    });
    const afterReload = await page.evaluate(readBoardMaterialsState);
    const sessionAfter = await page.evaluate(async () => {
      const response = await fetch("/api/auth/session", { credentials: "include" });
      const body = await response.json().catch(() => ({}));
      return { hasUser: Boolean(body.user?.id), displayName: body.user?.displayName ?? null };
    });
    report.afterReload = afterReload;
    report.sessionAfterReload = sessionAfter;
    report.checks.refreshStillAuthenticated = sessionAfter.hasUser === true;
    report.checks.refreshStillMayaProject =
      /Boutique/i.test(afterReload.title) && afterReload.paidAt === true;
    report.checks.refreshStillIntake = afterReload.intakeSubmitted === true;
    report.checks.storedFileSurvivesRefresh = await page
      .getByText(/We have pine-petal-ordinary-mark\.png stored/i)
      .count()
      .then((count) => count > 0);
    report.proofs.push(await shot(page, "materials-rights-08-refresh.png"));

    const nothingRequired = afterReload.nothingRequired === true;
    report.checks.honestNothingRequired = nothingRequired && materialsGet.blocking === 0;

    const afterMaya = await countMayaAccounts();
    report.afterMaya = afterMaya;
    report.checks.noExtraMayaAccount = afterMaya.maya === beforeMaya.maya;

    const failed = Object.entries(report.checks).filter(([, value]) => !value);
    report.ok = failed.length === 0 && report.pageErrors.length === 0;
    report.failed = failed.map(([key]) => key);
  } catch (error) {
    report.ok = false;
    report.error = String(error);
    try {
      report.debug = { url: page.url() };
      report.proofs.push(await shot(page, "materials-rights-error.png"));
    } catch {
      /* ignore */
    }
  } finally {
    await unlink(mismatchPath).catch(() => {});
    await writeFile(
      path.join(OUT, "materials-rights-report.json"),
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
