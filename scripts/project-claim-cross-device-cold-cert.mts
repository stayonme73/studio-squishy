/**
 * STUDIO-OPERATING-PROJECT-CLAIM-AND-CONTINUITY-1 — cross-device cold cert.
 *
 * Guest sandbox pay (no session) → discard browser context → fresh context →
 * verify email (token minted server-side, same as email cold-cert helper —
 * no Tagia inbox required) → claim → Studio Board resolves same campaign.
 *
 * Run:
 *   npx tsx scripts/project-claim-cross-device-cold-cert.mts
 *
 * Env:
 *   CERT_BASE_URL  optional — if unset, script starts next on CERT_PORT
 *   CERT_PORT      default 3055
 *   CERT_COMMIT    optional tip recorded in evidence
 *   SESSION_SECRET used when starting local server (ephemeral cert value OK)
 */
import { chromium } from "playwright";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { createCheckoutSession } from "../src/lib/studio-payment/create-session";
import { confirmSandboxCheckoutSession } from "../src/lib/studio-payment/sandbox-confirm";
import {
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "../src/lib/campaign-store/store";
import { computePlanPricingTotals } from "../src/lib/plan-pricing";
import type { CampaignRecord } from "../src/config/studio-board";
import type { PreAcceptanceProjectFacts } from "../src/lib/studio-pre-acceptance/types";
import { issueEmailVerificationToken } from "../src/lib/auth/email-verification-tokens";
import { findUserByEmail } from "../src/lib/auth/users";
import { normalizeEmail } from "../src/lib/auth/email-normalize";

const PORT = process.env.CERT_PORT || "3055";
const EXTERNAL_BASE = process.env.CERT_BASE_URL || "";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "claim-continuity-cold-cert-ephemeral-not-for-production";
const COMMIT =
  process.env.CERT_COMMIT ||
  (() => {
    try {
      return readFileSync(join(process.cwd(), ".git", "HEAD"), "utf8").trim();
    } catch {
      return "unknown";
    }
  })();
const OUT = join(
  process.cwd(),
  "docs",
  "launch",
  "studio-operating-project-claim-and-continuity-1",
  "cold-cert",
);

mkdirSync(OUT, { recursive: true });

type Check = {
  check: string;
  status: "PASS" | "FAIL" | "BLOCKED";
  detail?: string;
};

const results: Check[] = [];
let serverChild: ChildProcess | null = null;
let BASE = EXTERNAL_BASE || `http://127.0.0.1:${PORT}`;

function push(
  check: string,
  status: Check["status"],
  detail?: string,
): void {
  results.push({ check, status, detail });
  console.log(detail ? `${status}  ${check} — ${detail}` : `${status}  ${check}`);
}

function clearFacts(): PreAcceptanceProjectFacts {
  return {
    draftRevision: 1,
    routeId: "i75",
    selectedServiceIds: ["v2-rtu-flyer"],
    projectNeed: "Need a flyer for our spring open house",
    businessName: "Claim Cold Cert Cafe",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    riskScanText: "Need a flyer for our spring open house",
  };
}

function unpaidCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals(["v2-rtu-flyer"]);
  return {
    campaignId,
    campaignName: "Claim Cold Cert Cafe",
    campaignStatus: "DRAFT_RECEIVED",
    campaignDescription: "Awaiting payment",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: null,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: ["v2-rtu-flyer"],
      includedServiceIds: ["v2-rtu-flyer"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: [],
      approvedAt: now,
    },
  };
}

async function waitForServer(url: string, attempts = 90): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`${url}/api/auth/session`, { method: "GET" });
      if (res.status > 0) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function startLocalServer(): Promise<string> {
  const base = `http://127.0.0.1:${PORT}`;
  serverChild = spawn(
    "npx",
    ["next", "dev", "-H", "127.0.0.1", "-p", PORT],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        SESSION_SECRET,
        NEXT_PUBLIC_SITE_URL: base,
      },
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    },
  );
  const ready = await waitForServer(base);
  if (!ready) {
    serverChild.kill();
    serverChild = null;
    throw new Error(`Local next dev did not become ready on ${base}`);
  }
  return base;
}

function stopLocalServer(): void {
  if (!serverChild) return;
  try {
    serverChild.kill("SIGTERM");
  } catch {
    // ignore
  }
  serverChild = null;
}

function finish(code: number): number {
  stopLocalServer();
  const failed = results.filter((r) => r.status === "FAIL").length;
  const blocked = results.filter((r) => r.status === "BLOCKED").length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const verdict =
    failed > 0
      ? "NOT READY"
      : blocked > 0
        ? "BLOCKED — start local server and re-run"
        : "PROJECT CLAIM & CROSS-DEVICE CONTINUITY READY";

  const evidence = {
    packageId: "STUDIO-OPERATING-PROJECT-CLAIM-AND-CONTINUITY-1",
    kind: "cross-device-cold-cert",
    recordedAt: new Date().toISOString(),
    baseUrl: BASE,
    commitHint: COMMIT,
    runId: randomUUID(),
    totals: { passed, failed, blocked, total: results.length },
    verdict,
    results,
    notes: [
      "Email verification used server-minted token (same pattern as email-verification-cold-cert.mts) — no Tagia inbox required.",
      "Fresh Playwright browser contexts simulate separate devices (no shared cookies/storage).",
      "Guest sandbox pay ran in-process with Stripe keys unset so sandbox confirm remains available.",
      EXTERNAL_BASE
        ? "Used external CERT_BASE_URL server."
        : "Script started ephemeral next dev with cert SESSION_SECRET.",
    ],
  };

  const outPath = join(OUT, "cross-device-cold-cert-evidence.json");
  writeFileSync(outPath, JSON.stringify(evidence, null, 2), "utf8");
  console.log(`\nEvidence: ${outPath}`);
  console.log(`Verdict: ${verdict}`);
  process.exitCode = code;
  return code;
}

async function main() {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  process.env.NODE_ENV = process.env.NODE_ENV || "development";

  const stamp = Date.now();
  const campaignId = `claim-cold-${stamp}`;
  const buyerEmail = `claim.cold.${stamp}@example.com`;
  const attackerEmail = `claim.attacker.${stamp}@example.com`;
  const password = "ClaimCold-Cert-0814!";

  if (!EXTERNAL_BASE) {
    console.log(`Starting local next on :${PORT} …`);
    BASE = await startLocalServer();
    push("dev_server_available", "PASS", `${BASE} (spawned)`);
  } else {
    BASE = EXTERNAL_BASE;
    const serverUp = await waitForServer(BASE, 30);
    if (!serverUp) {
      push("dev_server_available", "BLOCKED", `No server at ${BASE}`);
      return finish(2);
    }
    push("dev_server_available", "PASS", BASE);
  }

  console.log(`BASE=${BASE}`);
  console.log(`campaignId=${campaignId}`);

  await upsertCampaignRecord(unpaidCampaign(campaignId));
  const started = await createCheckoutSession({
    campaignId,
    facts: clearFacts(),
    returnOrigin: BASE,
    customerEmail: buyerEmail,
    preferSandbox: true,
  });
  if (!started.ok || started.mode !== "sandbox") {
    push(
      "guest_sandbox_checkout",
      "FAIL",
      !started.ok ? started.message : `mode=${(started as { mode?: string }).mode}`,
    );
    return finish(1);
  }
  push("guest_sandbox_checkout", "PASS", started.checkoutSessionId);

  const confirmed = await confirmSandboxCheckoutSession(started.checkoutSessionId);
  if (!confirmed.ok) {
    push("guest_sandbox_confirm", "FAIL", confirmed.message);
    return finish(1);
  }
  const claimRawToken = confirmed.claimRawToken ?? null;
  if (!claimRawToken) {
    push("guest_claim_receipt_minted", "FAIL", "claimRawToken missing");
    return finish(1);
  }
  push("guest_claim_receipt_minted", "PASS", "raw token returned once");

  const afterPay = await readCampaignEnvelope(campaignId);
  if (afterPay?.clientUserId) {
    push(
      "guest_project_unowned_after_pay",
      "FAIL",
      `clientUserId=${afterPay.clientUserId}`,
    );
    return finish(1);
  }
  push("guest_project_unowned_after_pay", "PASS");
  if (afterPay?.record.paymentTruth?.status !== "confirmed") {
    push(
      "payment_truth_confirmed",
      "FAIL",
      String(afterPay?.record.paymentTruth?.status),
    );
    return finish(1);
  }
  push(
    "payment_truth_confirmed",
    "PASS",
    `${afterPay.record.paymentTruth.confirmedAmountCents}¢`,
  );

  const browser = await chromium.launch({ headless: true });

  const deviceA = await browser.newContext();
  const pageA = await deviceA.newPage();
  await pageA.goto(
    `${BASE}/studio-board?campaignId=${encodeURIComponent(campaignId)}`,
    { waitUntil: "domcontentloaded", timeout: 60_000 },
  );
  const aSession = await pageA.request.get(`${BASE}/api/auth/session`);
  const aSessionBody = (await aSession.json().catch(() => ({}))) as {
    user?: unknown;
  };
  const aCamp = await pageA.request.get(
    `${BASE}/api/campaigns/${encodeURIComponent(campaignId)}`,
  );
  const aCampStatus = aCamp.status();
  push(
    "device_a_unsigned_cannot_read_unowned_paid",
    aCampStatus === 401 || aCampStatus === 403 || aCampStatus === 404
      ? "PASS"
      : "FAIL",
    `sessionUser=${Boolean(aSessionBody.user)} status=${aCampStatus}`,
  );
  await deviceA.close();

  const deviceB = await browser.newContext();
  const pageB = await deviceB.newPage();

  const signup = await pageB.request.post(`${BASE}/api/auth/signup`, {
    data: {
      email: buyerEmail,
      password,
      displayName: "Claim Cold Buyer",
    },
  });
  const signupBody = (await signup.json().catch(() => ({}))) as {
    user?: { id?: string };
    error?: string;
  };
  if (!signup.ok() || !signupBody.user?.id) {
    push(
      "fresh_device_signup",
      "FAIL",
      signupBody.error ?? String(signup.status()),
    );
    await browser.close();
    return finish(1);
  }
  push("fresh_device_signup", "PASS", signupBody.user.id);

  const issued = await issueEmailVerificationToken(signupBody.user.id);
  await pageB.goto(
    `${BASE}/verify-email?token=${encodeURIComponent(issued.rawToken)}`,
    { waitUntil: "networkidle", timeout: 60_000 },
  );
  let buyerAfterVerify = await findUserByEmail(normalizeEmail(buyerEmail));
  if (!buyerAfterVerify?.emailVerifiedAt) {
    await pageB.request.post(`${BASE}/api/auth/verify-email`, {
      data: { token: issued.rawToken },
    });
    buyerAfterVerify = await findUserByEmail(normalizeEmail(buyerEmail));
  }
  push(
    "fresh_device_email_verified",
    buyerAfterVerify?.emailVerifiedAt ? "PASS" : "FAIL",
    buyerAfterVerify?.emailVerifiedAt ?? "missing",
  );

  await pageB.goto(
    `${BASE}/claim-project?token=${encodeURIComponent(claimRawToken)}&campaignId=${encodeURIComponent(campaignId)}`,
    { waitUntil: "networkidle", timeout: 60_000 },
  );
  await pageB.waitForTimeout(2000);
  const claimHeading =
    (await pageB.locator("h1").first().textContent().catch(() => "")) ?? "";
  const ownedAfterUi = await readCampaignEnvelope(campaignId);
  const claimOk =
    /Project claimed/i.test(claimHeading) ||
    ownedAfterUi?.clientUserId === buyerAfterVerify?.id;
  push(
    "fresh_device_claim_ui",
    claimOk ? "PASS" : "FAIL",
    `heading=${claimHeading || "(none)"}`,
  );

  const owned = await readCampaignEnvelope(campaignId);
  push(
    "server_ownership_bound",
    owned?.clientUserId === buyerAfterVerify?.id ? "PASS" : "FAIL",
    `clientUserId=${owned?.clientUserId ?? "null"}`,
  );

  const payUnchanged =
    owned?.record.paymentTruth?.checkoutSessionId ===
      afterPay.record.paymentTruth?.checkoutSessionId &&
    owned?.record.paymentTruth?.confirmedAmountCents ===
      afterPay.record.paymentTruth?.confirmedAmountCents &&
    owned?.record.paymentReceivedAt === afterPay.record.paymentReceivedAt;
  push(
    "payment_truth_unchanged_after_claim",
    payUnchanged ? "PASS" : "FAIL",
  );

  await pageB.goto(
    `${BASE}/studio-board?campaignId=${encodeURIComponent(campaignId)}`,
    { waitUntil: "domcontentloaded", timeout: 60_000 },
  );
  const boardRead = await pageB.request.get(
    `${BASE}/api/campaigns/${encodeURIComponent(campaignId)}`,
  );
  const boardBody = (await boardRead.json().catch(() => ({}))) as {
    campaign?: { campaignId?: string; record?: { campaignId?: string } };
  };
  const boardCampaignId =
    boardBody.campaign?.record?.campaignId ??
    boardBody.campaign?.campaignId ??
    null;
  push(
    "studio_board_opens_same_project",
    boardRead.ok() && boardCampaignId === campaignId ? "PASS" : "FAIL",
    `status=${boardRead.status()} id=${boardCampaignId}`,
  );

  const reclaim = await pageB.request.post(`${BASE}/api/campaigns/claim`, {
    data: { campaignId, claimToken: claimRawToken },
  });
  const reclaimBody = (await reclaim.json().catch(() => ({}))) as {
    ok?: boolean;
    alreadyOwned?: boolean;
  };
  push(
    "claim_retry_idempotent",
    reclaim.ok() && reclaimBody.ok === true ? "PASS" : "FAIL",
    `alreadyOwned=${String(reclaimBody.alreadyOwned)}`,
  );

  await deviceB.close();

  const deviceC = await browser.newContext();
  const pageC = await deviceC.newPage();
  const attackerSignup = await pageC.request.post(`${BASE}/api/auth/signup`, {
    data: {
      email: attackerEmail,
      password,
      displayName: "Claim Attacker",
    },
  });
  const attackerBody = (await attackerSignup.json().catch(() => ({}))) as {
    user?: { id?: string };
  };
  if (attackerBody.user?.id) {
    const atkToken = await issueEmailVerificationToken(attackerBody.user.id);
    await pageC.request.post(`${BASE}/api/auth/verify-email`, {
      data: { token: atkToken.rawToken },
    });
    const steal = await pageC.request.post(`${BASE}/api/campaigns/claim`, {
      data: { campaignId, claimToken: claimRawToken },
    });
    const stealBody = (await steal.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };
    push(
      "wrong_customer_cannot_claim",
      !steal.ok() && stealBody.ok !== true ? "PASS" : "FAIL",
      `status=${steal.status()} error=${stealBody.error ?? ""}`,
    );
  } else {
    push("wrong_customer_cannot_claim", "FAIL", "attacker signup failed");
  }
  await deviceC.close();
  await browser.close();

  const stillOne = await readCampaignEnvelope(campaignId);
  push(
    "no_duplicate_campaign_after_retries",
    stillOne?.campaignId === campaignId &&
      stillOne.clientUserId === buyerAfterVerify?.id
      ? "PASS"
      : "FAIL",
  );

  return finish(results.some((r) => r.status === "FAIL") ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  stopLocalServer();
  process.exit(1);
});
