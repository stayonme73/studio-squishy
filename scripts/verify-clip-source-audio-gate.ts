import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

import { studioClipSourceAudioGateHardeningV1 as hardening } from "@/config/studio-clip-source-audio-gate-hardening-v1";
import { evaluateSourceAudioGate } from "@/lib/studio-source-audio-preflight/evaluate";
import {
  fixturePath,
  writeCleanTalkingHeadFixture,
  writeClippedTalkingHeadFixture,
  writeFlattenedTalkingHeadFixture,
  writeIsolatedNeedleTalkingHeadFixture,
  writeNoisyTalkingHeadFixture,
  writeRepeatedClippingTalkingHeadFixture,
  writeSilentTalkingHeadFixture,
} from "@/lib/studio-source-audio-preflight/fixtures";

function writeJson(abs: string, value: unknown) {
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const fixtures = {
    clean: writeCleanTalkingHeadFixture(fixturePath(repoRoot, "verify-clean.mp4")),
    noisy: writeNoisyTalkingHeadFixture(fixturePath(repoRoot, "verify-noisy.mp4")),
    silent: writeSilentTalkingHeadFixture(fixturePath(repoRoot, "verify-silent.mp4")),
    clippedLegacy: writeClippedTalkingHeadFixture(fixturePath(repoRoot, "verify-clipped.mp4")),
    isolatedNeedles: writeIsolatedNeedleTalkingHeadFixture(
      fixturePath(repoRoot, "verify-needles.mp4"),
    ),
    repeated: writeRepeatedClippingTalkingHeadFixture(
      fixturePath(repoRoot, "verify-repeated.mp4"),
    ),
    flattened: writeFlattenedTalkingHeadFixture(fixturePath(repoRoot, "verify-flat.mp4")),
  };
  const fixtureResults = Object.fromEntries(
    Object.entries(fixtures).map(([name, abs]) => {
      const gate = evaluateSourceAudioGate({ sourceAbsolutePath: abs });
      return [
        name,
        {
          outcome: gate.outcome,
          clippingKind: gate.measurement.clippingKind ?? null,
          maxVolumeDb: gate.measurement.maxVolumeDb,
          reason: gate.reason,
        },
      ];
    }),
  );

  const sourceAbs = path.join(repoRoot, hardening.evidenceSourceRelativePath);
  const live = existsSync(sourceAbs)
    ? evaluateSourceAudioGate({ sourceAbsolutePath: sourceAbs })
    : null;

  const proof = {
    packageId: hardening.packageId,
    oldRule: hardening.oldRule,
    newRule: hardening.newRule,
    fixtureResults,
    liveSource: live
      ? {
          relativePath: hardening.evidenceSourceRelativePath,
          outcome: live.outcome,
          clippingKind: live.measurement.clippingKind ?? null,
          maxVolumeDb: live.measurement.maxVolumeDb,
          hitCount: live.measurement.clipping?.hitCount ?? null,
          clusterCount: live.measurement.clipping?.clusters.length ?? null,
          reason: live.reason,
          sourceUsable: live.outcome !== "REPLACEMENT_REQUIRED",
        }
      : { missing: true, sourceUsable: false },
    regression: {
      falsePositiveProtection:
        (fixtureResults.isolatedNeedles as { outcome: string }).outcome !==
        "REPLACEMENT_REQUIRED",
      truePositiveLegacyClipped:
        (fixtureResults.clippedLegacy as { outcome: string }).outcome ===
        "REPLACEMENT_REQUIRED",
      truePositiveFlattened:
        (fixtureResults.flattened as { outcome: string }).outcome ===
        "REPLACEMENT_REQUIRED",
      truePositiveRepeated:
        (fixtureResults.repeated as { outcome: string }).outcome ===
        "REPLACEMENT_REQUIRED",
      cleanStillPass: (fixtureResults.clean as { outcome: string }).outcome === "PASS",
      silentStillReject:
        (fixtureResults.silent as { outcome: string }).outcome ===
        "REPLACEMENT_REQUIRED",
      noisyStillNotice:
        (fixtureResults.noisy as { outcome: string }).outcome === "NOTICE_AND_CHOICE",
    },
  };
  writeJson(path.join(repoRoot, hardening.stampDir, "GATE-VERIFY.json"), proof);
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
  const regressionPass = Object.values(proof.regression).every(Boolean);
  if (!regressionPass || !proof.liveSource || !("sourceUsable" in proof.liveSource) || !proof.liveSource.sourceUsable) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
