/**
 * CUSTOMER-JOURNEY-E2E-QUALITY — read-only API + page probe (Proof Co fixture).
 * No payment fabrication, no PATCH to production state, no seed mutations.
 *
 * Usage: STUDIO_BASE_URL=http://127.0.0.1:3475 node scripts/customer-journey-e2e-quality-probe.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/** Ignore STUDIO_BASE_URL when it points at production `next start` (no dev auth). */
function resolveBaseUrl() {
  const fromEnv = process.env.STUDIO_BASE_URL;
  if (fromEnv && /:3476\b/.test(fromEnv)) {
    return "http://127.0.0.1:3475";
  }
  return fromEnv ?? "http://127.0.0.1:3475";
}

const BASE = resolveBaseUrl();
const OUT = path.resolve(
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/customer-journey-e2e-quality-proofs",
);

const EXPECT = {
  packageId: "social_and_promo_graphics",
  listPriceCents: 19900,
  amountDueCents: 15920,
  campaignIdPrefix: "thank-you-social_and_promo_graphics",
};

/** @type {{ id: string, status: "PASS"|"FAIL"|"BLOCKED", detail: string, evidence?: string }[]} */
const steps = [];

function record(id, status, detail, evidence) {
  steps.push({ id, status, detail, evidence });
  console.log(`${status.padEnd(7)} ${id} — ${detail}`);
}

async function authCustomerOneCookie() {
  const res = await fetch(`${BASE}/api/auth/local-customer-one`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`local-customer-one auth failed: ${res.status}`);
  }
  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/studio_session=([^;]+)/);
  if (!match) {
    throw new Error("local-customer-one auth missing studio_session cookie");
  }
  return match[1];
}

async function apiGet(sessionCookie, urlPath) {
  const res = await fetch(`${BASE}${urlPath}`, {
    headers: { Cookie: `studio_session=${sessionCookie}` },
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const sessionCookie = await authCustomerOneCookie();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "studio_session",
      value: sessionCookie,
      url: BASE,
    },
  ]);

  // 1 — Prices / checkout truth on current fixture
  const current = await apiGet(sessionCookie, "/api/campaigns/current");
  const campaign = current.json?.campaign ?? current.json?.record ?? current.json;
  const condensed = campaign?.condensedOffer ?? campaign?.record?.condensedOffer;
  const approved = campaign?.approvedStudioPlan ?? campaign?.record?.approvedStudioPlan;
  const paymentTruth = campaign?.paymentTruth ?? campaign?.record?.paymentTruth;
  const campaignId = campaign?.campaignId ?? current.json?.campaignId;

  const priceOk =
    current.status === 200 &&
    condensed?.priceCents === EXPECT.listPriceCents &&
    condensed?.amountDueCents === EXPECT.amountDueCents &&
    approved?.amountDueTodayCents === EXPECT.amountDueCents;
  record(
    "1-prices-checkout",
    priceOk ? "PASS" : current.status !== 200 ? "BLOCKED" : "FAIL",
    priceOk
      ? `Social & Promo Graphics $199 → due $${(EXPECT.amountDueCents / 100).toFixed(2)} on fixture ${campaignId}`
      : current.status !== 200
        ? `GET /api/campaigns/current → HTTP ${current.status}`
        : `Mismatch: condensed=${JSON.stringify(condensed?.priceCents)}/${condensed?.amountDueCents} approved=${approved?.amountDueTodayCents}`,
    "GET /api/campaigns/current",
  );

  // 2 — Intake answers carry-forward (fixture has saved draft; empty answers = not yet submitted)
  const intakeDraft =
    campaign?.routeMapIntakeDraft ?? campaign?.record?.routeMapIntakeDraft;
  const intakeKeys = Object.keys(intakeDraft?.answers ?? {});
  record(
    "2-intake-saved-answers",
    intakeDraft?.savedAt ? "PASS" : "FAIL",
    intakeDraft?.savedAt
      ? `Intake draft savedAt=${intakeDraft.savedAt}; ${intakeKeys.length} answer field(s) on disk (re-ask behavior needs browser submit — not exercised here)`
      : "No routeMapIntakeDraft on current campaign",
    "campaign.routeMapIntakeDraft",
  );

  // 3 — Payment boundary (read-only: confirmed truth present; unpaid bypass not attempted)
  const paid =
    paymentTruth?.status === "confirmed" &&
    paymentTruth?.confirmedAmountCents === EXPECT.amountDueCents;
  record(
    "3-payment-boundary",
    paid ? "PASS" : "BLOCKED",
    paid
      ? "Fixture has processor-confirmed paymentTruth; bypass test delegated to vitest payment-truth + sandbox-confirm scripts"
      : `paymentTruth=${JSON.stringify(paymentTruth?.status)}`,
    "paymentTruth + vitest payment-truth.test.ts",
  );

  // 4 — Materials attach to correct project
  const mats = await apiGet(
    sessionCookie,
    `/api/campaigns/${encodeURIComponent(campaignId)}/materials`,
  );
  const blockingRequired =
    mats.json?.blockingRequiredCount ??
    campaign?.materialsSummary?.blockingRequiredCount ??
    campaign?.postPayActivation?.blockingRequiredMaterialsCount;
  record(
    "4-materials-project-scope",
    mats.status === 200 ? "PASS" : mats.status === 404 ? "BLOCKED" : "FAIL",
    mats.status === 200
      ? `Materials scoped to ${campaignId}; blockingRequiredCount=${blockingRequired}; clientIntakeCount=${mats.json?.clientIntakeCount ?? "?"}`
      : `GET materials → HTTP ${mats.status}`,
    `GET /api/campaigns/.../materials + materials-upload-e2e-proofs/ (Oct-24)`,
  );

  // 5 — Status agreement Board / Record / project-status / delivery
  const projectStatus = await apiGet(
    sessionCookie,
    `/api/campaigns/${encodeURIComponent(campaignId)}/project-status`,
  );
  const delivery = await apiGet(
    sessionCookie,
    `/api/campaigns/${encodeURIComponent(campaignId)}/delivery`,
  );
  const postPay = campaign?.postPayActivation ?? campaign?.record?.postPayActivation;
  const activationPhase = postPay?.phase ?? "unknown";
  const jobList = projectStatus.json?.jobs ?? [];
  const spineStatuses = jobList.map((j) => j.spineStatus ?? j.customerStatus ?? j.status).filter(Boolean);
  const deliveryState = delivery.json?.delivery?.state;
  const statusAligned =
    projectStatus.status === 200 &&
    delivery.status === 200 &&
    activationPhase === "awaiting_intake" &&
    deliveryState === "preparing";
  record(
    "5-status-cross-surface",
    statusAligned ? "PASS" : projectStatus.status !== 200 ? "BLOCKED" : "FAIL",
    statusAligned
      ? `postPay.phase=${activationPhase}; delivery.state=${deliveryState}; jobs=${jobList.length}; spine=[${spineStatuses.slice(0, 2).join(", ")}]`
      : `project-status=${projectStatus.status} delivery=${delivery.status} phase=${activationPhase} delivery.state=${deliveryState}`,
    "GET project-status + delivery + campaign record",
  );

  // 6 — Review / revisions (Proof Co not in ready_for_review)
  const primaryJobId =
    postPay?.jobIds?.[0] ??
    `${campaignId}:${EXPECT.packageId}`;
  const review = await apiGet(
    sessionCookie,
    `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(primaryJobId)}/review`,
  );
  const reviewBlocked =
    review.status === 404 ||
    review.json?.error ||
    review.json?.review?.spineStatus !== "ready_for_review";
  record(
    "6-review-revisions",
    reviewBlocked ? "BLOCKED" : "PASS",
    reviewBlocked
      ? `Proof Co fixture not in review room (${review.status}; spine=${review.json?.review?.spineStatus ?? "n/a"}). Use seed-review-room-v1 + review-to-delivery-path for production-team path.`
      : "Review API open",
    "GET .../review",
  );

  // 7 — Release gates
  const deliverables = await apiGet(
    sessionCookie,
    `/api/campaigns/${encodeURIComponent(campaignId)}/deliverables`,
  );
  const releasedCount = deliverables.json?.released?.length ?? deliverables.json?.files?.length ?? 0;
  record(
    "7-release-gates",
    releasedCount === 0 ? "PASS" : "FAIL",
    releasedCount === 0
      ? "No released deliverables on Proof Co (expected before intake/production complete)"
      : `Unexpected released files: ${releasedCount}`,
    "GET .../deliverables",
  );

  // 8 — Download authorization (Maya historical — read-only HEAD)
  record(
    "8-released-downloads",
    "BLOCKED",
    "Proof Co has no released files; Maya flyer delivery (716a15b6…) not switched in this probe to avoid conflating fixtures. Prior Oct-24 matrix: delivery download BLOCKED on Proof Co.",
    "Not exercised on Proof Co",
  );

  // 9 — Mobile + desktop pages render
  const routes = [
    { name: "studio-board", path: "/studio-board", vp: { width: 1280, height: 800 } },
    { name: "studio-board-mobile", path: "/studio-board", vp: { width: 390, height: 844 } },
    { name: "campaign-details", path: "/campaign-details", vp: { width: 1280, height: 800 } },
    { name: "deliverables", path: "/deliverables", vp: { width: 390, height: 844 } },
    { name: "feedback-studio", path: "/feedback-studio", vp: { width: 390, height: 844 } },
  ];
  let pagePass = true;
  for (const r of routes) {
    const page = await context.newPage();
    await page.setViewportSize(r.vp);
    const resp = await page.goto(`${BASE}${r.path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const ok = resp && resp.status() < 500;
    if (!ok) pagePass = false;
    await page.screenshot({ path: path.join(OUT, `${r.name}.png`), fullPage: false });
    await page.close();
  }
  record(
    "9-mobile-desktop-views",
    pagePass ? "PASS" : "FAIL",
    pagePass
      ? "Key signed-in routes returned <500 @ 1280 and 390 (screenshots in proofs folder)"
      : "One or more routes returned 5xx or failed navigation",
    path.join(OUT, "*.png"),
  );

  // 10 — Errors / recovery (checkout terms gate via API shape — no charge)
  const checkoutPage = await context.newPage();
  await checkoutPage.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const bodyText = await checkoutPage.locator("body").innerText();
  const hasCheckoutChrome = /review|confirm|checkout|studio plan/i.test(bodyText);
  await checkoutPage.screenshot({ path: path.join(OUT, "checkout-readonly.png") });
  await checkoutPage.close();
  record(
    "10-errors-recovery",
    hasCheckoutChrome ? "PASS" : "BLOCKED",
    hasCheckoutChrome
      ? "Paid fixture loads checkout route without server error; full unpaid error copy not re-run (vitest + pay-qa)"
      : "Checkout body did not match expected copy",
    "checkout-readonly.png",
  );

  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    fixture: "local-customer-one / Proof Co / social_and_promo_graphics",
    campaignId,
    steps,
    certification: {
      fullJourneyCertified: false,
      reason:
        "Proof Co stops at awaiting_intake; review/release/download require separate seeded production path or completed intake without manual ledger edits.",
    },
  };
  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(`\nWrote ${path.join(OUT, "report.json")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
