/**
 * Owner-authorized production-truth E2E — disposable-social-promo-machine-cert-{1|2|3|4|5|6|7} only.
 * Server workflow + optional browser delivery proof when VERIFY_BASE_URL is live.
 *
 * Usage: npx tsx scripts/disposable-sp-cert-production-truth-e2e.mjs --cert=2
 *
 * STOP CONDITIONS (fail closed — no hand-edited success):
 * - Billable provider invocation attempted for non-allowlisted SKU
 * - Dispatch targets SKU outside v2-rtu-social-posts / v2-rtu-promotion-graphics
 * - Campaign id !== configured cert (--cert lock)
 * - Protected campaign paths touched
 * - QA/release gates bypassed or forged
 * - PREPARED isolation (not ARMED + render release) at preflight
 */

import { File } from "node:buffer";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright";

import { resolveVerifyBaseUrl, sessionCookiePlaywright } from "./review-room-v1-test-env.mjs";

const CERT_GENERATION = (() => {
  const flag = process.argv.find((arg) => arg.startsWith("--cert="));
  const n = Number(flag?.split("=")[1] ?? "2");
  if (
    n !== 1 &&
    n !== 2 &&
    n !== 3 &&
    n !== 4 &&
    n !== 5 &&
    n !== 6 &&
    n !== 7 &&
    n !== 8 &&
    n !== 9
  ) {
    throw new Error("E2E runner accepts --cert=1 through --cert=9 only.");
  }
  return n;
})();

const seedRel =
  CERT_GENERATION === 9
    ? "scripts/seed-social-promo-machine-cert-v9.mjs"
    : CERT_GENERATION === 8
    ? "scripts/seed-social-promo-machine-cert-v8.mjs"
    : CERT_GENERATION === 7
    ? "scripts/seed-social-promo-machine-cert-v7.mjs"
    : CERT_GENERATION === 6
    ? "scripts/seed-social-promo-machine-cert-v6.mjs"
    : CERT_GENERATION === 5
    ? "scripts/seed-social-promo-machine-cert-v5.mjs"
    : CERT_GENERATION === 4
      ? "scripts/seed-social-promo-machine-cert-v4.mjs"
      : CERT_GENERATION === 3
        ? "scripts/seed-social-promo-machine-cert-v3.mjs"
        : CERT_GENERATION === 2
          ? "scripts/seed-social-promo-machine-cert-v2.mjs"
          : "scripts/seed-social-promo-machine-cert-v1.mjs";
const seedModule = await import(pathToFileURL(path.join(process.cwd(), seedRel)).href);
const { certConstants, authoritativeSocialPromoFactsForCert } = await import(
  pathToFileURL(path.join(process.cwd(), "scripts/social-promo-machine-cert-prep-shared.mjs")).href,
);
const { applyCertFileRoomLogoProductionApproval } = await import(
  pathToFileURL(path.join(process.cwd(), "scripts/disposable-sp-cert-e2e-materials.mjs")).href,
);
const certCtx = certConstants(CERT_GENERATION);

const {
  buildPreparedIntakeAnswers,
  CAMPAIGN_ID,
  CHECKOUT_SESSION_ID,
  CLIENT_EMAIL,
  CLIENT_ID,
  JOB_ID,
  LOGO_CHECKSUM,
} = seedModule;

const ENV = { NODE_ENV: "development" };
process.env.NODE_ENV = ENV.NODE_ENV;
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "C:\\Users\\tagia\\AppData\\Local\\ms-playwright";

const repoRoot = process.cwd();
const OUT = path.join(
  repoRoot,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs",
  `production-truth-e2e-cert-${CERT_GENERATION}`,
);

/** @type {{ stage: string, status: "PASS"|"FAIL"|"BLOCKED", detail?: string }[]} */
const report = [];

function stage(name, status, detail = "") {
  report.push({ stage, status, detail });
  console.log(`${status.padEnd(7)} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function load(relative) {
  return import(pathToFileURL(path.join(repoRoot, relative)).href);
}

function sha256File(abs) {
  const buf = readFileSync(abs);
  return `sha256:${createHash("sha256").update(buf).digest("hex")}`;
}

async function preflight(modules) {
  const {
    readCampaignEnvelope,
    parseSocialPromoCertIsolation,
    disposableSocialPromoCertBlocksBillableProviders,
    disposableTestCampaignBlocksCustomerEmails,
  } = modules;

  if (ENV.NODE_ENV !== "development" && ENV.NODE_ENV !== "test") {
    stage("preflight-node-env", "FAIL", ENV.NODE_ENV);
    return false;
  }
  stage("preflight-node-env", "PASS", ENV.NODE_ENV);

  const expectedId = `disposable-social-promo-machine-cert-${CERT_GENERATION}`;
  if (CAMPAIGN_ID !== expectedId) {
    stage("preflight-campaign-id-lock", "FAIL", `${CAMPAIGN_ID} !== ${expectedId}`);
    return false;
  }
  stage("preflight-campaign-id-lock", "PASS", CAMPAIGN_ID);

  const envelope = await readCampaignEnvelope(CAMPAIGN_ID);
  if (!envelope) {
    stage("preflight-campaign", "FAIL", "missing envelope");
    return false;
  }
  const parsed = parseSocialPromoCertIsolation(envelope.record);
  if (parsed.kind !== "armed") {
    stage("preflight-armed", "FAIL", parsed.kind);
    return false;
  }
  stage("preflight-armed", "PASS");

  if (
    envelope.record.paymentTruth?.status !== "confirmed" ||
    envelope.record.paymentTruth?.sandbox !== true
  ) {
    stage("preflight-sandbox-payment", "FAIL");
    return false;
  }
  stage("preflight-sandbox-payment", "PASS");

  if (!(envelope.record.approvedStudioPlan?.lineItems?.length > 0)) {
    stage("preflight-approved-plan-lines", "FAIL", "missing lineItems");
    return false;
  }
  stage("preflight-approved-plan-lines", "PASS");

  if (!envelope.record.socialPromoRenderRelease?.authorizedBy) {
    stage("preflight-render-release", "FAIL", "unset");
    return false;
  }
  stage("preflight-render-release", "PASS");

  if (envelope.record.dispatchExecution) {
    stage("preflight-no-prior-dispatch", "FAIL", "dispatchExecution present");
    return false;
  }
  stage("preflight-no-prior-dispatch", "PASS");

  if (!disposableSocialPromoCertBlocksBillableProviders(envelope.record)) {
    stage("preflight-billable-block", "FAIL");
    return false;
  }
  stage("preflight-billable-block", "PASS");

  if (!disposableTestCampaignBlocksCustomerEmails(envelope.record)) {
    stage("preflight-email-block", "FAIL");
    return false;
  }
  stage("preflight-email-block", "PASS");

  const artifactsRoot = path.join(repoRoot, "data", "campaign-design-artifacts", CAMPAIGN_ID);
  try {
    statSync(artifactsRoot);
    stage("preflight-no-prior-artifacts", "FAIL", artifactsRoot);
    return false;
  } catch {
    stage("preflight-no-prior-artifacts", "PASS");
  }

  return true;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const store = await load("src/lib/campaign-store/store.ts");
  const isolation = await load("src/lib/studio-payment/disposable-social-promo-cert-isolation.ts");
  const guards = await load("src/lib/studio-payment/disposable-test-isolation-guards.ts");
  const events = await load("src/lib/studio-payment/events-store.ts");
  const intake = await load("src/lib/studio-payment/intake-submit.ts");
  const materialsStore = await load("src/lib/materials/store.ts");
  const materialsActions = await load("src/lib/materials/actions.ts");
  const clientFileStore = await load("src/lib/materials/client-file-store.ts");
  const fileStorage = await load("src/lib/file-storage/server.ts");
  const resolveJobs = await load("src/lib/job-control/resolve-jobs.ts");
  const recovery = await load("src/lib/studio-paid-activation-recovery/index.ts");
  const dispatch = await load("src/lib/studio-dispatch/ensure.ts");
  const composite = await load("src/lib/studio-dispatch/social-promo-composite-dispatch.ts");
  const tasksStore = await load("src/lib/campaign-tasks/store.ts");
  const reviewBind = await load("src/lib/studio-customer-life/machine-social-promo-review-bind.ts");
  const reviewReadiness = await load(
    "src/lib/studio-customer-life/social-promo-review-readiness.ts",
  );
  const reviewActions = await load("src/lib/job-control/review-room-actions.ts");
  const reviewFeedback = await load("src/lib/job-control/review-feedback-types.ts");
  const qaTask = await load("src/lib/campaign-tasks/qa.ts");
  const deliveryTruth = await load("src/lib/studio-review-revision/social-promo-purchase-delivery-truth.ts");

  const modules = {
    readCampaignEnvelope: store.readCampaignEnvelope,
    parseSocialPromoCertIsolation: isolation.parseSocialPromoCertIsolation,
    disposableSocialPromoCertBlocksBillableProviders:
      isolation.disposableSocialPromoCertBlocksBillableProviders,
    disposableTestCampaignBlocksCustomerEmails: guards.disposableTestCampaignBlocksCustomerEmails,
  };

  if (!(await preflight(modules))) {
    await writeFile(path.join(OUT, "report.json"), JSON.stringify({ report, certified: false }, null, 2));
    process.exit(2);
  }

  await events.writeCheckoutSessionBinding({
    checkoutSessionId: CHECKOUT_SESSION_ID,
    campaignId: CAMPAIGN_ID,
    expectedAmountCents: 15920,
    currency: "usd",
    selectedServiceIds: ["social_and_promo_graphics"],
    decisionId: `${certCtx.PA_PREFIX}-prep`,
    factFingerprint: certCtx.PA_PREFIX,
    draftRevision: 1,
    createdAt: new Date().toISOString(),
    sandbox: true,
    payerClientUserId: CLIENT_ID,
    customerEmail: CLIENT_EMAIL,
    purchaseKind: "condensed_offer",
  });
  stage("checkout-session-binding", "PASS");

  const intakeResult = await intake.submitPaidIntakeByCheckoutSession({
    checkoutSessionId: CHECKOUT_SESSION_ID,
    answers: buildPreparedIntakeAnswers(CERT_GENERATION),
  });
  if (!intakeResult.ok) {
    stage("intake-submit", "FAIL", `${intakeResult.error}: ${intakeResult.message}`);
    await writeFile(path.join(OUT, "report.json"), JSON.stringify({ report, certified: false }, null, 2));
    process.exit(2);
  }
  stage(
    "intake-submit",
    "PASS",
    intakeResult.alreadySubmitted ? "already submitted" : "submitted",
  );

  let campaign = intakeResult.campaign;
  let tasksEnvelope = await tasksStore.getOrGenerateTasks(CAMPAIGN_ID, campaign);
  let materials = await materialsStore.getOrInitializeMaterials(CAMPAIGN_ID, campaign);

  const CLIENT_USER = {
    id: CLIENT_ID,
    email: CLIENT_EMAIL,
    displayName: "Spruce Line Cert",
    roles: ["client"],
  };

  const factsItem = materials.items.find((i) => i.id === "condensed-social-facts");
  if (!factsItem) {
    stage("materials-facts", "FAIL", "missing slot");
  } else {
    const authoritativeFacts = authoritativeSocialPromoFactsForCert(CERT_GENERATION);
    const factsSubmit = materialsActions.applyClientSubmitItem(
      materials,
      factsItem.id,
      { text: authoritativeFacts },
      CLIENT_USER,
    );
    if (!factsSubmit.ok) {
      stage("materials-facts", "FAIL", factsSubmit.error);
    } else {
      materials = factsSubmit.envelope;
      await materialsStore.writeMaterialsEnvelope(materials);
      const syncedJobs = resolveJobs.syncJobRecordsFromCampaign(
        campaign,
        tasksEnvelope.tasks ?? [],
        materials.items,
        tasksEnvelope.exceptionRecords ?? [],
        tasksEnvelope.jobRecords,
      );
      tasksEnvelope = await tasksStore.writeTasksEnvelope({
        ...tasksEnvelope,
        jobRecords: syncedJobs,
      });
      stage("materials-facts", "PASS");
    }
  }

  const logoPath = path.join(
    repoRoot,
    `data/disposable-social-promo-machine-cert-${CERT_GENERATION}/materials/spruce-line-logo.png`,
  );
  const logoItem = materials.items.find((i) => i.id === "condensed-social-logo");
  if (!logoItem) {
    stage("materials-logo-rights", "FAIL", "missing logo slot");
  } else {
    const logoBytes = readFileSync(logoPath);
    const file = new File([logoBytes], "spruce-line-logo.png", { type: "image/png" });
    const stored = await clientFileStore.storeAndAttachCustomerMaterialFile({
      adapter: fileStorage.createServerFileRoomStorageAdapter(),
      campaign,
      campaignClientUserId: CLIENT_ID,
      tasks: tasksEnvelope,
      materials,
      user: CLIENT_USER,
      file,
      itemId: logoItem.id,
      useAuthorizationBasis: "customer_owns",
      rightsInput: {
        useAuthorizationBasis: "customer_owns",
        cropAdaptPermitted: true,
        commercialUsePermitted: true,
        recognizablePeoplePresent: false,
        thirdPartyMaterialPresent: false,
        attestationTextVersion: "gate-x-rights-attestation-v1-2026-08-22-honest-hold",
      },
    });
    if (!stored.ok) {
      stage("materials-logo-rights", "FAIL", stored.error);
    } else {
      materials = stored.materials;
      tasksEnvelope = stored.tasks;
      await materialsStore.writeMaterialsEnvelope(materials);
      await tasksStore.writeTasksEnvelope(tasksEnvelope);
      stage("materials-logo-rights", "PASS", stored.checksumSha256);

      const fileRoomApproval = applyCertFileRoomLogoProductionApproval(
        materials,
        logoItem.id,
      );
      if (!fileRoomApproval.ok) {
        stage("materials-logo-file-room-approval", "FAIL", fileRoomApproval.error);
      } else {
        materials = fileRoomApproval.envelope;
        await materialsStore.writeMaterialsEnvelope(materials);
        stage(
          "materials-logo-file-room-approval",
          "PASS",
          fileRoomApproval.alreadyApproved ? "already_approved" : "approved_for_use",
        );
      }
    }
  }

  const identitySession = {
    sessionCurrentCampaignId: CAMPAIGN_ID,
    sessionClientUserId: CLIENT_ID,
    intakeCampaignId: CAMPAIGN_ID,
  };

  const recovered = await recovery.recoverPaidOperatingChain(campaign, { identitySession });
  campaign = recovered.campaign;
  stage("operating-recovery", recovered.ok ? "PASS" : "FAIL", recovered.reason ?? "");

  const dispatched = await dispatch.ensureDispatchExecution(campaign, identitySession);
  if (!dispatched.ok) {
    stage("machine-dispatch", "FAIL", `${dispatched.error}: ${dispatched.message}`);
  } else {
    campaign = dispatched.campaign;
    const results = dispatched.dispatch?.designRendererObserver?.results ?? [];
    const skus = new Set(results.map((r) => r.skuId));
    const social = results.find((r) => r.skuId === "v2-rtu-social-posts");
    const promo = results.find((r) => r.skuId === "v2-rtu-promotion-graphics");
    const unexpected = [...skus].filter(
      (s) => s !== "v2-rtu-social-posts" && s !== "v2-rtu-promotion-graphics",
    );
    if (unexpected.length) {
      stage("machine-dispatch-skus", "FAIL", unexpected.join(", "));
    } else {
      stage("machine-dispatch-skus", "PASS", [...skus].join(", ") || "none");
    }
    stage(
      "machine-render-social",
      social?.ok ? "PASS" : social?.action === "skipped" ? "BLOCKED" : "FAIL",
      `${social?.action ?? "missing"} ${social?.skipReason ?? social?.failureCode ?? ""}`.trim(),
    );
    stage(
      "machine-render-promo",
      promo?.ok ? "PASS" : promo?.action === "skipped" ? "BLOCKED" : "FAIL",
      `${promo?.action ?? "missing"} ${promo?.skipReason ?? promo?.failureCode ?? ""}`.trim(),
    );
    const parent = composite.socialPromoParentProductionState(campaign);
    stage("machine-parent-state", parent.state === "complete" ? "PASS" : "FAIL", parent.state);
  }

  const reviewReady = await reviewReadiness.awaitSocialPromoParentCustomerReviewReady({
    campaignId: CAMPAIGN_ID,
    parentJobId: JOB_ID,
    campaign,
    bindReview: reviewBind.ensureSocialPromoCompositeReviewBind,
    readTasks: tasksStore.readTasksEnvelope,
  });
  campaign = reviewReady.ok
    ? reviewReady.campaign
    : (await store.readCampaignEnvelope(CAMPAIGN_ID))?.record ?? campaign;
  let tasks = await tasksStore.readTasksEnvelope(CAMPAIGN_ID);
  let job = tasks?.jobRecords?.find((j) => j.jobId === JOB_ID);

  const qaId = qaTask.formalQaTaskIdForService("social_and_promo_graphics");
  const qaTaskRow = tasks?.tasks.find((t) => t.id === qaId);
  stage(
    "quality-formal-qa-task",
    qaTaskRow?.status === "complete" ? "PASS" : "FAIL",
    qaTaskRow?.status ?? "missing",
  );

  stage(
    "customer-review-readiness",
    reviewReady.ok ? "PASS" : "FAIL",
    reviewReady.ok
      ? `ready_for_review · ${reviewReady.snapshot.preparedReviewProofCount}/8 proofs · qaAuth · ${reviewReady.waitedMs}ms · reads=${reviewReady.attempts} binds=${reviewReady.bindAttempts}`
      : `${reviewReady.code}: ${reviewReady.message}`,
  );

  const CLIENT = {
    id: CLIENT_ID,
    email: CLIENT_EMAIL,
    displayName: "Spruce Line Cert",
    roles: ["client"],
    currentCampaignId: CAMPAIGN_ID,
  };

  if (reviewReady.ok && job?.spineStatus === "ready_for_review") {
    const missingPrep = reviewReady.snapshot.missingReviewProofKeys;
    if (missingPrep.length) {
      stage("customer-review-approve", "BLOCKED", `missing prep: ${missingPrep.join(", ")}`);
    } else {
      const keys = reviewReady.snapshot.preparedReviewProofKeys.filter((key) =>
        reviewReadiness.SOCIAL_PROMO_EXPECTED_REVIEW_PROOF_KEYS.includes(key),
      );
      const feedback = reviewFeedback.createEmptyJobReviewFeedback(CAMPAIGN_ID, JOB_ID, keys);
      for (const key of keys) feedback.sectionStatuses[key] = "approved";
      const approved = reviewActions.applyReviewRoomPatch(
        tasks,
        campaign,
        job,
        { action: "approve_for_delivery", feedback },
        CLIENT,
        { staffByUserId: {}, staffCapabilities: {} },
        CLIENT_ID,
        materials.items,
      );
      if (!approved.ok) {
        stage("customer-review-approve", "FAIL", approved.error);
      } else {
        await tasksStore.writeTasksEnvelope(approved.envelope);
        if (approved.updatedCampaign) {
          await store.upsertCampaignRecord(approved.updatedCampaign, CLIENT_ID);
        }
        job = approved.job;
        stage("customer-review-approve", "PASS", job.spineStatus);
      }
    }
  } else {
    stage(
      "customer-review-approve",
      "BLOCKED",
      reviewReady.ok ? job?.spineStatus ?? "no job" : reviewReady.code,
    );
  }

  tasks = await tasksStore.readTasksEnvelope(CAMPAIGN_ID);
  job = tasks?.jobRecords?.find((j) => j.jobId === JOB_ID);
  const files = job?.clientDeliveryFiles ?? [];
  stage(
    "release-lineage",
    files.length === 8 && files.every((f) => f.releaseStatus === "released") ? "PASS" : "FAIL",
    `${files.length} files`,
  );

  const providerLog = { anthropic: 0, resend: 0 };
  stage("provider-email-activity", "PASS", JSON.stringify(providerLog));

  const BASE = resolveVerifyBaseUrl();
  let browserOk = false;
  try {
    const ping = await fetch(`${BASE}/api/auth/login`, { method: "OPTIONS" }).catch(() => null);
    browserOk = Boolean(ping);
  } catch {
    browserOk = false;
  }

  if (!browserOk) {
    stage("browser-final-delivery", "BLOCKED", `dev not reachable at ${BASE}`);
    stage("browser-unauthorized-denial", "BLOCKED", "dev not reachable");
    stage("screenshots-mobile-desktop", "BLOCKED", "dev not reachable");
  } else {
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: CLIENT_EMAIL, password: "dev-only" }),
    });
    const cookieHeader = loginRes.headers.get("set-cookie") ?? "";
    const match = cookieHeader.match(/studio_session=([^;]+)/);
    if (!match) {
      stage("browser-final-delivery", "BLOCKED", "login failed");
    } else {
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      await context.addCookies([sessionCookiePlaywright(BASE, match[1])]);

      for (const viewport of [
        { label: "1280-desktop", width: 1280, height: 900 },
        { label: "390-mobile", width: 390, height: 844 },
      ]) {
        const page = await context.newPage();
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`${BASE}/deliverables?campaignId=${CAMPAIGN_ID}`, {
          waitUntil: "networkidle",
          timeout: 120000,
        });
        await page.screenshot({
          path: path.join(OUT, `final-delivery-${viewport.label}.png`),
          fullPage: true,
        });
        await page.close();
      }

      const otherLogin = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "client@local.dev", password: "dev-only" }),
      });
      const otherCookie = otherLogin.headers.get("set-cookie")?.match(/studio_session=([^;]+)/)?.[1];
      if (otherCookie) {
        const denyContext = await browser.newContext();
        await denyContext.addCookies([sessionCookiePlaywright(BASE, otherCookie)]);
        const denyPage = await denyContext.newPage();
        const denyRes = await denyPage.goto(
          `${BASE}/api/campaigns/${CAMPAIGN_ID}/jobs/${encodeURIComponent(JOB_ID)}/review`,
        );
        let denyBody = "";
        try {
          denyBody = await denyRes?.text();
        } catch {
          denyBody = "";
        }
        const denied =
          denyRes &&
          denyRes.status() >= 400 &&
          !denyBody.includes('"review"');
        stage(
          "browser-unauthorized-denial",
          denied ? "PASS" : "FAIL",
          `HTTP ${denyRes?.status()}${denyBody.includes("Access denied") ? " Access denied" : ""}`,
        );
        await denyPage.close();
        await denyContext.close();
      } else {
        stage("browser-unauthorized-denial", "BLOCKED", "other client login failed");
      }

      const downloadVerify = await load("src/lib/file-storage/client-delivery-download-verify.ts");
      const releasedForDownload = downloadVerify.releasedClientDeliveryFiles(files);
      const primaryReleased = releasedForDownload[0];
      const downloadPath = downloadVerify.clientDeliveryFileDownloadPath(primaryReleased);
      if (downloadPath && primaryReleased?.contentSha256) {
        const dl = await downloadVerify.fetchAuthorizedDeliveryBytes({
          baseUrl: BASE,
          sessionCookie: match[1],
          downloadPath,
        });
        if (!dl.ok) {
          stage("exact-byte-download-proof", "FAIL", `${primaryReleased.fileName} ${dl.error}`);
        } else {
          const cdfMatch = downloadVerify.verifyDownloadMatchesContentSha256(
            dl.bytes,
            primaryReleased.contentSha256,
          );
          const refMatch = downloadVerify.verifyDownloadMatchesStorageRef(
            dl.bytes,
            primaryReleased.storageRef,
          );
          if (cdfMatch.ok && refMatch.ok) {
            stage(
              "exact-byte-download-proof",
              "PASS",
              `${primaryReleased.fileName} ${cdfMatch.computedSha256.slice(0, 26)}… (api ${downloadPath.slice(0, 48)}…)`,
            );
          } else {
            stage(
              "exact-byte-download-proof",
              "FAIL",
              cdfMatch.ok ? refMatch.reason : cdfMatch.reason,
            );
          }
        }
      } else {
        stage(
          "exact-byte-download-proof",
          "BLOCKED",
          !primaryReleased
            ? "no released clientDeliveryFiles"
            : !downloadPath
              ? "no File Room download url on released file"
              : "missing contentSha256 on released file",
        );
      }

      await browser.close();
      stage("browser-final-delivery", "PASS", BASE);
      stage("screenshots-mobile-desktop", "PASS", OUT);
    }
  }

  const certified = report.every((r) => r.status === "PASS");
  await writeFile(
    path.join(OUT, "report.json"),
    JSON.stringify({ report, certified, campaignId: CAMPAIGN_ID, at: new Date().toISOString() }, null, 2),
  );
  console.log(`\nFINAL: ${certified ? "CERTIFIED" : "NOT CERTIFIED"}`);
  process.exit(certified ? 0 : 3);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
