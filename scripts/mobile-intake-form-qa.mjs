/**
 * Builder QA — phone Project Intake layout after Samsung visual review.
 * Does not fill Intake. Does not open Account.
 *
 * Usage: node scripts/mobile-intake-form-qa.mjs
 * Requires HTTPS Studio on localhost:3000.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE = "https://localhost:3000";
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/lounge-glass-proofs",
);

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

function paidMayaSeed() {
  const now = new Date().toISOString();
  const opening = {
    preferredName: "Maya",
    projectNeed: "Social media graphics",
    businessName: "Maya’s Mobile Boutique",
    requestedDeadline: "Within 2 weeks",
    deadlineStatus: "unconfirmed",
    existingMaterialsNote: "Nothing yet",
    confirmedAt: now,
  };
  return {
    draft: {
      version: 1,
      status: "working_draft",
      editable: true,
      updatedAt: now,
      revision: 6,
      cursor: {
        conversationLocation: "conversation-room-stage:intake",
        flowStep: "intake",
        journeyPhase: "conversation",
      },
      attribution: [],
      slices: {
        discoveryAnswers: opening,
        currentConversationLocation: "conversation-room-stage:intake",
        routeRecommendation: {
          roadId: "i20",
          projectNeed: opening.projectNeed,
          recommendedAt: now,
        },
        customerSelectedRoute: { roadId: "i20", selectedAt: now },
        selectedServices: [
          { jobId: "v2-rtu-flyer", roadId: "i20", addedAt: now },
        ],
      },
    },
    guide: {
      schemaVersion: 1,
      ...opening,
      source: "lobby-guide-conversation",
    },
    campaign: {
      campaignId: `intake-form-qa-${Date.now()}`,
      campaignName: "Maya’s Mobile Boutique",
      campaignStatus: "PAYMENT_RECEIVED",
      updatedAt: now,
      paymentReceivedAt: now,
      approvedStudioPlan: {
        selectedServiceIds: ["v2-rtu-flyer"],
        packageId: "custom-studio-plan",
        includedServiceIds: ["v2-rtu-flyer"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 6900,
        monthlyTotalCents: 0,
        amountDueTodayCents: 6900,
        lineItems: [
          {
            skuId: "v2-rtu-flyer",
            serviceId: "v2-rtu-flyer",
            serviceName: "Make Me a Flyer",
            billingType: "one_time",
            exactPriceCents: 6900,
            priceDisplay: "$69",
          },
        ],
        approvedAt: now,
      },
      routeMapContext: {
        roadId: "i20",
        jobId: "v2-rtu-flyer",
        selectedServiceIds: ["v2-rtu-flyer"],
        currentStep: "intake",
      },
    },
  };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const report = { ok: false, checks: {}, proofs: [], pageErrors: [] };
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  page.on("pageerror", (error) =>
    report.pageErrors.push(String(error).slice(0, 400)),
  );

  try {
    const seed = paidMayaSeed();
    await page.addInitScript(({ draft, guide, campaign }) => {
      localStorage.setItem(
        "studio-squishy:working-draft:v1",
        JSON.stringify(draft),
      );
      localStorage.setItem(
        "studio-guide:capture-draft:v1",
        JSON.stringify(guide),
      );
      localStorage.setItem(
        "studio-squishy:current-campaign",
        JSON.stringify(campaign),
      );
      sessionStorage.setItem("studio-voice:narration-preference:v1", "off");
    }, seed);
    await page.goto(
      `${BASE}/studio-conversation-room?stage=intake&studioPaymentSandbox=1`,
      { waitUntil: "load", timeout: 60000 },
    );
    await page.waitForSelector(
      '[data-panel="intake"][data-surface="page"]',
      { timeout: 25000 },
    );
    await page.waitForSelector(".route-map-social-intake__card", {
      timeout: 15000,
    });
    await page.waitForTimeout(600);

    const layout = await page.evaluate(() => {
      const pageSurface = document.querySelector(
        '[data-panel="intake"][data-surface="page"]',
      );
      const text = pageSurface?.innerText || "";
      const cards = Array.from(
        document.querySelectorAll(
          '[data-panel="intake"][data-surface="page"] .route-map-social-intake__card',
        ),
      );
      const cardGeometry = cards.map((card) => {
        const h3 = card.querySelector("h3");
        const control = card.querySelector(
          ".route-map-social-intake__compact-field, .route-map-social-intake__chips",
        );
        const cr = card.getBoundingClientRect();
        const hr = h3?.getBoundingClientRect();
        const fr = control?.getBoundingClientRect();
        return {
          label: (h3?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 90),
          cardWidth: Math.round(cr.width),
          h3Width: hr ? Math.round(hr.width) : 0,
          h3WidthRatio: hr && cr.width ? hr.width / cr.width : 0,
          controlWidthRatio: fr && cr.width ? fr.width / cr.width : 0,
          controlBelowQuestion: Boolean(
            hr && fr && fr.top >= hr.bottom - 6,
          ),
          squeezed: Boolean(hr && cr.width && hr.width < cr.width * 0.55),
        };
      });
      const draft = document.querySelector('[data-intake-action="draft"]');
      const cont = document.querySelector('[data-intake-action="continue"]');
      const chips = Array.from(
        document.querySelectorAll(
          '[data-panel="intake"][data-surface="page"] .route-map-social-intake__chip',
        ),
      ).slice(0, 3);
      return {
        cardCount: cards.length,
        cardGeometry,
        hasSectionsCopy: /sections ready to submit/i.test(text),
        hasQuestionsCopy: /questions answered/i.test(text),
        hasSectionInNextStep: /required section/i.test(text),
        hasContinueHint: /Complete the required questions to continue/i.test(
          text,
        ),
        hasCompleteRequiredTwice: /complete every required/i.test(text),
        draftDisabled: draft ? draft.disabled : null,
        continueDisabled: cont ? cont.disabled : null,
        chipLabels: chips.map((el) => el.textContent?.trim()),
        chipUnselectedLooksTappable: chips.map((el) => {
          const style = getComputedStyle(el);
          return {
            cursor: style.cursor,
            opacity: style.opacity,
            background: style.backgroundColor,
            color: style.color,
          };
        }),
      };
    });

    report.checks.onePageSurface = true;
    report.checks.sixQuestions = layout.cardCount === 6;
    report.checks.noSectionsCopy = layout.hasSectionsCopy === false;
    report.checks.questionsAnsweredCopy = layout.hasQuestionsCopy === true;
    report.checks.noSectionInNextStep = layout.hasSectionInNextStep !== true;
    report.checks.continueHint = layout.hasContinueHint === false;
    report.checks.noCompleteRequiredTwice = layout.hasCompleteRequiredTwice === false;
    report.checks.saveDraftEnabled = layout.draftDisabled === false;
    report.checks.saveContinueGuarded = layout.continueDisabled === true;
    report.checks.noSqueezedQuestions = layout.cardGeometry.every(
      (card) => card.squeezed === false && card.h3WidthRatio >= 0.7,
    );
    report.checks.controlsStackUnderQuestions = layout.cardGeometry.every(
      (card) =>
        card.controlBelowQuestion && card.controlWidthRatio >= 0.85,
    );
    report.layout = layout;

    report.proofs.push(await shot(page, "intake-form-01-top.png"));

    const cards = page.locator(
      '[data-panel="intake"][data-surface="page"] .route-map-social-intake__card',
    );
    await cards.nth(0).scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "intake-form-02-q1.png"));
    await cards.nth(1).scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "intake-form-03-q2-q3.png"));
    await cards.nth(3).scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "intake-form-04-q4-q6.png"));
    await page
      .locator('[data-intake-action="continue"]')
      .scrollIntoViewIfNeeded();
    report.proofs.push(await shot(page, "intake-form-05-actions.png"));

    await cards.nth(0).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "I will provide this later" }).click();
    await page.waitForTimeout(200);
    report.proofs.push(await shot(page, "intake-form-06-q1-selected.png"));

    await cards.nth(3).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Print", exact: true }).click();
    await page.waitForTimeout(200);
    report.proofs.push(await shot(page, "intake-form-07-q4-selected.png"));

    const selected = await page.evaluate(() => {
      const chips = Array.from(
        document.querySelectorAll(
          '[data-panel="intake"][data-surface="page"] .route-map-social-intake__chip--selected',
        ),
      );
      return chips.map((el) => {
        const style = getComputedStyle(el);
        return {
          label: el.textContent?.trim(),
          background: style.backgroundColor,
          color: style.color,
          border: style.borderColor,
        };
      });
    });
    report.selected = selected;
    const isYellow = (value) =>
      /247,\s*201,\s*0/.test(value) || /#f7c900/i.test(value);
    report.checks.q1SelectedYellow = Boolean(
      selected.find(
        (chip) =>
          /provide this later/i.test(chip.label || "") &&
          isYellow(chip.background),
      ),
    );
    report.checks.q4SelectedYellow = Boolean(
      selected.find(
        (chip) => chip.label === "Print" && isYellow(chip.background),
      ),
    );

    const failed = Object.entries(report.checks).filter(([, value]) => !value);
    report.ok = failed.length === 0 && report.pageErrors.length === 0;
    report.failed = failed.map(([key]) => key);
  } catch (error) {
    report.ok = false;
    report.error = String(error);
  } finally {
    await writeFile(
      path.join(OUT, "intake-form-report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    await browser.close();
  }

  if (!report.ok) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
