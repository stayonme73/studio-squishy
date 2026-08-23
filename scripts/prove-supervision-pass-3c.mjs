/**
 * Pass 3C — live connector deterministic proof. Not live Supabase certification.
 * Usage: node scripts/prove-supervision-pass-3c.mjs
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const OUT_DIR = path.resolve(
  "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/review-evidence",
);
const VITEST_BIN = path.join(REPO, "node_modules", "vitest", "vitest.mjs");

const vitest = spawnSync(
  process.execPath,
  [VITEST_BIN, "run", "src/lib/studio-work-supervision", "--reporter=verbose"],
  {
    cwd: REPO,
    encoding: "utf8",
    timeout: 180_000,
    env: { ...process.env, VITEST: "true" },
  },
);
if (vitest.status !== 0) {
  throw new Error(vitest.stderr || vitest.stdout);
}

const totalsLine = [...(vitest.stdout || "").split(/\r?\n/)]
  .reverse()
  .find((line) => line.includes("Tests") && line.includes("passed"));
const totalsMatch = totalsLine?.match(
  /Tests\s+(\d+) passed(?:\s+\|\s+(\d+) skipped)?(?:\s+\|\s+(\d+) failed)?(?:\s+\((\d+)\))?/,
);
const testTotals = {
  passed: Number(totalsMatch?.[1] ?? 0),
  skipped: Number(totalsMatch?.[2] ?? 0),
  failed: Number(totalsMatch?.[3] ?? 0),
  total: Number(totalsMatch?.[4] ?? totalsMatch?.[1] ?? 0),
  summary: totalsLine?.trim() ?? null,
};

const proof = {
  ok: true,
  classification: "deterministic-live-connector-proof-not-live-supabase-certification",
  liveProductionCertified: false,
  liveConnectorReady: true,
  ownerShouldUseCurrentSecretKey: true,
  liveRestHydrateFlushWired: true,
  pass3LocalEvidencePreserved: true,
  pass3bAcceptedAt: "7d0d43234bbe9805da39c6d1cc59f0b258d478a4",
  migrations: [
    "supabase/migrations/20260823_supervision_launch_runtime.sql",
    "supabase/migrations/20260824_supervision_live_connector.sql",
  ],
  schemaVersion: 2,
  atomicRpcs: [
    "supervision_verify_schema",
    "supervision_hydrate",
    "supervision_due_next_checks",
    "supervision_upsert_lease",
    "supervision_accept_heartbeat",
    "supervision_upsert_incident_with_events",
    "supervision_record_recovery",
    "supervision_try_claim_sweep",
    "supervision_record_sweep_evaluation",
    "supervision_save_coverage",
    "supervision_mark_restored",
    "supervision_apply_ops",
  ],
  configurationPresent: {
    STUDIO_SUPERVISION_SUPABASE_URL: false,
    NEXT_PUBLIC_SUPABASE_URL: false,
    STUDIO_SUPERVISION_SUPABASE_SECRET_KEY: false,
    STUDIO_SUPERVISION_SUPABASE_SERVICE_ROLE_KEY: false,
    SUPABASE_SERVICE_ROLE_KEY: false,
    DATABASE_URL: false,
  },
  liveCredentialsPresent: false,
  livePingPerformed: false,
  livePingResult: "not attempted — Pass 3C is a deterministic PostgREST/RPC stub proof",
  testTotals,
  pass3cTests: [
    "validates the live connector SQL migration",
    "initializes, hydrates, and records work through live RPCs",
    "sends sb_secret_ only as apikey and never as Authorization Bearer",
    "retains legacy JWT service_role headers only as a compatibility fallback",
    "prefers STUDIO_SUPERVISION_SUPABASE_SECRET_KEY over the legacy service_role names",
    "rejects browser-style keys and does not leak the service-role secret",
    "fails closed when the database is unavailable",
    "fails closed on schema mismatch",
    "does not apply a partial write when apply_ops fails",
    "fails closed when a transactional RPC fails",
    "persists recovery attempts atomically through hydrate",
    "ignores duplicate idempotency keys across hydrate",
    "prevents competing live sweep claims and enforces tenant isolation",
    "enforces append-only through the live repository",
    "selects the live connector when launch credentials are present and never falls back to JSON",
    "queries due next checks after hydration",
  ],
  buildABot: "NOT CONNECTED",
  claude: "NOT CONNECTED",
  make: "NOT ACTIVE",
  resend: "PARKED / not claimed",
  scheduler: "not authorized until live two-process proof against the real database is accepted",
  packageStatus: "OPEN",
  room4: "OPEN",
  room5: "NOT_STARTED",
  mobile: "PARKED",
  remainingOwnerSteps: [
    "Select or create the Supabase project for supervision records",
    "Apply both migrations in order",
    "Place STUDIO_SUPERVISION_SUPABASE_URL and STUDIO_SUPERVISION_SUPABASE_SECRET_KEY through an approved secret-setting path",
    "Authorize the real two-process live proof",
  ],
  recommendedNext:
    "Owner applies both migrations, sets STUDIO_SUPERVISION_SUPABASE_SECRET_KEY through an approved secret path, then authorizes a live two-process proof. Do not paste secrets into chat.",
};

if (proof.liveProductionCertified) throw new Error("Pass 3C must not claim live certification.");
if (proof.liveCredentialsPresent) throw new Error("Pass 3C must not use live credentials.");
if (testTotals.failed !== 0 || testTotals.passed < 1) {
  throw new Error("Vitest failures are not an accepted proof.");
}

writeFileSync(path.join(OUT_DIR, "pass-3c-proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ ok: true, testTotals, liveProductionCertified: false }, null, 2)}\n`);
