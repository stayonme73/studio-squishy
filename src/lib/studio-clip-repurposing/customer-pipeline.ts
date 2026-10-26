/**
 * Customer-journey runner around the frozen Clip factory.
 * Inject discover/produce in tests. Does not reopen ranking or per-clip internals.
 */

import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";
import { discoverClipSet } from "./set-discovery";
import {
  clipSetWouldQuietlyUnderDeliver,
  resolveClipRepurposingCustomerOutcome,
  type ClipCustomerOutcome,
} from "./customer-outcome";
import type {
  LongSourceSentences,
  SetCandidate,
  SetDiscoveryResult,
  SetRevision,
} from "./types";

export type ClipProducedFile = {
  clipId: string;
  idea: string;
  relativePath: string;
  contentSha256: string;
  width: 1080;
  height: 1920;
};

export type ClipCustomerPipelineResult =
  | {
      ok: true;
      outcome: ClipCustomerOutcome;
      selected: readonly SetCandidate[];
      alternates: readonly SetCandidate[];
      files: readonly ClipProducedFile[];
      revisionApplied: boolean;
    }
  | {
      ok: false;
      failureCode: string;
      message: string;
      outcome?: ClipCustomerOutcome;
    };

export type ClipCustomerPipelineInput = {
  sourceDurationSeconds: number;
  sentences: LongSourceSentences["sentences"];
  discover?: (source: LongSourceSentences) => SetDiscoveryResult;
  produce?: (input: {
    selected: readonly SetCandidate[];
    outcome: ClipCustomerOutcome;
    applyRevision?: boolean;
    setRevision?: SetRevision;
  }) => Promise<readonly ClipProducedFile[]> | readonly ClipProducedFile[];
  applyRevision?: boolean;
  setRevision?: SetRevision;
  skipDurationGate?: boolean;
};

const MIN_SOURCE = studioClipRepurposingBuildV1.proposedOffer.minSourceSeconds;
const MAX_SOURCE = studioClipRepurposingBuildV1.proposedOffer.maxSourceSeconds;

export async function runClipRepurposingCustomerPipeline(
  input: ClipCustomerPipelineInput,
): Promise<ClipCustomerPipelineResult> {
  if (
    !input.skipDurationGate &&
    (input.sourceDurationSeconds < MIN_SOURCE ||
      input.sourceDurationSeconds > MAX_SOURCE)
  ) {
    return {
      ok: false,
      failureCode: "SOURCE_DURATION_OUT_OF_RANGE",
      message:
        "Clip Repurposing needs one native-vertical English talking-head between 15 and 60 minutes.",
    };
  }

  const discover = input.discover ?? discoverClipSet;
  const discovered = discover({
    sourceDurationSeconds: input.sourceDurationSeconds,
    sentences: input.sentences,
  });
  const outcome = resolveClipRepurposingCustomerOutcome(discovered.viableCount);

  if (outcome.fileCount === 0) {
    return {
      ok: true,
      outcome,
      selected: discovered.selected,
      alternates: discovered.alternates,
      files: [],
      revisionApplied: false,
    };
  }

  const selected = discovered.selected.slice(0, outcome.fileCount);
  if (!input.produce) {
    return {
      ok: false,
      failureCode: "PRODUCTION_NOT_INJECTED",
      message:
        "Clip Repurposing production must be invoked through the dedicated set factory. Staging tests inject produce.",
      outcome,
    };
  }

  const files = await input.produce({
    selected,
    outcome,
    applyRevision: input.applyRevision,
    setRevision: input.setRevision,
  });

  if (
    clipSetWouldQuietlyUnderDeliver({
      viableCount: outcome.viableCount,
      producedFileCount: files.length,
      chargedCents: outcome.settlementPriceCents,
    })
  ) {
    return {
      ok: false,
      failureCode: "UNDER_DELIVER_FORBIDDEN",
      message:
        "Do not charge the $549 package and deliver fewer than three clips. Use the frozen customer remedy.",
      outcome,
    };
  }

  if (files.length !== outcome.fileCount) {
    return {
      ok: false,
      failureCode: "FILE_COUNT_MISMATCH",
      message: "Produced files must match the frozen customer remedy.",
      outcome,
    };
  }

  return {
    ok: true,
    outcome,
    selected,
    alternates: discovered.alternates,
    files,
    revisionApplied: Boolean(input.applyRevision),
  };
}
