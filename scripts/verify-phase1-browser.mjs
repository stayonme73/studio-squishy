/**
 * Phase 1 manual verification — browser automation.
 * Run: node scripts/verify-phase1-browser.mjs
 * Requires: dev server on localhost:3000, playwright (npx auto-installs).
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

const visionData = {
  project: "Summer Product Launch",
  business: "Tagia Bakery",
  audienceFit: "local",
  audienceNotes: "Families within 10 miles",
  message: "Fresh pastries every morning",
  goalSelections: ["awareness"],
  goalNotes: "Drive foot traffic",
  brandPersonalitySelections: ["warm"],
  brandPersonalityNotes: "",
  brandHasColors: "yes",
  brandColorList: "Cream, teal",
  brandColorSelections: [],
  brandColorNotes: "",
  visionFeel: "Welcoming and bright",
  visionRemember: "The smell of fresh bread",
  visionDesired: "More weekend visits",
  visionSuccess: "20% increase in Saturday sales",
  visionAvoid: "Generic stock photos",
  inspirationLike: "Hand-drawn menu boards",
  inspirationDislike: "Cold corporate ads",
  anythingElse: "Launch before July 4",
};

function buildCampaign(status) {
  const now = new Date().toISOString();
  return {
    campaignId: "verify-phase1-campaign",
    campaignName: "Summer Product Launch",
    campaignStatus: status,
    campaignDescription: "Phase 1 verification campaign",
    estimatedCompletion: "Approximately 7 business days",
    packageId: "growth",
    packageLabel: "GROWTH",
    intake: {
      idea: visionData.project,
      audience: "Local families",
      action: "Drive foot traffic",
      deadline: "Before July 4",
      submittedAt: now,
    },
    visionData,
    visionSubmittedAt: now,
    paymentReceivedAt: status !== "DRAFT_RECEIVED" ? now : null,
    targetCompletionDate: null,
    revisionRoundsIncluded: 3,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    studioNotes: [{ date: "Today", message: "Vision Intake received." }],
    createdAt: now,
    updatedAt: now,
  };
}

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function seedCampaign(page, status) {
  const campaign = buildCampaign(status);
  await page.goto(BASE);
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
    },
    { key: CAMPAIGN_KEY, value: campaign },
  );
  return campaign;
}

async function waitForCampaignReady(page) {
  await page.waitForFunction(
    () => {
      const title = document.querySelector("#sb-campaign-title")?.textContent ?? "";
      const status = document.querySelector(".sb-campaign__status");
      return (
        title.includes("Summer") &&
        status !== null &&
        !status.classList.contains("sb-campaign__status--empty")
      );
    },
    { timeout: 15000 },
  );
}

async function verifyStudioBoardSnapshot(page) {
  await page.goto(`${BASE}/studio-board`);
  await waitForCampaignReady(page);

  const title = (await page.textContent("#sb-campaign-title"))?.trim() ?? "";
  if (title.includes("Summer")) pass("Studio Board — campaign title", title);
  else fail("Studio Board — campaign title", title);

  const revisionsLabel = await page.locator(".sb-campaign__metric").first().textContent();
  if (revisionsLabel?.includes("Revisions Remaining") && revisionsLabel.includes("3")) {
    pass("Studio Board — revisions remaining", "3 shown");
  } else {
    fail("Studio Board — revisions remaining", revisionsLabel ?? "missing");
  }

  const deliverablesText = await page.locator(".sb-campaign__metric").nth(1).textContent();
  if (deliverablesText?.includes("Deliverables Remaining")) {
    pass("Studio Board — deliverables remaining summary", deliverablesText.replace(/\s+/g, " ").trim());
  } else {
    fail("Studio Board — deliverables remaining summary", deliverablesText ?? "missing");
  }

  const noteCount = await page.locator(".sb-notes__item").count();
  if (noteCount === 1) pass("Studio Board — last studio note only", `count=${noteCount}`);
  else fail("Studio Board — last studio note only", `count=${noteCount}`);

  const historyHref = await page.locator(".sb-notes__history").getAttribute("href");
  if (historyHref === "/campaign-details") pass("Studio Board — View Campaign History href", historyHref);
  else fail("Studio Board — View Campaign History href", historyHref ?? "missing");
}

async function verifyCampaignHistoryRouting(page) {
  await page.click(".sb-notes__history");
  await page.waitForURL("**/campaign-details**", { timeout: 10000 });
  pass("Campaign History routing", page.url());
}

async function verifyCampaignPageRecord(page) {
  await page.waitForSelector("#cd-vision-title", { timeout: 10000 });

  const visionSections = await page.locator(".cd-vision__section").count();
  if (visionSections > 0) pass("Campaign Page — Vision Summary sections", `count=${visionSections}`);
  else fail("Campaign Page — Vision Summary sections", "empty");

  const visionText = await page.locator(".cd-vision").textContent();
  if (visionText?.includes("Summer Product Launch")) {
    pass("Campaign Page — Vision Summary content", "project visible");
  } else {
    fail("Campaign Page — Vision Summary content", "project not found");
  }

  const revisionRemaining = await page.locator(".cd-revisions__value--highlight").textContent();
  if (revisionRemaining?.trim() === "3") pass("Campaign Page — Revision Tracker", "3 remaining");
  else fail("Campaign Page — Revision Tracker", revisionRemaining ?? "missing");

  const deliverableRows = await page.locator(".cd-deliverables-remaining__item").count();
  if (deliverableRows >= 6) pass("Campaign Page — Deliverables progress", `rows=${deliverableRows}`);
  else fail("Campaign Page — Deliverables progress", `rows=${deliverableRows}`);

  const originalRequest = await page.getByText("Original Request").count();
  const intakeSummary = await page.getByText("Intake Summary").count();
  if (originalRequest === 0 && intakeSummary === 0) {
    pass("Campaign Page — duplicate sections removed");
  } else {
    fail("Campaign Page — duplicate sections removed", `original=${originalRequest} intake=${intakeSummary}`);
  }

  const helpLink = await page.locator(".utility-help-link__a").count();
  const faqOnCampaign = await page.getByText("WHY ARE PAYMENTS NON-REFUNDABLE?").count();
  const refundOnCampaign = await page.getByText("REFUND POLICY").count();
  if (helpLink > 0 && faqOnCampaign === 0 && refundOnCampaign === 0) {
    pass("Campaign Page — reference content relocated to Help Center links");
  } else {
    fail(
      "Campaign Page — reference content relocated",
      `links=${helpLink} faq=${faqOnCampaign} policy=${refundOnCampaign}`,
    );
  }

  const notesCount = await page.locator(".cd-updates__item").count();
  if (notesCount >= 1) pass("Campaign Page — Studio Notes history", `count=${notesCount}`);
  else fail("Campaign Page — Studio Notes history");
}

async function verifyFiveStatusProgression(page) {
  const statuses = [
    { param: "intake", status: "DRAFT_RECEIVED", label: "Intake Complete", journeyLabel: "Intake Complete" },
    { param: "payment", status: "PAYMENT_RECEIVED", label: "Payment Received", journeyLabel: "Payment Received" },
    { param: "concepts", status: "BUILDING_CONCEPTS", label: "Building Concepts", journeyLabel: "Building Concepts" },
    { param: "review", status: "READY_FOR_REVIEW", label: "Ready for Review", journeyLabel: "Ready For Review" },
    { param: "delivered", status: "DELIVERED", label: "Delivered", journeyLabel: "Delivered" },
  ];

  for (const { param, status, label, journeyLabel } of statuses) {
    await seedCampaign(page, status);
    await page.goto(`${BASE}/studio-board?status=${param}`);
    await waitForCampaignReady(page);

    const statusText = (await page.textContent(".sb-campaign__status"))?.trim() ?? "";
    if (statusText.toLowerCase().includes(label.toLowerCase())) {
      pass(`Five-status — ${label}`, statusText);
    } else {
      fail(`Five-status — ${label}`, `got "${statusText}"`);
    }

    const journeyText =
      (await page.locator(".sb-journey__step--current .sb-journey__label").textContent())?.trim() ?? "";
    if (journeyText === journeyLabel) {
      pass(`Five-status journey rail — ${journeyLabel}`, journeyText);
    } else {
      fail(`Five-status journey rail — ${journeyLabel}`, journeyText || "no current step");
    }
  }
}

async function verifyPaymentFlow(page) {
  await seedCampaign(page, "DRAFT_RECEIVED");
  await page.goto(`${BASE}/payment?package=growth`);
  await page.waitForSelector(".payment-placeholder__cta", { timeout: 10000 });
  await page.click(".payment-placeholder__cta");
  await page.waitForURL("**/studio-board**", { timeout: 10000 });

  const status = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw).campaignStatus : null;
  }, CAMPAIGN_KEY);

  if (status === "PAYMENT_RECEIVED") pass("Payment flow — marks PAYMENT_RECEIVED", status);
  else fail("Payment flow — marks PAYMENT_RECEIVED", status ?? "null");
}

async function verifyHelpCenter(page) {
  await page.goto(`${BASE}/help-center?from=campaign-details`);
  await page.waitForSelector("#hc-philosophy-title", { timeout: 10000 });

  const philosophy = await page.getByText("WHAT DOES THE STUDIO DO?").count();
  const paymentFaq = await page.getByText("WHY ARE PAYMENTS NON-REFUNDABLE?").count();
  const refundPolicy = await page.getByText("REFUND POLICY").count();
  if (philosophy > 0 && paymentFaq > 0 && refundPolicy > 0) {
    pass("Help Center — philosophy, FAQ, policies from policies.ts");
  } else {
    fail("Help Center — philosophy, FAQ, policies from policies.ts");
  }

  const backLabel = await page.locator(".hc-back").textContent();
  if (backLabel?.includes("Campaign Details")) {
    pass("Help Center — context back link", backLabel.trim());
  } else {
    fail("Help Center — context back link", backLabel ?? "missing");
  }
}

async function main() {
  let browser;
  try {
    const probe = await fetch(BASE, { signal: AbortSignal.timeout(5000) });
    if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
  } catch (error) {
    console.error(`Dev server not reachable at ${BASE}: ${error.message}`);
    process.exit(1);
  }

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await seedCampaign(page, "PAYMENT_RECEIVED");
  await verifyStudioBoardSnapshot(page);
  await verifyCampaignHistoryRouting(page);
  await verifyCampaignPageRecord(page);
  await verifyHelpCenter(page);
  await verifyFiveStatusProgression(page);
  await verifyPaymentFlow(page);

  const failed = results.filter((r) => !r.ok);
  console.log("\n---");
  console.log(`Results: ${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.log("\nFailed checks:");
    for (const item of failed) console.log(`  - ${item.name}: ${item.detail}`);
    process.exit(1);
  }
  console.log("\nPhase 1 manual verification: ALL PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
