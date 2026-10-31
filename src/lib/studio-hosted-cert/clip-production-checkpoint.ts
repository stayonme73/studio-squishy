import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import type { ClipCustomerOutcome } from "@/lib/studio-clip-repurposing/customer-outcome";
import type { ClipProducedFile } from "@/lib/studio-clip-repurposing/customer-pipeline";

export const HOSTED_CLIP_PRODUCTION_CHECKPOINT_VERSION = 1 as const;

export type HostedClipProductionCheckpointStage =
  | "prepare"
  | "discover"
  | "render"
  | "finalize"
  | "complete";

export type HostedClipProductionCheckpoint = {
  version: typeof HOSTED_CLIP_PRODUCTION_CHECKPOINT_VERSION;
  campaignId: string;
  dispatchId: string;
  intakeFingerprint: string;
  stage: HostedClipProductionCheckpointStage;
  sourceRelativePath: string;
  ctaText: string;
  sourceDurationSeconds?: number;
  outcome?: ClipCustomerOutcome;
  selectedClipIds: string[];
  completedClips: ClipProducedFile[];
  nextRenderIndex: number;
  updatedAt: string;
  /** Prevents overlapping serverless chunk workers on the same campaign. */
  leaseUntil?: string | null;
};

export function clipFactoryRoot(repoRoot: string, campaignId: string): string {
  return path.join(repoRoot, "data/campaign-design-artifacts", campaignId, "clip-factory");
}

export function checkpointPath(repoRoot: string, campaignId: string): string {
  return path.join(clipFactoryRoot(repoRoot, campaignId), "production-checkpoint.json");
}

export function readHostedClipProductionCheckpoint(
  repoRoot: string,
  campaignId: string,
): HostedClipProductionCheckpoint | null {
  const abs = checkpointPath(repoRoot, campaignId);
  if (!existsSync(abs)) return null;
  try {
    const parsed = JSON.parse(
      readFileSync(abs, "utf8"),
    ) as HostedClipProductionCheckpoint;
    if (parsed?.version !== HOSTED_CLIP_PRODUCTION_CHECKPOINT_VERSION) return null;
    if (parsed.campaignId !== campaignId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeHostedClipProductionCheckpoint(
  repoRoot: string,
  checkpoint: HostedClipProductionCheckpoint,
): void {
  const abs = checkpointPath(repoRoot, checkpoint.campaignId);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, `${JSON.stringify(checkpoint, null, 2)}\n`);
}
