/**
 * Route Map V1 — full functional E2E for all 8 launch SKUs.
 * Run: node scripts/route-map-e2e-v1.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("tmp/route-map-v1-screenshots");
const REPORT_PATH = path.resolve("tmp/route-map-v1-e2e-report.md");
const CAMPAIGN_KEY = "studio-squishy:current-campaign";

const JOBS = [
  {
    id: "rm-j001",
    name: "Help Me Figure Out What I Need",
    price: "$650",
    road: "Get My Business Started",
    selectViaRouteStart: true,
    intakeTitle: "Route Start Intake",
    forbiddenIntake: ["What is your primary business goal", "Discovery Room"],
  },
  {
    id: "rm-j002",
    name: "Set Up My Facebook, Instagram, or TikTok",
    price: "$400 / platform",
    road: "I Know What I Need",
    intakeTitle: "Social Profile Setup",
    forbiddenIntake: ["What is your primary business goal"],
  },
  {
    id: "rm-j003",
    name: "Make and Post My Social Media Promotion",
    price: "$450 / platform",
    road: "I Know What I Need",
    intakeTitle: "Social Promotion Intake",
  },
  {
    id: "rm-j004",
    name: "Make Me a Short Video and Post It",
    price: "$650 / platform",
    road: "I Know What I Need",
    intakeTitle: "Short Video Intake",
  },
  {
    id: "rm-j005",
    name: "Make Me a Page for My Sale, Event, Opening, Service, or Offer",
    price: "$650",
    road: "I Know What I Need",
    intakeTitle: "Campaign Page Intake",
  },
  {
    id: "rm-j006",
    name: "Make and Post My Voice Announcement",
    price: "$400 / platform",
    road: "I Know What I Need",
    intakeTitle: "Voice Announcement Intake",
  },
  {
    id: "rm-j007",
    name: "Update My Existing Promotion",
    price: "$250",
    road: "Update What I Already Have",
    intakeTitle: "Update Intake",
  },
  {
    id: "rm-j008",
    name: "Update My Facebook, Instagram, or TikTok",
    price: "$400",
    road: "Update What I Already Have",
    intakeTitle: "Social Profile Setup",
  },
];

function buildTimingLabel(range) {
  return `Initial delivery: ${range} after you submit your Project Details and we receive all required materials. Delays in providing materials, information, approvals, or feedback may extend the estimated completion date. Before payment, we'll confirm whether your required completion date can be met.`;
}

const TIMING = {
  "rm-j001": buildTimingLabel("within 2 business days"),
  "rm-j002": buildTimingLabel("within 3 business days"),
  "rm-j003": "First draft within 3 business days after intake is complete.",
  "rm-j004": "First draft within 5 business days after intake is complete.",
  "rm-j005": buildTimingLabel("within 5 business days"),
  "rm-j006": "First draft within 3 business days after intake is complete.",
  "rm-j007": buildTimingLabel("within 2 business days"),
  "rm-j008": buildTimingLabel("within 3 business days"),
};

const LEAK_PATTERNS = [
  "sm-001",
  "vp-001",
  "lp-001",
  "ap-001",
  "7 business days",
  "first concepts within 7",
  "Spark",
  "Momentum",
  "Growth",
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
  await page.waitForSelector(".route-map-page", { timeout: 30000 });
  await page.waitForTimeout(300);
}

async function selectRoad(page, customerLabel) {
  const sidebarLink = page.locator(".route-map-sidebar__link", { hasText: customerLabel }).first();
  const laneTile = page.locator(".route-map-lane-tile", { hasText: customerLabel }).first();
  const highwayControl = page.locator(".route-map-highway__control", { hasText: customerLabel.split(" ")[0] });

  if (await sidebarLink.isVisible()) {
    await sidebarLink.click();
  } else if (await laneTile.isVisible()) {
    await laneTile.click();
  } else if (await highwayControl.count()) {
    await highwayControl.first().click();
  } else {
    throw new Error(`Could not find road selector for "${customerLabel}"`);
  }

  await page.waitForSelector(".route-map-road", { timeout: 30000 });
  await page.waitForTimeout(400);
}

async function selectJob(page, job) {
  if (job.selectViaRouteStart) {
    await page.locator(".route-map-route-start__btn").click();
  } else {
    await page.getByRole("button", { name: new RegExp(job.name.slice(0, 24), "i") }).click();
  }
  await page.waitForSelector(".route-map-job-card", { timeout: 15000 });
}

async function completeCheckout(page) {
  const terms = page.locator('input[name="terms"]');
  if (await terms.count()) await terms.check();

  const sandbox = page.getByRole("button", { name: /test payment|sandbox/i });
  if (await sandbox.count()) {
    await sandbox.first().click();
  } else {
    await page.locator('input[name="fullName"]').fill("Route Map E2E");
    await page.locator('input[name="email"]').fill("e2e@thestudio.test");
    await page.locator('input[name="cardNumber"]').fill("4242 4242 4242 4242");
    await page.locator('input[name="expDate"]').fill("12 / 30");
    await page.locator('input[name="cvv"]').fill("123");
    await page.locator('input[name="zipCode"]').fill("30303");
    await page.getByRole("button", { name: /complete payment|pay/i }).click();
  }
  await page.waitForSelector(".route-map-intake", { timeout: 25000 });
}

async function submitIntake(page) {
  const selects = page.locator(".route-map-intake__field select");
  const count = await selects.count();
  for (let i = 0; i < count; i++) {
    const select = selects.nth(i);
    const options = select.locator("option");
    const optionCount = await options.count();
    if (optionCount > 1) {
      await select.selectOption({ index: 1 });
    }
  }
  const textInputs = page.locator('.route-map-intake__field input[type="text"]');
  const textCount = await textInputs.count();
  for (let i = 0; i < textCount; i++) {
    await textInputs.nth(i).fill("E2E test value");
  }
  const textareas = page.locator(".route-map-intake__field textarea");
  const taCount = await textareas.count();
  for (let i = 0; i < taCount; i++) {
    await textareas.nth(i).fill("E2E test details for route map intake.");
  }
  await page.getByRole("button", { name: /Submit intake/i }).click();
  await page.waitForURL(/studio-board.*record=open/, { timeout: 25000 });
}

function stepResult(passed, detail) {
  return { pass: passed, detail };
}

async function runJobFlow(page, job, { mobile = false } = {}) {
  const results = {
    jobCard: stepResult(false, ""),
    checkout: stepResult(false, ""),
    intake: stepResult(false, ""),
    board: stepResult(false, ""),
    leaks: stepResult(false, ""),
    timing: stepResult(false, ""),
  };

  try {
    await clearCampaign(page);
    await gotoRouteMap(page);
    await selectRoad(page, job.road);
    await selectJob(page, job);

    const cardText = await page.locator(".route-map-job-card").innerText();
    const cardNameOk = cardText.includes(job.name);
    const cardPriceOk = cardText.includes(job.price.replace(" / platform", "").split(" ")[0]);
    const timingOk = cardText.includes(TIMING[job.id]);
    results.timing = stepResult(timingOk, timingOk ? TIMING[job.id] : `Expected: ${TIMING[job.id]}`);
    results.jobCard = stepResult(
      cardNameOk && cardPriceOk,
      `name=${cardNameOk}, price=${cardPriceOk}`,
    );

    if (!mobile) {
      await page.screenshot({
        path: path.join(OUT_DIR, `e2e-${job.id}-desktop-job-card.png`),
        fullPage: true,
      });
    }

    await page.getByRole("button", { name: /CHOOSE THIS JOB/i }).click();
    await page.waitForSelector(".route-map-checkout, .pay-shell", { timeout: 15000 });
    await page.waitForTimeout(300);

    const checkoutText = await page.locator(".route-map-page").innerText();
    const checkoutNameOk = checkoutText.includes(job.name);
    const checkoutPriceOk =
      checkoutText.includes(job.price) ||
      checkoutText.includes(job.price.split(" ")[0]);
    results.checkout = stepResult(
      checkoutNameOk && checkoutPriceOk,
      `name=${checkoutNameOk}, price=${checkoutPriceOk}`,
    );

    await completeCheckout(page);
    const intakeTitle = await page.locator("#route-map-intake-title").innerText();
    const intakeOk = intakeTitle === job.intakeTitle;
    const intakeBody = await page.locator(".route-map-intake").innerText();
    const forbidden = (job.forbiddenIntake ?? []).some((f) => intakeBody.includes(f));
    results.intake = stepResult(intakeOk && !forbidden, `title=${intakeTitle}, forbidden=${forbidden}`);

    if (!mobile && job.id === "rm-j003") {
      await page.screenshot({
        path: path.join(OUT_DIR, "e2e-rm-j003-desktop-intake.png"),
        fullPage: true,
      });
    }

    await submitIntake(page);
    await page.waitForTimeout(500);
    const boardText = await page.locator("body").innerText();
    const onBoard = page.url().includes("/studio-board") && page.url().includes("record=open");
    const boardNameOk =
      boardText.includes(job.name) ||
      boardText.includes(job.name.slice(0, 28));
    results.board = stepResult(boardNameOk && onBoard, `url=${page.url()}, name=${boardNameOk}`);

    const leakFound = LEAK_PATTERNS.filter((p) => boardText.toLowerCase().includes(p.toLowerCase()));
    results.leaks = stepResult(leakFound.length === 0, leakFound.join(", ") || "none");

    if (!mobile && job.id === "rm-j003") {
      await page.screenshot({
        path: path.join(OUT_DIR, "e2e-rm-j003-desktop-board.png"),
        fullPage: false,
      });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    for (const key of Object.keys(results)) {
      if (!results[key].pass && !results[key].detail) {
        results[key] = stepResult(false, msg);
      }
    }
  }

  return results;
}

async function testCardReadability(page) {
  await clearCampaign(page);
  await gotoRouteMap(page);
  await selectRoad(page, "Get My Business Started");
  await selectJob(page, { name: "Set Up My Facebook, Instagram, or TikTok" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: path.join(OUT_DIR, "06-desktop-social-setup-job-card.png"),
    fullPage: true,
  });

  const styles = await page.evaluate(() => {
    const p = document.querySelector(".route-map-job-card__body > section > p");
    const li = document.querySelector(".route-map-job-card__list li");
    if (!p || !li) return null;
    const pStyle = getComputedStyle(p);
    const liStyle = getComputedStyle(li);
    return {
      pFontSize: parseFloat(pStyle.fontSize),
      pLineHeight: parseFloat(pStyle.lineHeight) / parseFloat(pStyle.fontSize),
      pColor: pStyle.color,
      liFontSize: parseFloat(liStyle.fontSize),
    };
  });

  const pass =
    styles &&
    styles.pFontSize >= 15.5 &&
    styles.liFontSize >= 15.5 &&
    styles.pLineHeight >= 1.55;
  return { pass: !!pass, styles };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const desktopPage = await desktopContext.newPage();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  console.log("Running Route Map V1 E2E…");

  const readability = await testCardReadability(desktopPage);
  const desktopResults = {};
  const mobileResults = {};

  for (const job of JOBS) {
    console.log(`  Desktop ${job.id}…`);
    desktopResults[job.id] = await runJobFlow(desktopPage, job, { mobile: false });
    console.log(`  Mobile ${job.id}…`);
    mobileResults[job.id] = await runJobFlow(mobilePage, job, { mobile: true });
  }

  // Mobile spot check screenshot
  await clearCampaign(mobilePage);
  await gotoRouteMap(mobilePage);
  await selectRoad(mobilePage, "Get My Business Started");
  await selectJob(mobilePage, { name: "Set Up My Facebook, Instagram, or TikTok" });
  await mobilePage.screenshot({
    path: path.join(OUT_DIR, "11-mobile-social-setup-job-card.png"),
    fullPage: false,
  });

  await desktopContext.close();
  await mobileContext.close();
  await browser.close();

  const steps = ["jobCard", "checkout", "intake", "board", "leaks", "timing"];
  const lines = [
    "## Route Map V1 — Final Functional Test Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "### Card readability: " + (readability.pass ? "PASS" : "FAIL"),
    readability.styles ? `- Body font-size: ${readability.styles.pFontSize}px, line-height ratio: ${readability.styles.pLineHeight?.toFixed(2)}` : "- Could not measure styles",
    "",
    "### Timing table",
    "| Job | Expected | Desktop card | Mobile card |",
    "|-----|----------|--------------|-------------|",
  ];

  for (const job of JOBS) {
    const d = desktopResults[job.id]?.timing;
    const m = mobileResults[job.id]?.timing;
    lines.push(
      `| ${job.id} | ${TIMING[job.id]} | ${d?.pass ? "PASS" : "FAIL"} | ${m?.pass ? "PASS" : "FAIL"} |`,
    );
  }

  lines.push("", "### E2E results matrix", "| Job | Step | Desktop | Mobile |", "|-----|------|---------|--------|");
  for (const job of JOBS) {
    for (const step of steps) {
      const d = desktopResults[job.id]?.[step];
      const m = mobileResults[job.id]?.[step];
      lines.push(
        `| ${job.id} | ${step} | ${d?.pass ? "PASS" : "FAIL"} | ${m?.pass ? "PASS" : "FAIL"} |`,
      );
    }
  }

  const allDesktopPass = JOBS.every((j) => steps.every((s) => desktopResults[j.id]?.[s]?.pass));
  const allMobilePass = JOBS.every((j) => steps.every((s) => mobileResults[j.id]?.[s]?.pass));
  const leakPass = JOBS.every(
    (j) => desktopResults[j.id]?.leaks?.pass && mobileResults[j.id]?.leaks?.pass,
  );

  lines.push(
    "",
    "### Leak audit: old Discovery/packages/prices/names — " + (leakPass ? "PASS" : "FAIL"),
    "- Patterns checked: " + LEAK_PATTERNS.join(", "),
    "",
    "### Screenshots",
    "- `tmp/route-map-v1-screenshots/06-desktop-social-setup-job-card.png` — desktop card readability",
    "- `tmp/route-map-v1-screenshots/11-mobile-social-setup-job-card.png` — mobile card spot check",
    "- `tmp/route-map-v1-screenshots/e2e-rm-j003-desktop-intake.png` — representative intake",
    "- `tmp/route-map-v1-screenshots/e2e-rm-j003-desktop-board.png` — representative Studio Board",
    "- Per-job desktop cards: `e2e-rm-j00*-desktop-job-card.png`",
    "",
    "### Blockers (if any)",
    allDesktopPass && allMobilePass && readability.pass && leakPass
      ? "None — all automated checks passed."
      : "See matrix above for failing steps.",
    "",
    "### Ready for commit: " +
      (allDesktopPass && allMobilePass && readability.pass && leakPass ? "YES" : "NO"),
  );

  await writeFile(REPORT_PATH, lines.join("\n"), "utf8");
  console.log(`Report → ${REPORT_PATH}`);
  console.log(readability.pass && allDesktopPass && allMobilePass ? "ALL PASS" : "SOME FAILURES");
  if (!(readability.pass && allDesktopPass && allMobilePass)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
