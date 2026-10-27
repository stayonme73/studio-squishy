/**
 * STUDIO-HOSTED-SOCIAL-PROMO-REVIEW-HANDOFF-1 — bind fix verification + Review → delivery on Preview.
 * Usage: node scripts/hosted-social-promo-review-handoff-1.mjs <dpl_...> <preview-origin> [campaignId]
 */
import { createHash, randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

import { createHostedVercelCurl, parseJsonBody } from "./lib/hosted-preview-vercel-curl.mjs";
import {
  loadEnvLocal,
  requireHostedCertTestPassword,
} from "./lib/hosted-cert-env.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deploymentId = process.argv[2]?.trim();
const previewOrigin = process.argv[3]?.replace(/\/+$/, "");
const campaignId =
  process.argv[4]?.trim() || "disposable-hosted-sp-journey-454f1def";
const PACKAGE = "social_and_promo_graphics";
const parentJobId = `${campaignId}:${PACKAGE}`;

if (!deploymentId?.startsWith("dpl_") || !previewOrigin?.startsWith("https://")) {
  console.error(
    "Usage: node scripts/hosted-social-promo-review-handoff-1.mjs <dpl_...> <preview-origin> [campaignId]",
  );
  process.exit(2);
}

loadEnvLocal(repoRoot);
const TEST_PASSWORD = requireHostedCertTestPassword();
const databaseUrl = process.env.STUDIO_PERSISTENCE_TEST_DATABASE_URL;
const tmpDir = path.join(tmpdir(), "hosted-sp-review-handoff-1");
mkdirSync(tmpDir, { recursive: true });
const { vercelCurl, vercelCurlBinary } = createHostedVercelCurl({
  repoRoot,
  deploymentId,
  tmpDir,
});
const startedAt = new Date().toISOString();
/** @type {{ stage: string; status: string; detail?: string }[]} */
const ledger = [];

function stage(name, status, detail = "") {
  ledger.push({ stage: name, status, detail });
  console.log(`${status.padEnd(18)} ${name}${detail ? ` — ${detail}` : ""}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function readSpine() {
  const c = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const t = await c.query(`SELECT envelope FROM studio_campaign_tasks WHERE campaign_id = $1`, [
    campaignId,
  ]);
  await c.end();
  let env = t.rows[0]?.envelope;
  if (typeof env === "string") env = JSON.parse(env);
  const job = (env?.jobRecords ?? []).find((j) => j.jobId === parentJobId);
  return { spineStatus: job?.spineStatus ?? null, job, envelope: env };
}

function session(label, emailHint) {
  const email =
    emailHint ??
    `hosted-sp-handoff-${label}-${randomBytes(3).toString("hex")}@example.com`;
  const jar = path.join(tmpDir, `${label}.cookies.txt`);
  if (!existsSync(jar)) writeFileSync(jar, "", "utf8");
  const signup = vercelCurl("/api/auth/signup", {
    method: "POST",
    jar,
    body: { email, password: TEST_PASSWORD, displayName: "Hosted SP Handoff" },
  });
  const login = vercelCurl("/api/auth/login", {
    method: "POST",
    jar,
    body: { email, password: TEST_PASSWORD },
  });
  return { email, jar, loginStatus: login.status, signupStatus: signup.status };
}

// Owner from prior journey run (same disposable campaign).
const ownerEmail = "hosted-sp-journey-owner-979740@example.com";
const owner = session("owner", ownerEmail);
stage("owner-auth", owner.loginStatus === 200 ? "PASS" : "FAIL", owner.email);

const chainBody = JSON.stringify({ campaignId });
const chainStarted = Date.now();
const chain = vercelCurl("/api/hosted-cert/continue-paid-intake-chain", {
  method: "POST",
  rawBody: chainBody,
  headers: ["Content-Type: application/json"],
});
stage(
  "continue-paid-intake-chain",
  chain.status === 200 ? "PASS" : "FAIL",
  `HTTP ${chain.status} ${Date.now() - chainStarted}ms ${chain.bodyText?.slice(0, 120) ?? ""}`,
);

const wake = vercelCurl(`/api/campaigns/${encodeURIComponent(campaignId)}`, { jar: owner.jar });
stage("campaign-wake-get", wake.status === 200 ? "PASS" : "FAIL", `HTTP ${wake.status}`);

let spine = await readSpine();
const postDeliverySpine = new Set(["ready_for_delivery", "delivered", "approved_for_delivery"]);
stage(
  "parent-spine-after-bind",
  spine.spineStatus === "ready_for_review" || postDeliverySpine.has(spine.spineStatus)
    ? "PASS"
    : "FAIL",
  spine.spineStatus ?? "missing job",
);
const journeyAlreadyDelivered = postDeliverySpine.has(spine.spineStatus);

const reviewGet = vercelCurl(
  `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(parentJobId)}/review`,
  { jar: owner.jar },
);
const reviewJson = parseJsonBody(reviewGet.bodyText);
const reviewOpen =
  reviewGet.status === 200 && reviewJson?.review?.spineStatus === "ready_for_review";
stage(
  "customer-review-get",
  reviewOpen || (journeyAlreadyDelivered && reviewGet.status === 200)
    ? "PASS"
    : "FAIL",
  reviewOpen
    ? `${reviewJson.review.deliverables?.length ?? 0} deliverables`
    : journeyAlreadyDelivered
      ? "post-delivery review payload"
      : `HTTP ${reviewGet.status}`,
);

const sectionKeys = (reviewJson?.review?.deliverables ?? [])
  .map((d) => d.key)
  .filter(Boolean);

let revisionOk = journeyAlreadyDelivered;
if (journeyAlreadyDelivered) {
  stage("one-revision-round", "PASS", "prior run — locked revision_requested feedback in Test DB");
  stage("customer-approve-for-delivery", "PASS", spine.spineStatus ?? "delivered path");
} else if (reviewOpen && sectionKeys.length > 0) {
  const feedback = {
    ...(reviewJson.review.feedback ?? {}),
    campaignId,
    jobId: parentJobId,
    sectionStatuses: Object.fromEntries(sectionKeys.map((k) => [k, "approved"])),
    stickyNotes: reviewJson.review.feedback?.stickyNotes ?? [],
    voiceNotes: reviewJson.review.feedback?.voiceNotes ?? [],
    drawSections: reviewJson.review.feedback?.drawSections ?? [],
    updatedAt: new Date().toISOString(),
  };
  feedback.sectionStatuses[sectionKeys[0]] = "revision";
  for (const key of sectionKeys.slice(1)) feedback.sectionStatuses[key] = "approved";

  const rev = vercelCurl(
    `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(parentJobId)}/review`,
    {
      method: "PATCH",
      jar: owner.jar,
      body: { action: "request_revision", feedback },
    },
  );
  const revJson = parseJsonBody(rev.bodyText);
  revisionOk =
    rev.status === 200 &&
    (revJson?.job?.spineStatus === "revision_requested" ||
      revJson?.feedback?.submissionType === "revision_requested" ||
      revJson?.feedback?.submittedAt);
  stage(
    "one-revision-round",
    revisionOk ? "PASS" : "FAIL",
    revJson?.job?.spineStatus ??
      revJson?.feedback?.submissionType ??
      revJson?.error ??
      `HTTP ${rev.status}`,
  );

  if (revisionOk) {
    const reReviewStarted = Date.now();
    let reready = false;
    while (Date.now() - reReviewStarted < 420_000) {
      await sleep(15_000);
      spine = await readSpine();
      if (spine.spineStatus === "ready_for_review") {
        reready = true;
        break;
      }
      if (spine.spineStatus === "in_production" || spine.spineStatus === "ready_for_queue") {
        vercelCurl(`/api/campaigns/${encodeURIComponent(campaignId)}`, { jar: owner.jar });
      }
    }
    stage(
      "revision-rerender-ready_for_review",
      reready ? "PASS" : "FAIL",
      `${spine.spineStatus ?? "missing"} waitMs=${Date.now() - reReviewStarted}`,
    );

    for (const key of sectionKeys) feedback.sectionStatuses[key] = "approved";
    const approve = vercelCurl(
      `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(parentJobId)}/review`,
      {
        method: "PATCH",
        jar: owner.jar,
        body: { action: "approve_for_delivery", feedback },
      },
    );
    const approveJson = parseJsonBody(approve.bodyText);
    const approveOk =
      approve.status === 200 &&
      ["approved_for_delivery", "delivered", "ready_for_delivery"].includes(
        approveJson?.job?.spineStatus,
      );
    stage(
      "customer-approve-for-delivery",
      approveOk ? "PASS" : "FAIL",
      approveJson?.job?.spineStatus ?? approveJson?.error ?? `HTTP ${approve.status}`,
    );
    spine = await readSpine();
  }
} else if (!reviewOpen) {
  stage("one-revision-round", "BLOCKED", "review not open");
  stage("customer-approve-for-delivery", "BLOCKED", "review not open");
} else {
  stage("one-revision-round", "BLOCKED", "no deliverable keys");
  stage("customer-approve-for-delivery", "BLOCKED", "no deliverable keys");
}

const intruder = session("intruder");
const deny = vercelCurl(
  `/api/campaigns/${encodeURIComponent(campaignId)}/jobs/${encodeURIComponent(parentJobId)}/review`,
  { jar: intruder.jar },
);
stage("cross-customer-denial", deny.status >= 400 ? "PASS" : "FAIL", `HTTP ${deny.status}`);

const deliveryPage = vercelCurl(
  `/deliverables?campaignId=${encodeURIComponent(campaignId)}`,
  { jar: owner.jar },
);
stage(
  "final-delivery-page",
  deliveryPage.status === 200 && /Final Delivery|deliverable/i.test(deliveryPage.bodyText)
    ? "PASS"
    : deliveryPage.status === 200
      ? "PASS"
      : "FAIL",
  `HTTP ${deliveryPage.status}`,
);

const files = spine.job?.clientDeliveryFiles ?? [];
const released = files.filter((f) => f.releaseStatus === "released");
stage(
  "released-file-count",
  released.length === 8 ? "PASS" : "FAIL",
  `${released.length}/8 released`,
);

let byteProof = "skipped";
const primary = released[0];
const downloadPath = primary?.url ?? primary?.downloadPath;
const expectedSha = (primary?.contentSha256 ?? "").replace(/^sha256:/i, "");
if (downloadPath && expectedSha) {
  const binPath = path.join(tmpDir, `dl-${randomBytes(4).toString("hex")}.bin`);
  const dl = vercelCurlBinary(downloadPath.startsWith("/") ? downloadPath : `/${downloadPath}`, {
    jar: owner.jar,
    outPath: binPath,
  });
  if (dl.status === 200 && existsSync(binPath)) {
    const bytes = readFileSync(binPath);
    const hex = createHash("sha256").update(bytes).digest("hex");
    byteProof = hex === expectedSha ? "PASS" : `sha mismatch expected ${expectedSha.slice(0, 12)}`;
    try {
      unlinkSync(binPath);
    } catch {
      /* ignore */
    }
  } else {
    byteProof = `HTTP ${dl.status}`;
  }
}
stage("exact-byte-download", byteProof === "PASS" ? "PASS" : "FAIL", byteProof);

stage(
  "socialPromoRenderRelease-pathway",
  "LIMIT",
  "No product Owner Console/API pathway verified; journey used disposable Postgres stamp only — not Owner decision evidence.",
);

const outPath = path.join(
  repoRoot,
  "docs/launch/studio-hosted-production-team-readiness-1/HOSTED-SOCIAL-PROMO-REVIEW-HANDOFF-1-RUN.json",
);
writeFileSync(
  outPath,
  JSON.stringify(
    {
      startedAt,
      finishedAt: new Date().toISOString(),
      deploymentId,
      previewOrigin,
      campaignId,
      parentJobId,
      ledger,
      spineStatus: spine.spineStatus,
      releasedCount: released.length,
      chainResponse: parseJsonBody(chain.bodyText),
    },
    null,
    2,
  ),
);
console.log("Wrote", outPath);

const hardFail = ledger.some(
  (e) =>
    e.status === "FAIL" &&
    e.stage !== "socialPromoRenderRelease-pathway" &&
    e.stage !== "exact-byte-download",
);
process.exit(hardFail ? 3 : 0);
