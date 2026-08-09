/**
 * KITCHEN-LANDING-PAGE-PRODUCTION-1 — generate/publish landing pages.
 * Package sealed CUSTOMER READY WITH LIMITS (Owner visual QA closed).
 * Never prints API secrets. Does not grant unlimited Customer Ready / CERTIFIED.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import {
  buildCedarLaneLandingPacketV1,
  buildCedarLaneLandingPacketV2,
  buildCedarLaneLandingPacketV3,
  buildCedarLaneLandingPacketV4,
  landingPublishCredentialSnapshot,
  loadAuthoritativeRmJ005Contract,
  runLandingPageProductionPipeline,
} from "../src/lib/studio-kitchen-production/landing-page";

function loadEnvLocal(repoRoot: string) {
  const envPath = path.join(repoRoot, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
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
}

const repoRoot = path.resolve(__dirname, "..");
loadEnvLocal(repoRoot);

const evidenceDir = path.join(
  repoRoot,
  "docs/launch/kitchen-landing-page-production-1/artifacts",
);
mkdirSync(evidenceDir, { recursive: true });

async function main() {
  const contract = loadAuthoritativeRmJ005Contract();
  const creds = landingPublishCredentialSnapshot();
  const mode = process.argv.includes("--v4-only")
    ? "v4-only"
    : process.argv.includes("--v3-only")
      ? "v3-only"
      : "full";

  const summary: Record<string, unknown> = {
    package: "KITCHEN-LANDING-PAGE-PRODUCTION-1",
    mode,
    startingControlPoint: "dc82de7b9dc636ab593893327f511fe697aa829f",
    skuId: "rm-j005",
    contract: {
      serviceName: contract.serviceName,
      readiness: contract.productionReadiness,
      formPromised: contract.formPromised,
      customDomainPromised: contract.customDomainPromised,
      discrepancies: contract.discrepancies,
    },
    publishCredentialsConfigured: creds.configured,
    purchaseOccurred: false,
    tagiaEditing: false,
    perCustomerEngineeringRequired: false,
    customerReady: false,
    certified: false,
    startedAt: new Date().toISOString(),
  };

  const workPacketDir = path.join(
    repoRoot,
    "docs/launch/kitchen-landing-page-production-1/work-packet",
  );
  mkdirSync(workPacketDir, { recursive: true });

  if (mode === "full") {
    const v1Packet = buildCedarLaneLandingPacketV1(repoRoot);
    writeFileSync(
      path.join(workPacketDir, "work-packet-v1.json"),
      `${JSON.stringify(v1Packet, null, 2)}\n`,
    );
    summary.v1 = await runLandingPageProductionPipeline({
      repoRoot,
      packet: v1Packet,
    });

    const v2Packet = buildCedarLaneLandingPacketV2(repoRoot);
    writeFileSync(
      path.join(workPacketDir, "work-packet-v2.json"),
      `${JSON.stringify(v2Packet, null, 2)}\n`,
    );
    summary.v2 = await runLandingPageProductionPipeline({
      repoRoot,
      packet: v2Packet,
    });
  }

  if (mode === "full" || mode === "v3-only") {
    const v3Packet = buildCedarLaneLandingPacketV3(repoRoot);
    writeFileSync(
      path.join(workPacketDir, "work-packet-v3.json"),
      `${JSON.stringify(v3Packet, null, 2)}\n`,
    );
    summary.v3 = await runLandingPageProductionPipeline({
      repoRoot,
      packet: v3Packet,
    });
  }

  if (mode === "full" || mode === "v4-only") {
    const v4Packet = buildCedarLaneLandingPacketV4(repoRoot);
    writeFileSync(
      path.join(workPacketDir, "work-packet-v4.json"),
      `${JSON.stringify(v4Packet, null, 2)}\n`,
    );
    const v4 = await runLandingPageProductionPipeline({
      repoRoot,
      packet: v4Packet,
    });
    summary.v4 = v4;

    const published =
      v4.verdict === "LANDING_PAGE_PRODUCTION_PROVEN" && Boolean(v4.publicUrl);

    summary.packageVerdict = published
      ? "LANDING PAGE PRODUCTION: PROVEN"
      : v4.ok
        ? "LANDING PAGE PRODUCTION: PARTIAL — PUBLISH BLOCKER"
        : "LANDING PAGE PRODUCTION: NOT PROVEN";

    summary.desktopVisualQa = "PASS";
    summary.tabletVisualQa = "PASS";
    summary.mobileVisualQa =
      "PASS WITH ONE CORRECTION — V4 subline wrap applied; Owner re-check pending";
    summary.readiness = published
      ? "INTEGRATED / QA READY / NOT CUSTOMER READY / NOT CERTIFIED"
      : "PARTIAL — generation/QA proven; public publish blocked / NOT CUSTOMER READY / NOT CERTIFIED";

    summary.finishedAt = new Date().toISOString();

    writeFileSync(
      path.join(evidenceDir, "run-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    console.log(JSON.stringify(summary, null, 2));
    process.exit(v4.ok ? 0 : 1);
  }

  const v3 = summary.v3 as { ok?: boolean; verdict?: string; publicUrl?: string } | undefined;
  const published =
    v3?.verdict === "LANDING_PAGE_PRODUCTION_PROVEN" && Boolean(v3.publicUrl);
  summary.packageVerdict = published
    ? "LANDING PAGE PRODUCTION: PROVEN"
    : v3?.ok
      ? "LANDING PAGE PRODUCTION: PARTIAL — PUBLISH BLOCKER"
      : "LANDING PAGE PRODUCTION: NOT PROVEN";
  summary.finishedAt = new Date().toISOString();
  writeFileSync(
    path.join(evidenceDir, "run-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(JSON.stringify(summary, null, 2));
  process.exit(v3?.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
