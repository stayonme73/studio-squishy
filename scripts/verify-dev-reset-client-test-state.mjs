/**
 * Dev reset + access-state validation — browser + API.
 * Requires dev server on localhost:3000.
 *
 * Run: node scripts/verify-dev-reset-client-test-state.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const WALKTHROUGH = {
  email: "tagia-client-walkthrough@local.dev",
  password: "dev-only",
  campaignId: "studio-test-batch-1-client-walkthrough",
};
const FOREIGN_CAMPAIGN_ID = "b4c07adf-9776-46c5-8fcf-d4df498cf877";

async function loginContext(context, login) {
  const res = await context.request.post(`${BASE}/api/auth/login`, { data: login });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
}

async function readCurrentCampaignApi(context) {
  const res = await context.request.get(`${BASE}/api/campaigns/current`);
  if (res.status() === 401) return { status: 401, campaign: null };
  const body = await res.json();
  return { status: res.status(), campaign: body.campaign?.record ?? null };
}

async function resetViaApi(context) {
  return context.request.post(`${BASE}/api/dev/reset-client-test-state`);
}

async function seedCurrentCampaign(context) {
  const campaignRes = await context.request.get(
    `${BASE}/api/campaigns/${encodeURIComponent(WALKTHROUGH.campaignId)}`,
  );
  if (!campaignRes.ok()) {
    throw new Error(`Could not load fixture campaign for seeding: ${campaignRes.status()}`);
  }
  const body = await campaignRes.json();
  const record = body.campaign?.record;
  if (!record?.campaignId) {
    throw new Error("Fixture campaign record missing for seeding.");
  }
  const patchRes = await context.request.patch(`${BASE}/api/campaigns/current`, {
    data: { record },
  });
  if (!patchRes.ok()) {
    throw new Error(`Seed PATCH failed: ${patchRes.status()} ${await patchRes.text()}`);
  }
}

async function clearStudioSquishyStorage(page) {
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("studio-squishy:")) localStorage.removeItem(key);
    }
  });
}

async function expectNoAccessDeniedCopy(page) {
  const denied = page.getByRole("heading", { name: /^Access denied$/i });
  if (await denied.count()) {
    throw new Error("Expected no Access denied heading for no-active-project state.");
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await loginContext(context, WALKTHROUGH);
  await seedCurrentCampaign(context);

  const before = await readCurrentCampaignApi(context);
  if (!before.campaign) {
    throw new Error("Expected walkthrough client to have a current campaign before reset.");
  }

  const resetRes = await resetViaApi(context);
  if (!resetRes.ok()) {
    throw new Error(`Reset API failed: ${resetRes.status()} ${await resetRes.text()}`);
  }

  const after = await readCurrentCampaignApi(context);
  if (after.campaign) {
    throw new Error("Expected /api/campaigns/current to return null after reset.");
  }
  console.log("PASS  1. Dev reset clears stale campaign data");

  const page = await context.newPage();

  await page.goto(`${BASE}/studio-board?campaignId=${WALKTHROUGH.campaignId}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(2000);
  const fixtureTitle = page.getByRole("heading", {
    name: /Test Batch 1 Social Posts Client Walkthrough/i,
  });
  if (!(await fixtureTitle.count())) {
    throw new Error("Fixture URL should still load when opened directly.");
  }

  await clearStudioSquishyStorage(page);
  await resetViaApi(context);
  await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3500);

  const staleHeading = page.getByRole("heading", {
    name: /Test Batch 1 Social Posts Client Walkthrough/i,
  });
  if (await staleHeading.count()) {
    throw new Error("Stale fixture campaign reappeared on /studio-board after reset.");
  }

  const noActiveHeading = page.getByRole("heading", { name: /^No Active Project$/i });
  if (!(await noActiveHeading.count())) {
    throw new Error("Expected /studio-board to show No Active Project after reset.");
  }
  await expectNoAccessDeniedCopy(page);
  console.log("PASS  2. /studio-board shows No Active Project, not Access Denied");

  for (const pattern of [
    /Social Posts/i,
    /Custom Studio Plan/i,
    /Payment Pending/i,
    /\$2,400/,
    /Make My Social Media Posts/i,
  ]) {
    if (await page.getByText(pattern).count()) {
      throw new Error(`Expected no stale snapshot copy matching ${pattern} after reset.`);
    }
  }
  if (!(await page.getByText(/^Materials Received$/i).count())) {
    throw new Error("Expected Materials Received tile after reset.");
  }
  if (!(await page.getByText(/^Materials We Still Need$/i).count())) {
    throw new Error("Expected Materials We Still Need tile after reset.");
  }
  if (!(await page.getByText(/^What You Should Do Next$/i).count())) {
    throw new Error("Expected What You Should Do Next tile after reset.");
  }
  console.log("PASS  2c. Empty board keeps clean snapshot and visible bottom row");

  await page.evaluate(() => {
    localStorage.setItem(
      "studio-squishy:current-campaign",
      JSON.stringify({
        campaignId: "owner-qa-dev",
        campaignName: "Tagia Bakery Campaign",
        campaignStatus: "READY_FOR_REVIEW",
        campaignDescription: "Stale Owner QA seed",
        estimatedCompletion: "TBD",
        packageId: "custom-studio-plan",
        packageLabel: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
  });
  await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3500);
  const staleLocalNoActive = page.getByRole("heading", { name: /^No Active Project$/i });
  if (!(await staleLocalNoActive.count())) {
    throw new Error("Expected stale local Owner QA campaign to show No Active Project on clean /studio-board.");
  }
  await expectNoAccessDeniedCopy(page);
  console.log("PASS  2b. Stale local campaign on clean /studio-board shows No Active Project");

  const startProjectLink = page.getByRole("link", { name: /^START A NEW PROJECT$/i });
  if (!(await startProjectLink.count())) {
    throw new Error("Expected START A NEW PROJECT link on Studio Board empty state.");
  }
  const href = await startProjectLink.first().getAttribute("href");
  if (href !== "/route-map") {
    throw new Error(`Expected START A NEW PROJECT to route to /route-map, got ${href}`);
  }
  console.log("PASS  3. Start a New Project routes to /route-map");

  await page.goto(`${BASE}/feedback-studio`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  const reviewNoActive = page.getByRole("heading", { name: /^No Active Project$/i });
  if (!(await reviewNoActive.count())) {
    throw new Error("Expected Review Room to show No Active Project when no campaign exists.");
  }
  await expectNoAccessDeniedCopy(page);

  await page.goto(`${BASE}/deliverables`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  const deliveryNoActive = page.getByRole("heading", { name: /^No Deliveries Available$/i });
  if (!(await deliveryNoActive.count())) {
    throw new Error("Expected Final Delivery to show No Deliveries Available when no campaign exists.");
  }
  await expectNoAccessDeniedCopy(page);
  console.log("PASS  4. Review Room and Final Delivery show correct no-active state");

  await page.goto(`${BASE}/studio-board?campaignId=${FOREIGN_CAMPAIGN_ID}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(3500);
  const deniedHeading = page.getByRole("heading", { name: /^Access denied$/i });
  if (!(await deniedHeading.count())) {
    throw new Error("Expected Access denied for a campaign the client cannot read.");
  }
  const noActiveOnDenied = page.getByRole("heading", { name: /^No Active Project$/i });
  if (await noActiveOnDenied.count()) {
    throw new Error("Permission denial should not show No Active Project.");
  }
  console.log("PASS  5. True permission denial still says Access Denied");

  await clearStudioSquishyStorage(page);
  await resetViaApi(context);
  await page.route("**/api/campaigns/current", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Simulated server failure" }),
    }),
  );
  await page.goto(`${BASE}/studio-board`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3500);
  const loadErrorHeading = page.getByRole("heading", {
    name: /^We couldn't load your project$/i,
  });
  if (!(await loadErrorHeading.count())) {
    throw new Error("Expected load error state when /api/campaigns/current fails.");
  }
  const tryAgain = page.getByRole("button", { name: /^Try again$/i });
  if (!(await tryAgain.count())) {
    throw new Error("Expected Try again button on load error state.");
  }
  console.log("PASS  6. Server/data failure still says We couldn't load your project");

  await seedCurrentCampaign(context);
  await page.goto(`${BASE}/studio-board?campaignId=${encodeURIComponent(WALKTHROUGH.campaignId)}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(3500);
  const activeCampaignHeading = page.getByRole("heading", {
    name: /Test Batch 1 Social Posts Client Walkthrough/i,
  });
  if (!(await activeCampaignHeading.count())) {
    throw new Error("Expected active campaign board to show campaign title.");
  }
  if (!(await page.getByText(/^Social Posts$/i).count())) {
    throw new Error("Expected active campaign Project Snapshot to show deliverables.");
  }
  if (!(await page.getByText(/^Materials Received$/i).count())) {
    throw new Error("Expected active campaign board to show materials row.");
  }
  console.log("PASS  7. Active campaign board still renders populated state");

  await browser.close();
  console.log("\nAll dev reset + access-state checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
