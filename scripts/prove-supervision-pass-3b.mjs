/**
 * Pass 3B — launch-runtime durability correction.
 * Deterministic adapter proof. Not live production certification.
 * Fictional records only. Does not connect Build-A-Bot.
 *
 * Usage: node scripts/prove-supervision-pass-3b.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO = process.cwd();
const OUT_DIR = path.resolve(
  "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/review-evidence",
);
const PASS3_PROOF = path.join(OUT_DIR, "pass-3-proof.json");
const VITEST_BIN = path.join(REPO, "node_modules", "vitest", "vitest.mjs");
const MULTIPROCESS = path.join(REPO, "scripts", "prove-supervision-pass-3b-multiprocess.mjs");

function fail(message) {
  throw new Error(message);
}

function envKeyPresent(name) {
  const files = [path.join(REPO, ".env.local"), path.join(REPO, ".env")];
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
      const eq = line.indexOf("=");
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key === name && value) return true;
    }
  }
  return Boolean(process.env[name]?.trim());
}

function presentNames(names) {
  return Object.fromEntries(names.map((name) => [name, envKeyPresent(name)]));
}

if (!existsSync(PASS3_PROOF)) {
  fail("Pass 3 local evidence is missing. Do not delete or rewrite it.");
}

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
  fail(`Vitest failed:\n${vitest.stderr || vitest.stdout}`);
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

const multiprocess = spawnSync(process.execPath, [MULTIPROCESS], {
  cwd: REPO,
  encoding: "utf8",
  timeout: 20_000,
  execArgv: [],
});
if (multiprocess.status !== 0) {
  fail(`Multi-process proof failed:\n${multiprocess.stderr || multiprocess.stdout}`);
}
const twoProcess = JSON.parse(multiprocess.stdout);

const configurationPresent = presentNames([
  "STUDIO_SUPERVISION_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "STUDIO_SUPERVISION_SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
]);
const liveCredentialsPresent = Boolean(
  (configurationPresent.STUDIO_SUPERVISION_SUPABASE_URL ||
    configurationPresent.NEXT_PUBLIC_SUPABASE_URL) &&
    (configurationPresent.STUDIO_SUPERVISION_SUPABASE_SERVICE_ROLE_KEY ||
      configurationPresent.SUPABASE_SERVICE_ROLE_KEY),
);

const proof = {
  ok: true,
  classification: "deterministic-adapter-proof-not-live-production",
  liveProductionCertified: false,
  pass3LocalEvidencePreserved: true,
  pass3ProofPath: "docs/launch/studio-operating-work-supervision-and-incident-escalation-1/review-evidence/pass-3-proof.json",
  persistence: {
    memory: "unit-tests-only",
    "studio-data-json": "local-development-and-controlled-certification-only",
    "supabase-postgres": "launch-production-shared-durable-store-required",
  },
  supabaseObjectStorage: "not the incident database",
  configurationPresent,
  liveCredentialsPresent,
  livePingPerformed: false,
  livePingResult: "not attempted — live REST repository is not wired in Pass 3B",
  twoOsProcessSweepClaim: twoProcess,
  testTotals,
  buildABot: "NOT CONNECTED",
  claude: "NOT CONNECTED",
  make: "NOT ACTIVE",
  resend: "PARKED / not claimed",
  scheduler: "not authorized until live production durability is proven",
  packageStatus: "OPEN",
  room4: "OPEN",
  room5: "NOT_STARTED",
  mobile: "PARKED",
};

writeFileSync(path.join(OUT_DIR, "pass-3b-proof.json"), `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(
  path.join(OUT_DIR, "pass-3b-classification.html"),
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Pass 3B classification — not live production</title>
</head>
<body>
  <h1>Pass 3B launch-runtime durability</h1>
  <p>This page is deterministic adapter proof. It is not live production certification.</p>
  <ul>
    <li>memory: unit tests only</li>
    <li>studio-data-json: local development and controlled certification only</li>
    <li>supabase-postgres: required launch production store</li>
  </ul>
  <p>Build-A-Bot remains NOT CONNECTED. Fictional records only. Pass 3 local evidence is preserved.</p>
</body>
</html>
`,
);

if (proof.liveProductionCertified) fail("Pass 3B must not claim live production certification.");
if (twoProcess.bothWon) fail("Competing sweep claims both won.");
if (testTotals.failed !== 0 || testTotals.passed < 1) fail("Vitest failures are not an accepted proof.");

process.stdout.write(`${JSON.stringify({ ok: true, testTotals, liveProductionCertified: false }, null, 2)}\n`);
