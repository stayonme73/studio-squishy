/**
 * Materials Upload browser E2E — local QA only (Customer-One / Proof Co fixture).
 * Usage: node scripts/materials-upload-browser-e2e-qa.mjs
 * Requires: dev server on http://127.0.0.1:3475
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.STUDIO_BASE_URL ?? "http://127.0.0.1:3475";
const OUT_DIR = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1",
  "materials-upload-e2e-proofs",
);

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function uniquePngBuffer(seed) {
  const buf = Buffer.from(PNG_1X1);
  buf[buf.length - 2] = seed & 0xff;
  return buf;
}

async function signInCustomerOne(context) {
  const res = await context.request.post(`${BASE}/api/auth/local-customer-one`, {
    data: {},
  });
  if (!res.ok()) {
    throw new Error(`Customer-One sign-in failed: ${res.status()}`);
  }
}

async function waitForBoardReady(page) {
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText ?? "";
      return text.includes("Proof Co") && !text.includes("Loading your project");
    },
    { timeout: 45000 },
  );
}

async function openMaterialsPanel(page) {
  await page.evaluate(() => {
    const details = document.getElementById("sb-materials");
    if (details && !details.open) details.open = true;
  });
  const toggle = page.locator(".sb-materials-intake__toggle").first();
  if (await toggle.isVisible().catch(() => false)) {
    const expanded = await toggle.getAttribute("aria-expanded");
    if (expanded !== "true") await toggle.click();
  }
  await page.locator(".sb-materials-intake__list").first().waitFor({ state: "visible", timeout: 15000 });
}

async function scrollMainToLocator(page, locator) {
  await locator.evaluate((el) => {
    const main = document.querySelector(".sb-main");
    if (!main) {
      el.scrollIntoView({ block: "center" });
      return;
    }
    for (let i = 0; i < 24; i++) {
      const r = el.getBoundingClientRect();
      const mr = main.getBoundingClientRect();
      if (r.top >= mr.top + 16 && r.bottom <= mr.bottom - 16) break;
      main.scrollTop += Math.max(0, r.top - mr.top - 100);
    }
  });
}

async function fillRightsInItem(item) {
  const authority = item.locator('.sb-materials-intake__attest input[type="checkbox"]').first();
  await authority.check();

  const groups = item.locator("fieldset.sb-materials-intake__rights-group");
  const count = await groups.count();
  for (let i = 0; i < count; i++) {
    const legend = (await groups.nth(i).locator("legend").innerText()).toLowerCase();
    const yes = groups.nth(i).locator('label:has-text("Yes")');
    const no = groups.nth(i).locator('label:has-text("No")');
    if (legend.includes("commercial") || legend.includes("crop") || legend.includes("adapt")) {
      await yes.click();
    } else if (legend.includes("people") || legend.includes("third")) {
      await no.click();
    }
  }
}

async function findOpenFileUploadItem(page) {
  const items = page.locator("li.sb-materials-intake__item");
  const total = await items.count();
  for (let i = 0; i < total; i++) {
    const item = items.nth(i);
    const fileInput = item.locator('input[type="file"]');
    if ((await fileInput.count()) === 0) continue;
    const text = await item.innerText();
    if (/Withdraw this file/i.test(text) && !/Choose file/i.test(text)) continue;
    if (/Received/i.test(text) && !/Choose file/i.test(text)) continue;
    const submit = item.locator("button.sb-materials-intake__submit");
    if ((await submit.count()) === 0) continue;
    return item;
  }
  return null;
}

async function fetchMaterialsRows(context) {
  const cur = await (await context.request.get(`${BASE}/api/campaigns/current`)).json();
  const campaignId = cur.campaign?.campaignId;
  if (!campaignId) return { blocked: "no campaign" };
  const mat = await (
    await context.request.get(
      `${BASE}/api/campaigns/${encodeURIComponent(campaignId)}/materials?audience=client`,
    )
  ).json();
  const rows = [...(mat.optionalRequests ?? []), ...(mat.consolidatedRequests ?? [])];
  return { campaignId, rows };
}

async function withdrawOptionalStoredFile(context) {
  const { campaignId, rows, blocked } = await fetchMaterialsRows(context);
  if (blocked) return { ok: false, blocked };
  const target =
    rows.find((row) => row.contentKind === "file-metadata" && row.fileName && row.category === "photo-video") ??
    rows.find((row) => row.contentKind === "file-metadata" && row.fileName);
  if (!target?.id) return { ok: false, blocked: "no stored optional file to withdraw" };
  const endpoint = `${BASE}/api/campaigns/${encodeURIComponent(campaignId)}/materials?audience=client`;
  const res = await context.request.patch(endpoint, {
    data: { action: "customer_withdraw_file", itemId: target.id },
  });
  return {
    ok: res.ok(),
    status: res.status(),
    itemId: target.id,
    fileName: target.fileName,
  };
}

async function duplicateRightsProbe(context) {
  const { campaignId, rows, blocked } = await fetchMaterialsRows(context);
  if (blocked) return { blocked };

  const slot = rows.find(
    (row) => row.contentKind === "file-metadata" && row.category === "photo-video",
  );
  if (!slot?.id) return { blocked: "no photo-video slot" };

  const endpoint = `${BASE}/api/campaigns/${encodeURIComponent(campaignId)}/materials?audience=client`;
  const seed = Date.now() % 200 + 1;
  const bytes = uniquePngBuffer(seed);
  const rights = {
    useAuthorizationBasis: "customer_has_permission",
    commercialUsePermitted: "true",
    cropAdaptPermitted: "true",
    recognizablePeoplePresent: "false",
    thirdPartyMaterialPresent: "false",
    attestationTextVersion: "1",
  };

  const first = await context.request.patch(endpoint, {
    multipart: {
      action: "client_submit",
      itemId: slot.id,
      file: { name: `dup-probe-${seed}.png`, mimeType: "image/png", buffer: bytes },
      ...rights,
    },
  });
  const firstJson = await first.json().catch(() => ({}));
  if (!first.ok()) {
    return { blocked: "could not seed file for duplicate probe", status: first.status(), firstJson };
  }

  const beforeFetch = await fetchMaterialsRows(context);
  const before = beforeFetch.rows?.find((row) => row.id === slot.id);

  const dupRes = await context.request.patch(endpoint, {
    multipart: {
      action: "client_submit",
      itemId: slot.id,
      file: { name: `dup-probe-copy-${seed}.png`, mimeType: "image/png", buffer: bytes },
    },
  });
  const dupJson = await dupRes.json().catch(() => ({}));

  const afterFetch = await fetchMaterialsRows(context);
  const after = afterFetch.rows?.find((row) => row.id === slot.id);

  return {
    duplicateStatus: dupRes.status(),
    duplicateMessage: dupJson.receiptMessage ?? dupJson.error ?? null,
    beforeStatus: before?.statusLabel ?? null,
    afterStatus: after?.statusLabel ?? null,
    statusUnchanged: before?.statusLabel === after?.statusLabel,
    duplicateWithoutRightsAccepted: dupRes.ok() && /already have this exact file/i.test(dupJson.receiptMessage ?? ""),
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const report = {
    ok: false,
    base: BASE,
    viewport: { width: 390, height: 844 },
    steps: {},
    duplicateProbe: null,
    error: null,
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  try {
    await signInCustomerOne(context);
    report.duplicateProbe = await duplicateRightsProbe(context);

    await page.goto(`${BASE}/studio-board`, { waitUntil: "domcontentloaded" });
    await waitForBoardReady(page);
    report.steps.boardReady = true;

    await openMaterialsPanel(page);
    report.steps.materialsOpen = true;

    let item = await findOpenFileUploadItem(page);
    if (!item) {
      report.steps.withdrawPrep = await withdrawOptionalStoredFile(context);
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForBoardReady(page);
      await openMaterialsPanel(page);
      item = await findOpenFileUploadItem(page);
    }
    if (!item) {
      throw new Error("No open file upload slot found on Board after withdraw attempt.");
    }

    const seed = (Date.now() % 200) + 50;
    const testFile = path.join(OUT_DIR, `browser-e2e-${Date.now()}.png`);
    await writeFile(testFile, uniquePngBuffer(seed));

    const fileInput = item.locator('input[type="file"]');
    await scrollMainToLocator(page, fileInput);
    await fileInput.setInputFiles(testFile);
    await page.waitForTimeout(500);
    report.steps.fileSelected = true;

    const submit = item.locator("button.sb-materials-intake__submit");
    await scrollMainToLocator(page, submit);
    await submit.click();
    const alert = page.locator('[role="alert"]').filter({
      hasText: /permission|rights|confirm/i,
    });
    await alert.first().waitFor({ state: "visible", timeout: 10000 });
    report.steps.missingRightsBlocked = (await alert.first().innerText()).slice(0, 160);
    report.steps.noFalseSuccess = (await item.locator(".sb-materials-intake__success").count()) === 0;

    await fillRightsInItem(item);
    report.steps.rightsCompleted = true;
    await submit.click();

    const success = item.locator(".sb-materials-intake__success, [role='status']").filter({
      hasText: /received|stored|project/i,
    });
    await success.first().waitFor({ state: "visible", timeout: 20000 });
    report.steps.submitSuccessVisible = (await success.first().innerText()).slice(0, 160);

    await page.screenshot({ path: path.join(OUT_DIR, "01-after-success.png"), fullPage: true });

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForBoardReady(page);
    await openMaterialsPanel(page);
    const persisted = page.locator("li.sb-materials-intake__item").filter({
      hasText: /Received|stored with this project|Under review/i,
    });
    report.steps.persistAfterRefresh = (await persisted.count()) > 0;

    report.ok =
      report.steps.boardReady &&
      report.steps.fileSelected &&
      report.steps.rightsCompleted &&
      Boolean(report.steps.submitSuccessVisible) &&
      report.steps.persistAfterRefresh &&
      Boolean(report.steps.missingRightsBlocked) &&
      report.steps.noFalseSuccess &&
      report.duplicateProbe?.duplicateWithoutRightsAccepted === true &&
      report.duplicateProbe?.statusUnchanged === true;

    await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    await page.screenshot({ path: path.join(OUT_DIR, "error.png"), fullPage: true }).catch(() => {});
    await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main();
