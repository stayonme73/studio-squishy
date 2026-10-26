/**
 * Read-only: verify Cert-9 released files via authorized File Room download API.
 * Does not mutate campaign/tasks evidence. Requires local dev at VERIFY_BASE_URL.
 *
 * Usage: npx tsx scripts/verify-cert9-released-download-readonly.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { resolveVerifyBaseUrl } from "./review-room-v1-test-env.mjs";

const CAMPAIGN_ID = "disposable-social-promo-machine-cert-9";
const JOB_ID = `${CAMPAIGN_ID}:social_and_promo_graphics`;
const CLIENT_EMAIL = "sp-cert-9@local.dev";
const repoRoot = process.cwd();

const verify = await import(
  pathToFileURL(
    path.join(repoRoot, "src/lib/file-storage/client-delivery-download-verify.ts"),
  ).href,
);

const tasksPath = path.join(repoRoot, "data/campaign-tasks", `${CAMPAIGN_ID}.json`);
const tasks = JSON.parse(readFileSync(tasksPath, "utf8"));
const job = tasks.jobRecords?.find((entry) => entry.jobId === JOB_ID);
const released = verify.releasedClientDeliveryFiles(job?.clientDeliveryFiles ?? []);

/** @type {{ check: string, status: string, detail?: string }[]} */
const checks = [];

function record(check, status, detail = "") {
  checks.push({ check, status, detail });
  console.log(`${status.padEnd(5)} ${check}${detail ? ` — ${detail}` : ""}`);
}

record("cert-9-tasks-present", job ? "PASS" : "FAIL", tasksPath);
record("released-file-count", released.length === 8 ? "PASS" : "FAIL", String(released.length));

const BASE = resolveVerifyBaseUrl();
let serverOk = false;
try {
  const ping = await fetch(`${BASE}/api/auth/login`, { method: "OPTIONS" });
  serverOk = Boolean(ping);
} catch {
  serverOk = false;
}
record("dev-server-reachable", serverOk ? "PASS" : "BLOCKED", BASE);

let sessionCookie = null;
if (serverOk) {
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CLIENT_EMAIL, password: "dev-only" }),
  });
  sessionCookie = login.headers.get("set-cookie")?.match(/studio_session=([^;]+)/)?.[1] ?? null;
  record("cert-9-client-login", sessionCookie ? "PASS" : "FAIL", CLIENT_EMAIL);
}

if (serverOk && sessionCookie) {
  for (const file of released) {
    const downloadPath = verify.clientDeliveryFileDownloadPath(file);
    if (!downloadPath) {
      record(`download-path-${file.fileName}`, "FAIL", "no url");
      continue;
    }
    const dl = await verify.fetchAuthorizedDeliveryBytes({
      baseUrl: BASE,
      sessionCookie,
      downloadPath,
    });
    if (!dl.ok) {
      record(`download-${file.fileName}`, "FAIL", dl.error);
      continue;
    }
    const cdf = verify.verifyDownloadMatchesContentSha256(dl.bytes, file.contentSha256);
    const ref = verify.verifyDownloadMatchesStorageRef(dl.bytes, file.storageRef);
    record(
      `exact-bytes-${file.fileName}`,
      cdf.ok && ref.ok ? "PASS" : "FAIL",
      cdf.ok ? ref.ok ? "cdf+storageRef" : ref.reason : cdf.reason,
    );
  }

  const strangerLogin = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "client@local.dev", password: "dev-only" }),
  });
  const strangerCookie =
    strangerLogin.headers.get("set-cookie")?.match(/studio_session=([^;]+)/)?.[1] ?? null;
  const firstPath = verify.clientDeliveryFileDownloadPath(released[0]);
  if (strangerCookie && firstPath) {
    const foreign = await verify.fetchAuthorizedDeliveryBytes({
      baseUrl: BASE,
      sessionCookie: strangerCookie,
      downloadPath: firstPath,
    });
    record(
      "cross-customer-download-denied",
      !foreign.ok && (foreign.status === 403 || foreign.status === 401 || foreign.status === 404)
        ? "PASS"
        : "FAIL",
      `HTTP ${foreign.status}`,
    );
  } else {
    record("cross-customer-download-denied", "BLOCKED", "stranger login or path missing");
  }
}

const proof = {
  at: new Date().toISOString(),
  campaignId: CAMPAIGN_ID,
  readOnly: true,
  evidenceFile: tasksPath,
  checks,
  allPass: checks.every((c) => c.status === "PASS"),
};
const outRepo = path.join(
  repoRoot,
  "docs/launch/studio-operating-mobile-customer-journey-certification-1/disposable-social-promo-machine-cert-proofs/production-truth-e2e-cert-9/cert-9-readonly-download-verify.json",
);
writeFileSync(outRepo, JSON.stringify(proof, null, 2));
console.log(`\nWrote ${outRepo}`);

const dropbox = path.join(
  process.env.USERPROFILE ?? "",
  "Dropbox",
  "Studio Shared Handoff",
  "cert-9-readonly-download-verify.json",
);
try {
  writeFileSync(dropbox, JSON.stringify(proof, null, 2));
  console.log(`Wrote ${dropbox}`);
} catch (error) {
  console.error("Dropbox write skipped:", error);
}

process.exit(proof.allPass ? 0 : checks.some((c) => c.status === "FAIL") ? 2 : 1);
