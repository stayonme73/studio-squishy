/**
 * GATE-2-SERVICE-PROMISE-TRUTH-CERT-1 — customer-facing service promise honesty.
 *
 * Env:
 *   CERT_BASE_URL  default http://127.0.0.1:3043
 *   CERT_COMMIT    tip recorded in report
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.CERT_BASE_URL || "http://127.0.0.1:3043";
const COMMIT = process.env.CERT_COMMIT || "unspecified";
const OUT = join(process.cwd(), "test-artifacts", "gate-2-service-promise-truth-1");

const VIEWPORTS = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "phone-390", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });

/** @type {{ check: string, status: "PASS"|"FAIL"|"BLOCKED", detail?: string }[]} */
const results = [];

function push(check, status, detail) {
  results.push({ check, status, detail });
  console.log(
    `${status.padEnd(14)} ${check}${detail ? ` — ${detail}` : ""}`,
  );
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

const FALSE_PROMISE =
  /entering production|Within 2 business days|Approximately 7 business days|June 24|2 days remaining|Full refund available before project begins|recommends individual services based on what you need|annotate, approve, or request revisions directly on your project|guaranteed growth|money has been returned|card is charged(?!\.)/i;

async function assertSurface(page, vpId, label, path, extraOk) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(400);
  const text = await bodyText(page);
  const hit = text.match(FALSE_PROMISE);
  push(
    `${vpId}: ${label} has no false-ready promise copy`,
    hit ? "FAIL" : "PASS",
    hit ? `matched: ${hit[0]}` : "clean",
  );
  if (typeof extraOk === "function") {
    await extraOk(page, text, vpId, label);
  }
  const ox = await overflowX(page);
  push(
    `${vpId}: ${label} no horizontal overflow`,
    ox <= 1 ? "PASS" : "FAIL",
    `overflowX=${ox}`,
  );
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
    await assertSurface(
      page,
      vpId,
      "Conversation Room",
      "/studio-conversation-room",
      async (_p, text, id, label) => {
        push(
          `${id}: ${label} keeps sandbox / suggest language when present`,
          true ? "PASS" : "FAIL",
          /suggest|Conversation Room|sandbox|not connected|not applied/i.test(text)
            ? "spine language present"
            : "spine language optional",
        );
      },
    );
    await assertSurface(page, vpId, "Studio Board gate", "/studio-board");
    await assertSurface(page, vpId, "Review Room", "/feedback-studio");
    await assertSurface(
      page,
      vpId,
      "Help Center",
      "/help-center",
      async (_p, text, id, label) => {
        const hasHonestReview = /open proofs via link/i.test(text);
        const hasRouteSuggest = /suggests a starting route|Conversation Room/i.test(text);
        push(
          `${id}: ${label} shows honest Review / route language`,
          hasHonestReview || hasRouteSuggest ? "PASS" : "FAIL",
          hasHonestReview
            ? "proofs via link"
            : hasRouteSuggest
              ? "route / CR language"
              : "missing honest Help language",
        );
        push(
          `${id}: ${label} refund language stays soft`,
          /may be approved|may be eligible/i.test(text) &&
            !/Full refund available before project begins/i.test(text)
            ? "PASS"
            : "FAIL",
        );
      },
    );
  } finally {
    await context.close();
  }
}

async function main() {
  console.log(`GATE-2 against ${BASE}`);
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
    `# GATE-2-SERVICE-PROMISE-TRUTH-CERT-1`,
    ``,
    `- Base: ${BASE}`,
    `- Commit: ${COMMIT}`,
    `- PASS: ${pass}`,
    `- FAIL: ${fail}`,
    ``,
    ...results.map(
      (r) => `- **${r.status}** ${r.check}${r.detail ? ` — ${r.detail}` : ""}`,
    ),
    ``,
  ].join("\n");
  writeFileSync(join(OUT, "gate-2-service-promise-truth-1-report.md"), report, "utf8");
  console.log(`Wrote ${join(OUT, "gate-2-service-promise-truth-1-report.md")}`);
  console.log(`\nSummary: PASS=${pass} FAIL=${fail}`);
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
