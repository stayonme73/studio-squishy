import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import { SOURCE_AUDIO_CUSTOMER_NOTICE } from "@/config/studio-source-audio-preflight-v1";

import { customerAcknowledgedSourceLimitation } from "./acknowledgement";
import { applyLightSourceAudioCleanup } from "./cleanup";
import { evaluateSourceAudioGate } from "./evaluate";
import type { SourceAudioPrepareResult, SourceAudioPreflightRecord } from "./types";

export function prepareCustomerSourceAudio(input: {
  repoRoot: string;
  sourceAbsolutePath: string;
  sourceRelativePath: string;
  acknowledgement?: SourceAudioPreflightRecord;
  workDirectory: string;
}): SourceAudioPrepareResult {
  const gate = evaluateSourceAudioGate({
    sourceAbsolutePath: input.sourceAbsolutePath,
  });

  if (gate.outcome === "REPLACEMENT_REQUIRED") {
    return {
      ok: false,
      outcome: gate.outcome,
      failureCode: "SOURCE_AUDIO_REPLACEMENT_REQUIRED",
      message: gate.reason,
    };
  }

  if (
    gate.outcome === "NOTICE_AND_CHOICE" &&
    !customerAcknowledgedSourceLimitation(input.acknowledgement, gate.outcome)
  ) {
    return {
      ok: false,
      outcome: gate.outcome,
      failureCode: "SOURCE_AUDIO_CUSTOMER_CHOICE_REQUIRED",
      message: SOURCE_AUDIO_CUSTOMER_NOTICE,
    };
  }

  if (gate.outcome === "PASS") {
    return {
      ok: true,
      outcome: "PASS",
      sourceAbsolutePath: input.sourceAbsolutePath,
      sourceRelativePath: input.sourceRelativePath,
      cleanupPassesAttempted: 0,
      cleanupKept: false,
      revertedToOriginal: false,
    };
  }

  mkdirSync(input.workDirectory, { recursive: true });
  const cleaned = applyLightSourceAudioCleanup({
    repoRoot: input.repoRoot,
    sourceAbsolutePath: input.sourceAbsolutePath,
    workDirectory: input.workDirectory,
  });
  const prepared = {
    ok: true as const,
    outcome: "NOTICE_AND_CHOICE" as const,
    sourceAbsolutePath: cleaned.selectedAbsolutePath,
    sourceRelativePath: cleaned.selectedRelativePath,
    cleanupPassesAttempted: cleaned.passesAttempted,
    cleanupKept: cleaned.cleanupKept,
    revertedToOriginal: cleaned.revertedToOriginal,
  };
  writeFileSync(
    path.join(input.workDirectory, "decision.json"),
    `${JSON.stringify(
      {
        packageId: gate.packageId,
        outcome: prepared.outcome,
        selectedSourceRelativePath: prepared.sourceRelativePath,
        cleanupPassesAttempted: prepared.cleanupPassesAttempted,
        cleanupKept: prepared.cleanupKept,
        revertedToOriginal: prepared.revertedToOriginal,
        customerNotice: gate.customerNotice,
      },
      null,
      2,
    )}\n`,
  );
  return prepared;
}

export function sourceAudioWorkDirectory(
  repoRoot: string,
  campaignId: string,
): string {
  return path.join(
    repoRoot,
    "data",
    "campaigns",
    campaignId,
    "source-audio-preflight",
  );
}
