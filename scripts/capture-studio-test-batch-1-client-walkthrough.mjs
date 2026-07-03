/**
 * Capture screenshots and proof for the Test Batch 1 Social Posts client walkthrough.
 *
 * Requires a running app server at VERIFY_BASE_URL (default http://localhost:3000).
 *
 * Usage:
 *   node scripts/capture-studio-test-batch-1-client-walkthrough.mjs
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

import {
  CAMPAIGN_ID,
  CLIENT_EMAIL,
  CLIENT_PASSWORD,
  OUT_DIR,
  REQUIRED_SOCIAL_MATERIALS,
  SOCIAL_JOB_ID,
  SOURCE_BATCH_ID,
  setupStudioTestBatch1ClientWalkthrough,
} from "./setup-studio-test-batch-1-client-walkthrough.mjs";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const LOGIN = { email: CLIENT_EMAIL, password: CLIENT_PASSWORD };
const BOARD_PATH = `/studio-board?campaignId=${CAMPAIGN_ID}`;

const screenshots = {
  beforeBoard: path.join(OUT_DIR, "01-board-materials-needed.png"),
  beforeFields: path.join(OUT_DIR, "02-required-social-posts-fields.png"),
  afterBoard: path.join(OUT_DIR, "03-board-after-materials-submit.png"),
};

const sourceBatchPaths = {
  campaign: path.join(process.cwd(), "data", "campaigns", `${SOURCE_BATCH_ID}.json`),
  tasks: path.join(process.cwd(), "data", "campaign-tasks", `${SOURCE_BATCH_ID}.json`),
  materials: path.join(process.cwd(), "data", "campaign-materials", `${SOURCE_BATCH_ID}.json`),
  production: path.join(process.cwd(), "data", "campaign-production", `${SOURCE_BATCH_ID}.json`),
};

const submissionPayloads = {
  "factual-confirmation:confirmation": {
    text: "Instagram feed posts, square 1080 x 1080 px.",
  },
  "document-reference:text": {
    text:
      "Goal: announce The Studio Social Posts walkthrough and show how client materials unlock production. Message: simple, calm, client-led intake.",
  },
  "url-link:url": {
    url: "https://example.local/studio-social-posts-walkthrough",
    note: "Local walkthrough destination placeholder, not a public account.",
  },
  "other:text": {
    text:
      "Include: Client materials required before production. Disclosure: Internal walkthrough fixture only; no public posting or account access.",
  },
  "logo-brand:file-metadata": {
    fileName: "Existing Studio brand/logo/visual references - reference only, no file uploaded",
    mimeType: "text/reference",
    note:
      "Use real Studio-owned brand direction already available to Tagia. This fixture does not seed fake assets.",
  },
};

async function hashFile(filePath) {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

async function hashSourceBatch() {
  const entries = await Promise.all(
    Object.entries(sourceBatchPaths).map(async ([name, filePath]) => [
      name,
      {
        path: path.relative(process.cwd(), filePath),
        sha256: await hashFile(filePath),
      },
    ]),
  );
  return Object.fromEntries(entries);
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function loginContext(context) {
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: LOGIN });
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  }
}

async function goto(page, urlPath) {
  await page.goto(`${BASE}${urlPath}`, { waitUntil: "networkidle", timeout: 60000 });
}

async function captureFullPage(page, filePath) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: filePath, fullPage: true });
}

async function readJobStatusFromDisk() {
  const tasks = await readJson(
    path.join(process.cwd(), "data", "campaign-tasks", `${CAMPAIGN_ID}.json`),
  );
  const job = tasks.jobRecords?.find((record) => record.jobId === SOCIAL_JOB_ID);
  return job?.spineStatus ?? null;
}

async function fetchMaterials(context) {
  const res = await context.request.get(`${BASE}/api/campaigns/${CAMPAIGN_ID}/materials`);
  if (!res.ok()) {
    throw new Error(`Materials request failed: ${res.status()} ${await res.text()}`);
  }
  return res.json();
}

async function waitForMaterialsPatch(page, action) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes(`/api/campaigns/${CAMPAIGN_ID}/materials`) &&
      response.request().method() === "PATCH",
    { timeout: 30000 },
  );
  await action();
  const response = await responsePromise;
  if (!response.ok()) {
    throw new Error(`Materials submit failed: ${response.status()} ${await response.text()}`);
  }
}

async function submitRequest(page, request) {
  const payload = submissionPayloads[`${request.category}:${request.contentKind}`];
  if (!payload) {
    throw new Error(`No submission payload for ${request.category}:${request.contentKind}`);
  }

  const item = page
    .locator(".sb-materials-intake__item")
    .filter({ hasText: request.prompt })
    .first();
  await item.scrollIntoViewIfNeeded();

  if (payload.text) {
    await item.locator("textarea").first().fill(payload.text);
  }
  if (payload.url) {
    await item.locator('input[type="url"]').first().fill(payload.url);
  }
  if (payload.fileName) {
    await item.locator('input[type="text"]').first().fill(payload.fileName);
  }
  if (payload.mimeType) {
    const textInputs = item.locator('input[type="text"]');
    if ((await textInputs.count()) > 1) {
      await textInputs.nth(1).fill(payload.mimeType);
    }
  }
  if (payload.note) {
    const textareas = item.locator("textarea");
    if ((await textareas.count()) > 1) {
      await textareas.nth(1).fill(payload.note);
    }
  }

  await waitForMaterialsPatch(page, async () => {
    await item.getByRole("button", { name: "Send to Studio" }).click();
  });
}

async function appendReport({ beforeJobStatus, afterJobStatus, beforeMaterials, afterMaterials, sourceHashesBefore, sourceHashesAfter }) {
  const existing = await readFile(path.join(OUT_DIR, "report.md"), "utf8");
  const sourceUnchanged = JSON.stringify(sourceHashesBefore) === JSON.stringify(sourceHashesAfter);
  const lines = [
    existing.trimEnd(),
    "",
    "## Captured Verification",
    "",
    `Base URL: \`${BASE}\``,
    `Exact URL: \`${BASE}${BOARD_PATH}\``,
    `Login: \`${CLIENT_EMAIL}\` / \`${CLIENT_PASSWORD}\``,
    "",
    "### Screenshot Paths",
    "",
    ...Object.values(screenshots).map((filePath) => `- \`${path.relative(process.cwd(), filePath)}\``),
    "",
    "### Before Submission",
    "",
    `- Campaign status: \`PAYMENT_RECEIVED\``,
    `- Social Posts job status: \`${beforeJobStatus}\``,
    `- Blocking required materials: \`${beforeMaterials.blockingRequiredCount}\``,
    "- Required fields visible/requested:",
    ...REQUIRED_SOCIAL_MATERIALS.map((item) => `  - ${item.label}`),
    "",
    "### After Submission",
    "",
    `- Social Posts job status: \`${afterJobStatus}\``,
    `- Blocking required materials: \`${afterMaterials.blockingRequiredCount}\``,
    "- Submitted materials stay client-visible as `Received — under review` while the job returns to the normal queue.",
    "",
    "### Existing Batch 1 Proof",
    "",
    `- Existing \`${SOURCE_BATCH_ID}\` files unchanged: \`${sourceUnchanged ? "yes" : "no"}\``,
    "",
  ];
  await writeFile(path.join(OUT_DIR, "report.md"), `${lines.join("\n")}\n`, "utf8");
}

async function resetFixturePreservingReport() {
  const reportPath = path.join(OUT_DIR, "report.md");
  const capturedReport = await readFile(reportPath, "utf8");
  await setupStudioTestBatch1ClientWalkthrough();
  const lines = [
    capturedReport.trimEnd(),
    "",
    "## Current Fixture State",
    "",
    "- After capturing the before/after proof, the fixture was reset to the clean starting state.",
    "- Current Social Posts job status: `waiting_on_client`.",
    "- Current blocking required materials: `5`.",
    "- Rerun `node scripts/capture-studio-test-batch-1-client-walkthrough.mjs` to reproduce screenshots and transition proof.",
    "",
  ];
  await writeFile(reportPath, `${lines.join("\n")}`, "utf8");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const sourceHashesBefore = await hashSourceBatch();
  await setupStudioTestBatch1ClientWalkthrough();
  const sourceHashesAfterSetup = await hashSourceBatch();

  if (JSON.stringify(sourceHashesBefore) !== JSON.stringify(sourceHashesAfterSetup)) {
    throw new Error(`${SOURCE_BATCH_ID} changed during walkthrough setup.`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await loginContext(context);
  const page = await context.newPage();

  try {
    await goto(page, BOARD_PATH);
    await page.waitForSelector(".sb", { timeout: 30000 });
    await page.waitForSelector("text=Test Batch 1 Social Posts Client Walkthrough", { timeout: 30000 });
    await page.waitForSelector("text=Materials we still need", { timeout: 30000 });
    await page.waitForSelector("text=Confirm the one social platform and post size", { timeout: 30000 });
    await captureFullPage(page, screenshots.beforeBoard);

    await page.locator(".sb-card__tab", { hasText: "Materials we still need" }).first().scrollIntoViewIfNeeded();
    for (const item of REQUIRED_SOCIAL_MATERIALS) {
      await page.waitForSelector(`text=${item.clientFacingPrompt}`, { timeout: 30000 });
    }
    await captureFullPage(page, screenshots.beforeFields);

    const beforeJobStatus = await readJobStatusFromDisk();
    const beforeMaterials = await fetchMaterials(context);
    if (beforeJobStatus !== "waiting_on_client") {
      throw new Error(`Expected waiting_on_client before submission, got ${beforeJobStatus}`);
    }
    if (beforeMaterials.blockingRequiredCount !== REQUIRED_SOCIAL_MATERIALS.length) {
      throw new Error(`Expected ${REQUIRED_SOCIAL_MATERIALS.length} blocking materials before submission.`);
    }

    for (const request of beforeMaterials.consolidatedRequests ?? []) {
      await submitRequest(page, request);
    }

    await page.waitForSelector("text=Received — under review", { timeout: 30000 });
    await page.waitForTimeout(500);
    await captureFullPage(page, screenshots.afterBoard);

    const afterJobStatus = await readJobStatusFromDisk();
    const afterMaterials = await fetchMaterials(context);
    if (afterJobStatus !== "ready_for_queue") {
      throw new Error(`Expected ready_for_queue after submission, got ${afterJobStatus}`);
    }
    if (afterMaterials.blockingRequiredCount !== 0) {
      throw new Error(`Expected 0 blocking materials after submission, got ${afterMaterials.blockingRequiredCount}`);
    }

    const sourceHashesAfter = await hashSourceBatch();
    if (JSON.stringify(sourceHashesBefore) !== JSON.stringify(sourceHashesAfter)) {
      throw new Error(`${SOURCE_BATCH_ID} changed during walkthrough capture.`);
    }

    await writeFile(
      path.join(OUT_DIR, "proof.json"),
      JSON.stringify(
        {
          campaignId: CAMPAIGN_ID,
          capturedAt: new Date().toISOString(),
          baseUrl: BASE,
          url: `${BASE}${BOARD_PATH}`,
          login: { email: CLIENT_EMAIL, password: CLIENT_PASSWORD },
          before: {
            campaignStatus: "PAYMENT_RECEIVED",
            socialJobStatus: beforeJobStatus,
            blockingRequiredCount: beforeMaterials.blockingRequiredCount,
          },
          after: {
            socialJobStatus: afterJobStatus,
            blockingRequiredCount: afterMaterials.blockingRequiredCount,
          },
          sourceBatchProof: {
            campaignId: SOURCE_BATCH_ID,
            before: sourceHashesBefore,
            after: sourceHashesAfter,
            unchanged: true,
          },
          screenshots: Object.fromEntries(
            Object.entries(screenshots).map(([name, filePath]) => [
              name,
              path.relative(process.cwd(), filePath),
            ]),
          ),
        },
        null,
        2,
      ),
      "utf8",
    );

    await appendReport({
      beforeJobStatus,
      afterJobStatus,
      beforeMaterials,
      afterMaterials,
      sourceHashesBefore,
      sourceHashesAfter,
    });
    await resetFixturePreservingReport();

    console.log(`Screenshots saved to ${path.relative(process.cwd(), OUT_DIR)}`);
    for (const [name, filePath] of Object.entries(screenshots)) {
      console.log(`${name}: ${path.relative(process.cwd(), filePath)}`);
    }
    console.log(`Report: ${path.join("tmp", CAMPAIGN_ID, "report.md")}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
