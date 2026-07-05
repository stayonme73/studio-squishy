/**
 * Project Record polish — fixture setup + browser validation for all four states.
 *
 * Requires dev server: npm run dev
 * Run: node scripts/verify-project-record-polish.mjs
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

import {
  FIXTURE_IDS,
  setupProjectRecordPolishFixtures,
} from "./lib/project-record-polish-fixtures.mjs";

const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.resolve("test-artifacts/project-record-polish-v1");
const LOCKED_MSG =
  "Your submitted project details are locked here for reference. For any changes, use Review Room or send feedback to The Studio.";
const BAD_WORDING = /\b(NA|null|undefined|Not answered|Missing at submission|Required)\b/i;

const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "laptop-1366", width: 1366, height: 768 },
  { name: "mobile-390", width: 390, height: 844 },
];

const STATE_CASES = [
  {
    key: "empty",
    campaignId: FIXTURE_IDS.empty,
    screenshotPrefix: "empty",
    assert: (audit) => {
      if (audit.hasProjectDetails || audit.hasVision) {
        return { ok: false, detail: "Empty fixture should not show submitted Q&A sections" };
      }
      if (!audit.hasStudioPlan) {
        return { ok: false, detail: "Empty fixture should still show the approved Studio Plan" };
      }
      if (audit.locked) return { ok: false, detail: "Empty editable fixture should not show locked notice" };
      const edit = audit.actions.find((a) => a.text.includes("Edit Campaign Brief"));
      const copy = audit.actions.find((a) => a.text.includes("Copy Campaign Brief"));
      if (!edit?.primary) return { ok: false, detail: "Edit should be primary when editable" };
      if (!copy?.secondary) return { ok: false, detail: "Copy should be secondary" };
      return { ok: true, detail: "Studio Plan only, no submitted Q&A, Edit primary" };
    },
  },
  {
    key: "partial",
    campaignId: FIXTURE_IDS.partial,
    screenshotPrefix: "partial-editable",
    assert: (audit) => {
      if (audit.hasEmpty) return { ok: false, detail: "Partial fixture should not show emptyHint" };
      if (!audit.hasProjectDetails) return { ok: false, detail: "Partial fixture should show Project Details" };
      if (!audit.hasStudioPlan) return { ok: false, detail: "Partial fixture should show Studio Plan" };
      if (!audit.hasPartialArchive) {
        return { ok: false, detail: "Partial fixture should show sparse submitted answers only" };
      }
      if (audit.hasCompleteArchive) {
        return { ok: false, detail: "Partial fixture should not include complete-archive content" };
      }
      if (audit.locked) return { ok: false, detail: "Partial editable fixture should not show locked notice" };
      const edit = audit.actions.find((a) => a.text.includes("Edit Campaign Brief"));
      const copy = audit.actions.find((a) => a.text.includes("Copy Campaign Brief"));
      if (!edit?.primary) return { ok: false, detail: "Edit should be primary" };
      if (!copy?.secondary) return { ok: false, detail: "Copy should be secondary" };
      return { ok: true, detail: "Sparse Project Details + Edit primary, no locked notice" };
    },
  },
  {
    key: "complete",
    campaignId: FIXTURE_IDS.complete,
    screenshotPrefix: "complete-editable",
    assert: (audit) => {
      if (!audit.hasProjectDetails) return { ok: false, detail: "Complete fixture should show Project Details" };
      if (!audit.hasVision) return { ok: false, detail: "Complete fixture should show vision summary" };
      if (audit.hasMissingSection) {
        return { ok: false, detail: "Complete fixture should not show missing-at-submission section" };
      }
      if (audit.hasEmptyAnswers) {
        return { ok: false, detail: "Complete fixture should not include Not provided yet answers" };
      }
      if (audit.locked) return { ok: false, detail: "Complete editable fixture should not show locked notice" };
      const edit = audit.actions.find((a) => a.text.includes("Edit Campaign Brief"));
      if (!edit?.primary) return { ok: false, detail: "Edit should remain primary while editable" };
      return { ok: true, detail: "Full submitted archive, no missing section, Edit primary" };
    },
  },
  {
    key: "locked",
    campaignId: FIXTURE_IDS.locked,
    screenshotPrefix: "locked-complete",
    assert: (audit) => {
      if (audit.locked !== LOCKED_MSG) {
        return { ok: false, detail: `Locked notice mismatch: ${audit.locked ?? "missing"}` };
      }
      if (audit.actions.some((a) => a.text.includes("Edit Campaign Brief"))) {
        return { ok: false, detail: "Edit should be hidden when locked" };
      }
      const copy = audit.actions.find((a) => a.text.includes("Copy Campaign Brief"));
      if (!copy?.secondary) return { ok: false, detail: "Copy should be secondary when locked" };
      if (!audit.hasProjectDetails || !audit.hasVision) {
        return { ok: false, detail: "Locked fixture should preserve full submitted archive" };
      }
      return { ok: true, detail: "Record locked notice + full archive + Copy secondary" };
    },
  },
];

async function loginContext(context, login) {
  const res = await context.request.post(`${BASE}/api/auth/login`, {
    data: { email: login.email, password: login.password },
  });
  if (!res.ok()) throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
}

async function auditDrawer(page) {
  return page.evaluate(
    ({ badPattern, missingSectionTitle }) => {
      const panel = document.querySelector(".sb-record-drawer__panel");
      if (!panel) return { open: false };

      const body = document.querySelector(".sb-record-drawer__body");
      const text = body?.innerText ?? "";
      const header = document.querySelector(".sb-record-drawer__header");
      const headerRect = header?.getBoundingClientRect();
      const bodyRect = body?.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();

      const actions = [
        ...document.querySelectorAll(".sb-record-drawer__actions a, .sb-record-drawer__actions button"),
      ].map((el) => ({
        text: el.textContent?.trim() ?? "",
        primary: el.classList.contains("utility-btn--primary"),
        secondary: el.classList.contains("utility-btn--secondary"),
      }));

      return {
        open: true,
        badWording: new RegExp(badPattern, "i").test(text),
        locked: document.querySelector(".sb-record-drawer__locked")?.textContent?.trim() ?? null,
        actions,
        hasEmpty: Boolean(document.querySelector(".sb-record-drawer__empty")),
        hasProjectDetails: Boolean(document.querySelector(".sb-record-drawer__project-details")),
        hasVision: Boolean(document.querySelector(".sb-record-drawer .cd-vision")),
        hasStudioPlan: Boolean(document.querySelector(".sb-record-drawer__studio-plan")),
        hasDeliverables: Boolean(document.querySelector(".sb-record-drawer__deliverables")),
        hasEmptyAnswers: text.includes("Not provided yet"),
        hasMissingSection: text.includes(missingSectionTitle),
        hasPartialArchive: text.includes("Client-led Social Posts walkthrough"),
        hasCompleteArchive: text.includes("Summer bakery launch social posts"),
        overlap: header && body ? bodyRect.top < headerRect.bottom - 1 : false,
        panelOffScreen: panelRect.bottom > window.innerHeight + 2 || panelRect.top < -2,
        readingOrder: [...document.querySelectorAll(".sb-record-drawer__body > *")].map(
          (el) => el.className.split(" ").find((c) => c.startsWith("sb-record-drawer__")) ?? el.tagName,
        ),
      };
    },
    {
      badPattern: BAD_WORDING.source,
      missingSectionTitle: "Details not provided at submission",
    },
  );
}

async function openRecord(page, campaignId) {
  const openButton = page.getByRole("button", { name: /Open Project Record/i });
  if (await openButton.count()) {
    await openButton.click();
  } else {
    await page.goto(`${BASE}/studio-board?campaignId=${campaignId}&record=open`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
  }
  await page.waitForSelector(".sb-record-drawer__panel", { timeout: 15000 });
  await page.waitForTimeout(500);
}

async function closeRecord(page) {
  await page.locator(".sb-record-drawer__close").click();
  await page.waitForSelector(".sb-record-drawer__panel", { state: "detached", timeout: 10000 });
}

const results = [];
const pass = (name, detail) => {
  results.push({ name, ok: true, detail });
  console.log(`PASS  ${name}: ${detail}`);
};
const fail = (name, detail) => {
  results.push({ name, ok: false, detail });
  console.error(`FAIL  ${name}: ${detail}`);
};

async function validateCase(page, testCase) {
  await page.goto(`${BASE}/studio-board?campaignId=${testCase.campaignId}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForSelector("h2", { timeout: 20000 });
  await page.waitForTimeout(3500);

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openRecord(page, testCase.campaignId);
    const audit = await auditDrawer(page);

    await page.screenshot({
      path: path.join(OUT_DIR, `${testCase.screenshotPrefix}-${viewport.name}.png`),
      fullPage: false,
    });

    const label = `${testCase.key} @ ${viewport.name}`;
    if (!audit.open) {
      fail(label, "Drawer did not open");
    } else if (audit.badWording) {
      fail(label, `Internal wording in drawer: ${JSON.stringify(audit.readingOrder)}`);
    } else if (audit.overlap) {
      fail(label, "Header/body overlap detected");
    } else if (audit.panelOffScreen) {
      fail(label, "Drawer panel clipped off-screen");
    } else {
      const outcome = testCase.assert(audit);
      if (outcome.ok) pass(label, outcome.detail);
      else fail(label, outcome.detail);
    }

    await closeRecord(page);
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const setup = await setupProjectRecordPolishFixtures();
  console.log("Fixtures written:");
  for (const [key, id] of Object.entries(FIXTURE_IDS)) {
    console.log(`  ${key}: ${setup.boardPath(id)}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await loginContext(context, setup.login);
  const page = await context.newPage();

  try {
    for (const testCase of STATE_CASES) {
      await validateCase(page, testCase);
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  console.log(`Screenshots: ${OUT_DIR}`);
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
