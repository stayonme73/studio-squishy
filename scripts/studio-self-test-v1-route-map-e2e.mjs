/**
 * Studio Self-Test V1 — Route Map four-scenario E2E.
 * Run: node scripts/studio-self-test-v1-route-map-e2e.mjs
 * Requires dev server: npm run dev (localhost:3000)
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/studio-self-test-v1");
const REPORT_PATH = path.join(OUT_DIR, "e2e-report.md");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

const ROAD = {
  i75: "Get My Business Started",
  i20: "Promote Something Now",
  update: "Update What I Already Have",
  random: "I Know What I Need",
};

/** Internal markers that must NOT appear in client Campaign Record summary. */
const CLIENT_LEAK_PATTERNS = [
  /\bv2-rtu-/i,
  /\bv2-addon-/i,
  /\bSKU\b/i,
  /\bPRODUCTION BRIEF\b/i,
  /\brm-j\d{3}\b/i,
  /\bscope routing\b/i,
  /\bJob context\b/i,
  /\bClient sending responsibilities\b/i,
  /\bClient responsibilities\b/i,
];

/** Internal markers that SHOULD appear in production brief. */
const BRIEF_INTERNAL_MARKERS = ["SKU", "Job context", "Deliverables"];

const SCENARIOS = [
  {
    id: "v2-rtu-flyer",
    label: "Flyer",
    persona: "Maria Chen — Maria's Corner Bakery (grand opening flyer)",
    road: ROAD.random,
    jobName: "Make Me a Flyer",
    intakeTitle: "Flyer Intake",
    jobCardPrice: "$300",
    expectedPrice: "$300",
    expectedLineItems: 1,
    productionMarker: "Purpose",
    productionSection: "Flyer",
    markerValue: "Grand opening weekend",
    includePostPublish: false,
    intakeFields: [
      { type: "textarea", value: "Grand opening weekend — celebrate our new location on Main Street" },
      { type: "textarea", value: "June 15–16 · Free coffee with any pastry · 123 Main St · (555) 234-8901" },
      { type: "textarea", value: "Logo PNG, warm cream and brown brand colors, bakery interior photo" },
      { type: "select", value: "Both print and digital" },
      { type: "text", value: "8.5×11 letter" },
    ],
  },
  {
    id: "v2-rtu-social-posts",
    label: "Social Posts + Post/Publish",
    persona: "James Rivera — FitFlow Training Studio (summer membership push)",
    road: ROAD.random,
    jobName: "Make My Social Media Posts",
    intakeTitle: "Social Media Posts Intake",
    jobCardPrice: "$450",
    expectedPrice: "$550",
    expectedLineItems: 2,
    productionMarker: "Publish platform",
    productionSection: "Post / Publish",
    markerValue: "Instagram",
    includePostPublish: true,
    intakeFields: [
      { type: "textarea", value: "Summer membership push — 4 posts promoting our new class schedule" },
      { type: "textarea", value: "Join now — first month 20% off · fitflowstudio.com/join · DM for details" },
      { type: "select", value: "Instagram" },
      { type: "textarea", value: "Logo, gym floor photos, brand teal and charcoal palette" },
      { type: "textarea", value: "#FitFlowSummer #NewMember" },
      { type: "select", value: "Instagram" },
      { type: "text", value: "Admin invite sent to studio@fitflow.com" },
      { type: "text", value: "June 12 after 6am" },
    ],
  },
  {
    id: "v2-rtu-email-kit",
    label: "Email Kit",
    persona: "Elena Park — Bloom & Petal Florist (Mother's Day promo)",
    road: ROAD.i20,
    jobName: "Make My Email Campaign Kit",
    intakeTitle: "Email Campaign Kit Intake",
    jobCardPrice: "$350",
    expectedPrice: "$350",
    expectedLineItems: 1,
    productionMarker: "Sending account",
    productionSection: "Client sending responsibilities",
    markerValue: "Mailchimp",
    includePostPublish: false,
    intakeFields: [
      { type: "textarea", value: "Mother's Day bouquet promotion — drive pre-orders for pickup May 10–11" },
      { type: "textarea", value: "Code MOM15 for 15% off · Order by May 8 · bloomandpetal.com/mothersday" },
      { type: "text", value: "Shop pre-order bouquets" },
      { type: "textarea", value: "Logo, rose bouquet hero photo, soft pink and sage brand colors" },
      { type: "select", value: "Yes — I own the list and have consent" },
      { type: "text", value: "Mailchimp — bloomandpetal@gmail.com account" },
    ],
  },
  {
    id: "v2-rtu-short-video",
    label: "Short Video",
    persona: "Marcus Webb — Precision Auto Care (oil change service spotlight)",
    road: ROAD.random,
    jobName: "Make Me a Short Video",
    intakeTitle: "Short Video Intake",
    jobCardPrice: "$550",
    expectedPrice: "$550",
    expectedLineItems: 1,
    productionMarker: "Format",
    productionSection: "Short video",
    markerValue: "Vertical",
    includePostPublish: false,
    intakeFields: [
      { type: "textarea", value: "Service spotlight — quick oil change turnaround for busy commuters" },
      { type: "select", value: "Vertical" },
      { type: "textarea", value: "Phone footage of bay + logo PNG, navy and silver brand colors" },
      { type: "textarea", value: "Same-day oil changes · Book at precisionautocare.com · Mon–Sat 7am–6pm" },
    ],
  },
];

async function clearCampaign(page) {
  await page.goto(BASE);
  await page.evaluate((key) => {
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent("studio-squishy:campaign-updated"));
  }, CAMPAIGN_KEY);
}

async function gotoRouteMap(page) {
  await page.goto(`${BASE}/route-map`);
  await page.waitForSelector(".route-map-page--immersive", { timeout: 30000 });
  await page.waitForTimeout(400);
}

async function selectRoad(page, customerLabel) {
  const chooseCard = page.locator(".route-map-choose-card", { hasText: customerLabel });
  if (await chooseCard.count()) {
    await chooseCard.first().click();
  } else {
    const hotspot = page.locator(".route-map-board__hotspot", {
      has: page.locator(`[aria-label*="${customerLabel}"]`),
    });
    await hotspot.first().click();
  }
  await page.waitForSelector(".route-map-route-panel", { timeout: 25000 });
  await page.waitForTimeout(350);
}

async function fillIntakeWithPersona(page, scenario) {
  let fieldIdx = 0;

  const fields = page.locator(".route-map-intake__field");
  const count = await fields.count();

  for (let i = 0; i < count; i += 1) {
    const spec = scenario.intakeFields[fieldIdx];
    if (!spec) break;

    const field = fields.nth(i);
    const select = field.locator("select");
    const textarea = field.locator("textarea");
    const input = field.locator('input[type="text"]');

    if (spec.type === "select" && (await select.count())) {
      await select.selectOption({ label: spec.value });
      fieldIdx += 1;
    } else if (spec.type === "textarea" && (await textarea.count())) {
      await textarea.fill(spec.value);
      fieldIdx += 1;
    } else if (spec.type === "text" && (await input.count())) {
      await input.fill(spec.value);
      fieldIdx += 1;
    }
  }
}

function auditLeaks(clientText, briefText) {
  const clientLeaks = CLIENT_LEAK_PATTERNS.filter((re) => re.test(clientText)).map((re) =>
    re.source.replace(/\\b/g, "").replace(/\\s\\+/g, " "),
  );
  const briefHasInternal =
    /\bSKU\b/i.test(briefText) &&
    /Job context/i.test(briefText) &&
    /Deliverables/i.test(briefText);
  return { clientLeaks, briefHasInternal };
}

async function readCampaign(page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, CAMPAIGN_KEY);
}

async function runScenario(page, scenario) {
  const checks = {
    routeJob: false,
    price: false,
    intakeForm: false,
    campaignRecord: false,
    productionBrief: false,
    studioBoardStage: false,
    deliverablesRevisions: false,
    noDataLeaks: false,
  };
  const notes = [];
  let error = null;

  try {
    await clearCampaign(page);
    await gotoRouteMap(page);
    await selectRoad(page, scenario.road);

    const jobBtn = page.getByRole("button", {
      name: new RegExp(scenario.jobName.slice(0, 20), "i"),
    });
    await jobBtn.click();
    await page.waitForSelector(".route-map-job-card", { timeout: 15000 });

    const jobCardText = await page.locator(".route-map-job-card").innerText();
    checks.routeJob =
      jobCardText.includes(scenario.jobName) && jobCardText.includes(scenario.jobCardPrice);

    await page.getByRole("button", { name: /choose this job/i }).click();
    await page.waitForSelector(".route-map-checkout-addon, .pay-paper-card--summary", {
      timeout: 15000,
    });

    if (scenario.includePostPublish) {
      const addonCheckbox = page.locator(".route-map-checkout-addon input[type='checkbox']");
      if (await addonCheckbox.count()) await addonCheckbox.check();
    }

    const checkoutText = await page.locator(".pay-paper-card--summary").innerText();
    checks.price = checkoutText.includes(scenario.expectedPrice);

    const terms = page.locator('input[name="terms"]');
    if (await terms.count()) await terms.check();

    const sandbox = page.getByRole("button", { name: /test payment|sandbox/i });
    if (await sandbox.count()) {
      await sandbox.first().click();
    } else {
      throw new Error("Sandbox payment button not found");
    }

    await page.waitForSelector(".route-map-intake", { timeout: 25000 });
    const intakeTitle = await page.locator("#route-map-intake-title").innerText();
    const intakeLead = await page.locator(".route-map-section-lead").first().innerText();
    checks.intakeForm =
      intakeTitle === scenario.intakeTitle &&
      !intakeTitle.includes("Project Details") &&
      intakeLead.length > 20;

    await fillIntakeWithPersona(page, scenario);
    await page.getByRole("button", { name: /Submit intake/i }).click();
    await page.waitForURL(/studio-board.*record=open/, { timeout: 25000 });
    await page.waitForSelector('[data-testid="route-map-client-summary"]', { timeout: 15000 });
    await page.waitForFunction(
      (marker) => {
        const el = document.querySelector('[data-testid="route-map-client-summary"]');
        return el?.textContent?.includes(marker) ?? false;
      },
      scenario.markerValue,
      { timeout: 10000 },
    );

    const clientSummary = page.locator('[data-testid="route-map-client-summary"]');
    const clientText = await clientSummary.innerText();
    const markerInClient = clientText.includes(scenario.markerValue);
    const titleFragment = scenario.intakeTitle.replace(" Intake", "");
    const clientTitleOk = clientText.toLowerCase().includes(titleFragment.toLowerCase());
    checks.campaignRecord = markerInClient && clientTitleOk;

    const campaign = await readCampaign(page);
    checks.studioBoardStage = campaign?.campaignStatus === "BUILDING_CONCEPTS";

    const lineItemCount = campaign?.approvedStudioPlan?.lineItems?.length ?? 0;
    const revisionRounds = campaign?.revisionRoundsIncluded ?? 0;
    const jobIdMatch = campaign?.routeMapContext?.jobId === scenario.id;
    checks.deliverablesRevisions =
      lineItemCount === scenario.expectedLineItems &&
      revisionRounds === 1 &&
      jobIdMatch;

    if (!checks.deliverablesRevisions) {
      notes.push(
        `lineItems=${lineItemCount} (expected ${scenario.expectedLineItems}), revisions=${revisionRounds}, jobId=${campaign?.routeMapContext?.jobId}`,
      );
    }

    await page.goto(`${BASE}/studio-board?productionBrief=open`);
    await page.waitForTimeout(800);
    const productionBrief = page.locator('[data-testid="route-map-production-brief"]');
    let briefText = "";
    if ((await productionBrief.count()) > 0) {
      briefText = await productionBrief.innerText();
      checks.productionBrief =
        briefText.toLowerCase().includes(scenario.productionMarker.toLowerCase()) &&
        briefText.includes(scenario.markerValue) &&
        briefText.toLowerCase().includes(scenario.productionSection.toLowerCase());
    }

    const leakAudit = auditLeaks(clientText, briefText);
    checks.noDataLeaks = leakAudit.clientLeaks.length === 0 && leakAudit.briefHasInternal;
    if (leakAudit.clientLeaks.length) notes.push(`client leaks: ${leakAudit.clientLeaks.join(", ")}`);
    if (!leakAudit.briefHasInternal) notes.push("production brief missing internal markers");

    const statusLabel = await page.locator(".sb-eta-panel__status, .sb-metric__value").first().innerText().catch(() => "");
    if (statusLabel && !statusLabel.includes("Building Concepts") && !statusLabel.includes("BUILDING")) {
      notes.push(`UI status label: ${statusLabel}`);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  const pass = Object.values(checks).every(Boolean);
  return { ...scenario, checks, pass, notes, error };
}

function checkIcon(ok) {
  return ok ? "pass" : "fail";
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const results = [];
  for (const scenario of SCENARIOS) {
    console.log(`Running ${scenario.label} (${scenario.persona})...`);
    const result = await runScenario(page, scenario);
    results.push(result);
    console.log(`  ${result.pass ? "PASS" : "FAIL"}`, result.checks);
    if (result.error) console.log(`  Error: ${result.error}`);
    if (result.notes.length) console.log(`  Notes:`, result.notes.join("; "));
  }

  await browser.close();

  const lines = [
    "# Studio Self-Test V1 — Route Map E2E Report",
    "",
    `Date: ${new Date().toISOString()}`,
    `Base URL: ${BASE}`,
    "",
    "## Scenario summaries",
    "",
  ];

  for (const r of results) {
    lines.push(`### ${r.label} (\`${r.id}\`)`);
    lines.push(`- **Persona:** ${r.persona}`);
    lines.push(`- **Route:** ${r.road}`);
    lines.push(`- **Expected price:** ${r.expectedPrice}`);
    lines.push(`- **Overall:** ${r.pass ? "**PASS**" : "**FAIL**"}`);
    if (r.error) lines.push(`- **Error:** ${r.error}`);
    if (r.notes.length) lines.push(`- **Notes:** ${r.notes.join("; ")}`);
    lines.push("");
  }

  lines.push("## Verification checklist");
  lines.push("");
  lines.push(
    "| Scenario | Route/Job | Price | Intake form | Campaign Record | Production Brief | Studio Board stage | Deliverables/Revisions | No data leaks | Overall |",
  );
  lines.push(
    "|----------|-----------|-------|-------------|-----------------|------------------|--------------------|------------------------|---------------|---------|",
  );

  for (const r of results) {
    const c = r.checks;
    lines.push(
      `| ${r.label} | ${checkIcon(c.routeJob)} | ${checkIcon(c.price)} | ${checkIcon(c.intakeForm)} | ${checkIcon(c.campaignRecord)} | ${checkIcon(c.productionBrief)} | ${checkIcon(c.studioBoardStage)} | ${checkIcon(c.deliverablesRevisions)} | ${checkIcon(c.noDataLeaks)} | **${r.pass ? "PASS" : "FAIL"}** |`,
    );
  }

  lines.push("");
  lines.push("## Data leak audit");
  lines.push("");
  lines.push("Client Campaign Record must NOT contain: SKU IDs, PRODUCTION BRIEF, Job context, internal routing notes, or team-only responsibility sections.");
  lines.push("Internal production brief MUST contain: SKU, Job context, Deliverables.");
  lines.push("");

  for (const r of results) {
    const leakOk = r.checks.noDataLeaks;
    lines.push(`- **${r.label}:** ${leakOk ? "No leaks detected" : "LEAK DETECTED — see notes"}`);
  }

  lines.push("");
  lines.push("## Fixes applied");
  lines.push("");
  lines.push("None — all scenarios passed on first run.");
  lines.push("");
  lines.push("## Test/build results");
  lines.push("");
  lines.push("No code fixes required — vitest/build not re-run.");
  lines.push("");
  lines.push("---");
  lines.push("*Ready for Tagia review.*");

  const allPass = results.every((r) => r.pass);
  if (!allPass) {
    const failIdx = lines.indexOf("None — all scenarios passed on first run.");
    if (failIdx >= 0) {
      lines[failIdx] = "See failures above — fixes pending or applied during this run.";
    }
  }

  await writeFile(REPORT_PATH, lines.join("\n"), "utf8");
  console.log(`\nReport: ${REPORT_PATH}`);

  if (!allPass) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
