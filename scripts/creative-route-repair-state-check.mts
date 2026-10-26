/**
 * Read-only: what the creative-path repair left Customer-One and Maya holding.
 *
 * Makes no provider call and writes nothing. Run before and after the repair to show that
 * changing how a run is *counted* changed no artifact, no revision, and no freeze.
 */

import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";

const CUSTOMER_ONE = "9c6c25f2-2562-4192-97a5-44536e45cd18";
const MAYA = "716a15b6-d8d6-436c-8f84-9e8b40d2f959";

type Loop = {
  status: string;
  attempts: unknown[];
  sequenceStartedAtAttempt?: number;
  productionFactFingerprint: string | null;
};

function report(label: string, campaignId: string): void {
  const root = path.join("data/campaign-design-artifacts", campaignId);
  if (!existsSync(root)) {
    console.log(`${label}: no artifact root`);
    return;
  }
  for (const dispatchDir of readdirSync(root)) {
    const rendersDir = path.join(root, dispatchDir, "renders");
    if (!existsSync(rendersDir)) continue;
    const versions = readdirSync(rendersDir)
      .map((name) => /^v(\d+)$/.exec(name)?.[1])
      .filter((n): n is string => Boolean(n))
      .map(Number)
      .sort((a, b) => a - b);
    const loopAbs = path.join(root, dispatchDir, "internal-production-loop.json");
    let loop: Loop | null = null;
    try {
      loop = JSON.parse(readFileSync(loopAbs, "utf8")) as Loop;
    } catch {
      loop = null;
    }
    console.log(
      [
        label,
        dispatchDir,
        `versions=${versions.length ? `v${versions[0]}..v${versions[versions.length - 1]}` : "none"}`,
        `count=${versions.length}`,
        loop
          ? `loop=${loop.status} attempts=${loop.attempts.length} sequenceStartedAtAttempt=${String(loop.sequenceStartedAtAttempt)}`
          : "loop=absent",
      ].join(" | "),
    );
  }
}

report("Customer-One", CUSTOMER_ONE);
report("Maya", MAYA);

const envelopeCandidates = [
  `data/campaigns/${CUSTOMER_ONE}.json`,
  `data/campaigns/${MAYA}.json`,
];
for (const rel of envelopeCandidates) {
  if (!existsSync(rel)) {
    console.log(`${rel}: absent`);
    continue;
  }
  const envelope = JSON.parse(readFileSync(rel, "utf8")) as {
    record?: {
      campaignId?: string;
      revisionRoundsUsed?: number;
      revisionRoundsIncluded?: number;
      productionFreeze?: { status?: string; renderVersion?: number; doNotRemint?: boolean };
    };
  };
  const record = envelope.record ?? {};
  console.log(
    [
      record.campaignId,
      `revisionRoundsUsed=${record.revisionRoundsUsed}`,
      `revisionRoundsIncluded=${record.revisionRoundsIncluded}`,
      `freeze=${record.productionFreeze?.status ?? "none"}`,
      `freezeVersion=${record.productionFreeze?.renderVersion ?? "none"}`,
      `doNotRemint=${record.productionFreeze?.doNotRemint ?? "none"}`,
    ].join(" | "),
  );
}
