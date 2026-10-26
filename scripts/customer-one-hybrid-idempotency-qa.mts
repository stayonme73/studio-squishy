/**
 * Builder-QA — Customer-One hybrid idempotency proof.
 * Runs the paid-operating recovery chain a second time against the unchanged
 * Customer-One execution. An unchanged execution must reuse the existing hybrid
 * identity and must not buy a second generated visual.
 * Writes its own proof file so the remint proof is not overwritten.
 * Does not alter customer facts. Does not open Review. Does not merge or push.
 * Usage: npx tsx scripts/customer-one-hybrid-idempotency-qa.mts
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { MAYA_PROTECTED_CAMPAIGN_ID } from "../src/config/studio-production-team-workforce-v1";
import { isGenuineProtectedCorrectionUse } from "../src/lib/campaign-store/protected-campaign-guard";
import { readCampaignEnvelope } from "../src/lib/campaign-store/store";
import { recoverPaidOperatingChain } from "../src/lib/studio-paid-activation-recovery/recover";
import {
  collectProviderCost,
  summarizeProviderCost,
} from "../src/lib/studio-project-alpha/cost-telemetry";

const CAMPAIGN_ID = "9c6c25f2-2562-4192-97a5-44536e45cd18";
const OWNER_USER_ID = "1ae91f0a-0d15-4a11-8db7-1de627f74ea7";
const ARTIFACT_ROOT_REL = `data/campaign-design-artifacts/${CAMPAIGN_ID}/dd_${CAMPAIGN_ID}_v2-rtu-flyer`;
const PRESERVE_VERSIONS = [4, 7, 8, 9, 10, 11, 12] as const;
/**
 * Maya is guarded by meaning plus digest stability across this run, not by a
 * pinned constant — see the same note in `customer-one-hybrid-remint-qa.mts`. A
 * pinned SHA goes stale on any legitimate write, and refreshing it to make the
 * script run looks exactly like refreshing it to hide drift.
 */
const MAYA_EXPECTED_INCLUDED = 1;
const MAYA_EXPECTED_USED = 1;
const OUT = path.join(
  process.cwd(),
  "docs/launch/studio-operating-project-alpha-hybrid-creative-certification-1/customer-one-hybrid-proofs",
);

async function loadEnvLocal() {
  try {
    const raw = await readFile(path.join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    /* optional */
  }
}

async function sha256File(abs: string): Promise<string | null> {
  if (!existsSync(abs)) return null;
  return createHash("sha256").update(await readFile(abs)).digest("hex");
}

async function preservedSnapshot(repoRoot: string) {
  const out: Record<string, string | null> = {};
  for (const version of PRESERVE_VERSIONS) {
    out[`v${version}`] = await sha256File(
      path.join(repoRoot, ARTIFACT_ROOT_REL, "renders", `v${version}`, "flyer.png"),
    );
  }
  return out;
}

async function main() {
  await loadEnvLocal();
  await mkdir(OUT, { recursive: true });
  const repoRoot = process.cwd();
  const mayaPath = path.join(
    repoRoot,
    "data",
    "campaigns",
    `${MAYA_PROTECTED_CAMPAIGN_ID}.json`,
  );

  const mayaShaBefore = await sha256File(mayaPath);
  const mayaBefore = await readCampaignEnvelope(MAYA_PROTECTED_CAMPAIGN_ID);
  const mayaTasksPath = path.join(
    repoRoot,
    "data",
    "campaign-tasks",
    `${MAYA_PROTECTED_CAMPAIGN_ID}.json`,
  );
  const mayaRows = existsSync(mayaTasksPath)
    ? ((
        JSON.parse(await readFile(mayaTasksPath, "utf8")) as {
          jobCorrectionUses?: Array<{
            idempotencyKey?: string;
            submittedAt?: string;
            campaignId?: string;
          }>;
        }
      ).jobCorrectionUses ?? [])
    : [];
  const mayaGenuineRows = mayaRows.filter((row) =>
    isGenuineProtectedCorrectionUse(row),
  );

  const before = (await readCampaignEnvelope(CAMPAIGN_ID))?.record;
  if (!before) throw new Error("Customer-One campaign missing");
  const observerBefore =
    before.dispatchExecution?.designRendererObserver?.results?.find(
      (result) => result.skuId === "v2-rtu-flyer",
    );
  const versionBefore = observerBefore?.renderVersion ?? null;
  const revisionBefore = before.revisionRoundsUsed ?? 0;
  const lockedMustInclude = String(
    before.routeMapIntake?.answers?.["v2-rtu-flyer:mustInclude"] ?? "",
  );
  const preservedBefore = await preservedSnapshot(repoRoot);

  const { result, ledger } = await collectProviderCost(() =>
    recoverPaidOperatingChain(before, {
      identitySession: {
        sessionCurrentCampaignId: CAMPAIGN_ID,
        sessionClientUserId: OWNER_USER_ID,
        intakeCampaignId: CAMPAIGN_ID,
      },
    }),
  );

  const after =
    (await readCampaignEnvelope(CAMPAIGN_ID))?.record ?? result.campaign;
  const observer = after.dispatchExecution?.designRendererObserver?.results?.find(
    (item) => item.skuId === "v2-rtu-flyer",
  );
  const summary = summarizeProviderCost(ledger);
  const preservedAfter = await preservedSnapshot(repoRoot);
  const preservedDrift = PRESERVE_VERSIONS.filter(
    (version) => preservedBefore[`v${version}`] !== preservedAfter[`v${version}`],
  ).map((version) => `v${version}`);

  const checks = {
    reusedExistingIdentity: observer?.invocationOutcome === "ALREADY_RENDERED",
    sameRenderVersion: observer?.renderVersion === versionBefore,
    noNewProviderCalls: summary.totalCalls === 0,
    zeroProviderCost: summary.totalCostUsd === 0,
    stillHybridMethod: observer?.productionMethodId === "image_plus_renderer",
    revisionStillZero: (after.revisionRoundsUsed ?? 0) === 0,
    revisionUnconsumed: (after.revisionRoundsUsed ?? 0) === revisionBefore,
    customerFactsUnchanged:
      String(after.routeMapIntake?.answers?.["v2-rtu-flyer:mustInclude"] ?? "") ===
      lockedMustInclude,
    preservedVersionsIntact: preservedDrift.length === 0,
    mayaProtectedTruthVerified:
      (mayaBefore?.record.revisionRoundsIncluded ?? 0) === MAYA_EXPECTED_INCLUDED &&
      (mayaBefore?.record.revisionRoundsUsed ?? 0) === MAYA_EXPECTED_USED &&
      mayaGenuineRows.length === 1 &&
      mayaRows.length === 1,
    mayaUntouchedDuringRun:
      mayaShaBefore != null && (await sha256File(mayaPath)) === mayaShaBefore,
  };

  const failed = Object.entries(checks)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  const report = {
    packageId: "STUDIO-OPERATING-PROJECT-ALPHA-HYBRID-CREATIVE-CERTIFICATION-1",
    proof: "customer-one hybrid idempotency (second invocation, unchanged execution)",
    campaignId: CAMPAIGN_ID,
    renderVersionBefore: versionBefore,
    renderVersionAfter: observer?.renderVersion ?? null,
    invocationOutcome: observer?.invocationOutcome ?? null,
    productionMethodId: observer?.productionMethodId ?? null,
    pngContentSha256: observer?.pngContentSha256 ?? null,
    providerCalls: summary.totalCalls,
    providerCostUsd: summary.totalCostUsd,
    preservedDrift,
    mayaProtectedRecord: {
      revisionRoundsIncluded: mayaBefore?.record.revisionRoundsIncluded ?? null,
      revisionRoundsUsed: mayaBefore?.record.revisionRoundsUsed ?? null,
      ledgerRows: mayaRows.length,
      genuineRows: mayaGenuineRows.length,
      sha256Before: mayaShaBefore,
      sha256After: await sha256File(mayaPath),
    },
    checks,
    ok: failed.length === 0,
    failed,
    at: new Date().toISOString(),
  };

  await writeFile(
    path.join(OUT, "customer-one-hybrid-idempotency-qa.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
