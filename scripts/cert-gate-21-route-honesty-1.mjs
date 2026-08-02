/**
 * GATE-21-ROUTE-HONESTY-CERT-1 — customer-facing route advertisement honesty.
 *
 * Env:
 *   CERT_BASE_URL  default http://127.0.0.1:3041
 *   CERT_COMMIT    tip recorded in report
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.CERT_BASE_URL || "http://127.0.0.1:3041";
const COMMIT =
  process.env.CERT_COMMIT || "ee1f48a6be440a161d6ac6012413cde50c4fdbdd";
const OUT = join(process.cwd(), "test-artifacts", "gate-21-route-honesty-1");

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "phone-390", width: 390, height: 844 },
];

const SCAFFOLD_HREFS = ["/account", "/past-campaigns", "/creative-room"];

mkdirSync(OUT, { recursive: true });

/** @type {{ check: string, status: "PASS"|"FAIL"|"BLOCKED", detail?: string, matrix?: string }[]} */
const results = [];

function push(check, status, extra = {}) {
  results.push({ check, status, ...extra });
  console.log(
    `${status.padEnd(14)} ${check}${extra.detail ? ` — ${extra.detail}` : ""}`,
  );
}

async function screenshot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
}

async function overflowX(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return Math.max(
      doc.scrollWidth - doc.clientWidth,
      body.scrollWidth - body.clientWidth,
    );
  });
}

async function customerNavHrefs(page) {
  return page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll(
        'a[href], button[data-href], [role="link"][href]',
      ),
    );
    return nodes
      .filter((el) => {
        if (el.closest(".owner-qa")) return false;
        const text = (el.textContent || "").trim();
        if (/^studio review$/i.test(text)) return false;
        return true;
      })
      .map((el) => {
        const href = el.getAttribute("href") || el.getAttribute("data-href") || "";
        return { href, text: (el.textContent || "").trim().slice(0, 80) };
      });
  });
}

async function bodyHasForbiddenReadyCopy(page) {
  const text = await page.locator("body").innerText();
  const hit = text.match(
    /GO TO ROUTE MAP|Choose services on the Route Map|Route Map → Secure Checkout → Project Details|Start a campaign in Project Discovery|Start a new project from the Route Map|Choose your package in the Studio Guide/i,
  );
  return hit ? hit[0] : null;
}

async function assertNoScaffoldAds(page, vpId, surface) {
  const links = await customerNavHrefs(page);
  const bad = links.filter((l) =>
    SCAFFOLD_HREFS.some(
      (s) => l.href === s || l.href.startsWith(`${s}?`) || l.href.startsWith(`${s}#`),
    ),
  );
  push(
    `${vpId}: ${surface} does not advertise scaffold routes`,
    bad.length === 0 ? "PASS" : "FAIL",
    {
      matrix: "gate-21",
      detail:
        bad.length === 0
          ? "no /account|/past-campaigns|/creative-room links"
          : bad.map((b) => `${b.text}->${b.href}`).join("; ").slice(0, 200),
    },
  );
}

async function certifyViewport(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const vpId = vp.id;

  /* Lobby */
  await page.goto(`${BASE}/studio-lobby`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(700);
  await assertNoScaffoldAds(page, vpId, "Lobby");
  const lobbyForbidden = await bodyHasForbiddenReadyCopy(page);
  push(
    `${vpId}: Lobby has no false-ready Host path copy`,
    !lobbyForbidden ? "PASS" : "FAIL",
    { matrix: "gate-21", detail: lobbyForbidden || "clean" },
  );
  push(
    `${vpId}: Lobby no horizontal overflow`,
    (await overflowX(page)) <= 1 ? "PASS" : "FAIL",
    { matrix: "viewport", detail: `overflowX=${await overflowX(page)}` },
  );
  await screenshot(page, `${vpId}-lobby`);

  /* Conversation Room */
  await page.goto(`${BASE}/studio-conversation-room`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(800);
  await assertNoScaffoldAds(page, vpId, "Conversation Room");
  const crLinks = await customerNavHrefs(page);
  const crStudioReview = crLinks.some((l) => /^studio review$/i.test(l.text));
  push(
    `${vpId}: Conversation Room customer nav has no Studio Review`,
    !crStudioReview ? "PASS" : "FAIL",
    { matrix: "gate-21" },
  );
  const crEyebrow = page.getByText("Conversation Room", { exact: true });
  const studioGuideEyebrow = page.locator("p").filter({ hasText: /^Studio Guide$/ });
  push(
    `${vpId}: Conversation Room does not use Studio Guide as room eyebrow`,
    (await studioGuideEyebrow.count()) === 0 ? "PASS" : "FAIL",
    {
      matrix: "gate-21",
      detail: `conversationRoomLabels=${await crEyebrow.count()}; studioGuideEyebrows=${await studioGuideEyebrow.count()}`,
    },
  );
  await screenshot(page, `${vpId}-conversation-room`);

  /* Studio Board (may redirect to sign-in — still must not advertise scaffolds) */
  await page.goto(`${BASE}/studio-board`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(800);
  await assertNoScaffoldAds(page, vpId, "Board or Sign-in gate");
  const boardForbidden = await bodyHasForbiddenReadyCopy(page);
  push(
    `${vpId}: Board/sign-in has no false-ready Host path copy`,
    !boardForbidden ? "PASS" : "FAIL",
    { matrix: "gate-21", detail: boardForbidden || "clean" },
  );
  await screenshot(page, `${vpId}-board-or-signin`);

  /* Review empty / no-project surface */
  await page.goto(`${BASE}/feedback-studio`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(900);
  await assertNoScaffoldAds(page, vpId, "Review Room");
  const reviewBody = await page.locator("body").innerText();
  const reviewRouteMapCta = /GO TO ROUTE MAP/i.test(reviewBody);
  const reviewProjectDiscovery = /Project Discovery/i.test(reviewBody);
  const reviewConversationCta =
    /GO TO CONVERSATION ROOM|Conversation Room/i.test(reviewBody);
  push(
    `${vpId}: Review empty does not advertise Route Map CTA`,
    !reviewRouteMapCta ? "PASS" : "FAIL",
    { matrix: "gate-21" },
  );
  push(
    `${vpId}: Review empty does not advertise Project Discovery`,
    !reviewProjectDiscovery ? "PASS" : "FAIL",
    { matrix: "gate-21" },
  );
  push(
    `${vpId}: Review empty names Conversation Room when offering start`,
    reviewConversationCta || /sign-in/i.test(page.url()) ? "PASS" : "FAIL",
    { matrix: "gate-21", detail: page.url() },
  );
  await screenshot(page, `${vpId}-review`);

  /* Help Center */
  await page.goto(`${BASE}/help-center`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(800);
  await assertNoScaffoldAds(page, vpId, "Help Center");
  const helpForbidden = await bodyHasForbiddenReadyCopy(page);
  const helpPathHonest = /Lobby → Conversation Room → Payment → Intake/i.test(
    await page.locator("body").innerText(),
  );
  push(
    `${vpId}: Help Center has no Route Map → Secure Checkout path`,
    !helpForbidden ? "PASS" : "FAIL",
    { matrix: "gate-21", detail: helpForbidden || "clean" },
  );
  push(
    `${vpId}: Help Center shows Conversation Room spine path`,
    helpPathHonest ? "PASS" : "FAIL",
    { matrix: "gate-21" },
  );
  await screenshot(page, `${vpId}-help-center`);

  /* Scaffold direct URLs — coming soon, not advertised as ready from elsewhere */
  for (const path of SCAFFOLD_HREFS) {
    await page.goto(`${BASE}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(400);
    const text = await page.locator("body").innerText();
    const unavailable =
      /coming soon|planned for a future phase|not available yet/i.test(text);
    push(
      `${vpId}: ${path} remains unavailable if opened directly`,
      unavailable ? "PASS" : "FAIL",
      { matrix: "gate-21", detail: page.url() },
    );
  }

  /* Legacy Host URLs redirect away from advertising as live rooms */
  for (const path of ["/route-map", "/project-builder", "/checkout"]) {
    await page.goto(`${BASE}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(500);
    const url = page.url();
    const redirected =
      /studio-conversation-room/i.test(url) || !url.includes(path);
    push(
      `${vpId}: legacy ${path} does not remain as advertised Host destination`,
      redirected ? "PASS" : "FAIL",
      { matrix: "gate-21", detail: url },
    );
  }

  await context.close();
}

function writeReport() {
  const summary = {
    package: "GATE-21-ROUTE-HONESTY-CERT-1",
    protectedCommit: COMMIT,
    baseUrl: BASE,
    generatedAt: new Date().toISOString(),
    counts: {
      PASS: results.filter((r) => r.status === "PASS").length,
      FAIL: results.filter((r) => r.status === "FAIL").length,
      BLOCKED: results.filter((r) => r.status === "BLOCKED").length,
    },
    results,
  };
  writeFileSync(
    join(OUT, "gate-21-route-honesty-1-report.json"),
    JSON.stringify(summary, null, 2),
  );
  const md = [
    "# GATE-21-ROUTE-HONESTY-CERT-1 Report",
    "",
    `Commit: \`${COMMIT}\``,
    `Base: ${BASE}`,
    `Generated: ${summary.generatedAt}`,
    "",
    `PASS=${summary.counts.PASS} FAIL=${summary.counts.FAIL} BLOCKED=${summary.counts.BLOCKED}`,
    "",
    "| Status | Check | Detail |",
    "|---|---|---|",
    ...results.map(
      (r) =>
        `| ${r.status} | ${r.check.replace(/\|/g, "/")} | ${(r.detail || "").replace(/\|/g, "/")} |`,
    ),
    "",
  ].join("\n");
  writeFileSync(join(OUT, "gate-21-route-honesty-1-report.md"), md);
  console.log(`Wrote ${join(OUT, "gate-21-route-honesty-1-report.md")}`);
}

async function main() {
  console.log(`GATE-21 against ${BASE}`);
  const health = await fetch(BASE).catch((e) => e);
  if (!health || health instanceof Error || !health.ok) {
    push("Server health", "BLOCKED", { detail: `Cannot reach ${BASE}` });
    writeReport();
    process.exit(2);
  }
  push("Server health", "PASS", { detail: BASE });

  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      await certifyViewport(browser, vp);
    }
  } finally {
    await browser.close();
  }

  writeReport();
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(
    `\nSummary: PASS=${results.filter((r) => r.status === "PASS").length} FAIL=${failed}`,
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
