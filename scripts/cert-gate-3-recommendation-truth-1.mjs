/**
 * GATE-3-RECOMMENDATION-TRUTH-CERT-1 — no fake intelligent recommendation claims.
 *
 * Env:
 *   CERT_BASE_URL  default http://localhost:3053
 *   CERT_COMMIT    tip recorded in report
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.CERT_BASE_URL || "http://localhost:3053";
const COMMIT = process.env.CERT_COMMIT || "unspecified";
const OUT = join(process.cwd(), "test-artifacts", "gate-3-recommendation-truth-1");

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "phone-390", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });

/** @type {{ check: string, status: "PASS"|"FAIL"|"BLOCKED", detail?: string }[]} */
const results = [];

function push(check, status, detail) {
  results.push({ check, status, detail });
  console.log(`${status.padEnd(14)} ${check}${detail ? ` — ${detail}` : ""}`);
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

async function bodyText(page) {
  return page.evaluate(() => document.body?.innerText || "");
}

const FAKE_INTELLIGENCE =
  /WE RECOMMEND|recommend the best path|best path for your business|intelligent recommendation|AI recommend|personalized recommendation|Confirm your recommended services|before we\s+recommend a route|Our Recommendation|recommends individual services based on what you need/i;

async function assertSurface(page, vpId, label, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(450);
  const text = await bodyText(page);
  const hit = text.match(FAKE_INTELLIGENCE);
  push(
    `${vpId}: ${label} has no fake recommendation-intelligence copy`,
    hit ? "FAIL" : "PASS",
    hit ? `matched: ${hit[0]}` : "clean",
  );
  const ox = await overflowX(page);
  push(
    `${vpId}: ${label} no horizontal overflow`,
    ox <= 1 ? "PASS" : "FAIL",
    `overflowX=${ox}`,
  );
  return text;
}

async function runViewport(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
  });
  const page = await context.newPage();
  const vpId = vp.id;

  try {
    const health = await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
    push(`${vpId}: Server health`, health && health.ok() ? "PASS" : "FAIL", BASE);

    await assertSurface(page, vpId, "Lobby", "/");
    const crText = await assertSurface(page, vpId, "Conversation Room", "/studio-conversation-room");
    push(
      `${vpId}: Conversation Room keeps route-choice honesty when present`,
      /Choose Your Route|Conversation Room|suggested starting|good place to start|pick any path/i.test(
        crText,
      )
        ? "PASS"
        : "FAIL",
      "spine language",
    );

    await assertSurface(page, vpId, "Studio Board gate", "/studio-board");
    await assertSurface(page, vpId, "Review Room", "/feedback-studio");
    const helpText = await assertSurface(page, vpId, "Help Center", "/help-center");
    push(
      `${vpId}: Help Center keeps starting-route / choose-services honesty when present`,
      /suggests a starting route|Conversation Room|You decide|You choose/i.test(helpText)
        ? "PASS"
        : "FAIL",
    );
  } finally {
    await context.close();
  }
}

async function main() {
  console.log(`GATE-3 against ${BASE}`);
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      await runViewport(browser, vp);
    }
  } finally {
    await browser.close();
  }

  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  const report = [
    `# GATE-3-RECOMMENDATION-TRUTH-CERT-1`,
    ``,
    `- Base: ${BASE}`,
    `- Commit: ${COMMIT}`,
    `- PASS: ${pass}`,
    `- FAIL: ${fail}`,
    ``,
    ...results.map((r) => `- [${r.status}] ${r.check}${r.detail ? ` — ${r.detail}` : ""}`),
    ``,
  ].join("\n");
  writeFileSync(join(OUT, "REPORT.md"), report, "utf8");
  console.log(`\nWrote ${join(OUT, "REPORT.md")} (${pass} PASS / ${fail} FAIL)`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
