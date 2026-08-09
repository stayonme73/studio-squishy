/**
 * Persist generated voice bytes as a bound Kitchen artifact.
 * Provider metadata alone is never treated as the artifact.
 */

import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

import type { VoiceProductionSku } from "./contracts";

export const VOICE_INTEGRATION_ARTIFACT_ROOT =
  "docs/launch/kitchen-voice-integration-1/artifacts" as const;

export type VoiceArtifactLabel =
  | "INTERNAL PRODUCTION TEST — NOT CUSTOMER DELIVERABLE"
  | "CERTIFICATION FIXTURE / INTERNAL TEST / NOT CUSTOMER DELIVERABLE"
  | "PRODUCTION ARTIFACT — AWAITING QA";

export type PersistedVoiceArtifact = {
  relativePath: string;
  absolutePath: string;
  contentSha256: string;
  byteLength: number;
  extension: "mp3" | "wav";
  scriptVersionId: string;
  skuId: VoiceProductionSku;
  campaignId: string;
  provider: "elevenlabs";
  providerVoiceId: string;
  providerModelId: string;
  providerRequestId?: string;
  generatedAt: string;
  qaState: "qa_ready";
  label: VoiceArtifactLabel;
};

export function sha256Bytes(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function persistVoiceArtifactBytes(input: {
  repoRoot: string;
  campaignId: string;
  skuId: VoiceProductionSku;
  scriptVersionId: string;
  extension: "mp3" | "wav";
  audioBytes: Buffer;
  providerVoiceId: string;
  providerModelId: string;
  providerRequestId?: string;
  generatedAt?: string;
  /** Internal test generations must use the internal label. */
  internalTest: boolean;
  /** Certification fixture label (takes precedence over internalTest). */
  certificationFixture?: boolean;
  /** Override default integration artifact root. */
  artifactRoot?: string;
  fileStem?: string;
}): PersistedVoiceArtifact | { error: string; code: "persistence_failure" | "empty_audio" } {
  if (!input.audioBytes.byteLength) {
    return { error: "Cannot persist empty audio bytes", code: "empty_audio" };
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const hash = sha256Bytes(input.audioBytes);
  const stem =
    input.fileStem ??
    `${input.skuId}_${input.scriptVersionId}_${hash.slice(0, 12)}`;
  const root = input.artifactRoot ?? VOICE_INTEGRATION_ARTIFACT_ROOT;
  const relativePath = path
    .join(root, input.campaignId, `${stem}.${input.extension}`)
    .replace(/\\/g, "/");
  const absolutePath = path.join(input.repoRoot, relativePath);

  try {
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, input.audioBytes);
  } catch {
    return { error: `Failed to write audio artifact at ${relativePath}`, code: "persistence_failure" };
  }

  const label: VoiceArtifactLabel = input.certificationFixture
    ? "CERTIFICATION FIXTURE / INTERNAL TEST / NOT CUSTOMER DELIVERABLE"
    : input.internalTest
      ? "INTERNAL PRODUCTION TEST — NOT CUSTOMER DELIVERABLE"
      : "PRODUCTION ARTIFACT — AWAITING QA";

  return {
    relativePath,
    absolutePath,
    contentSha256: hash,
    byteLength: input.audioBytes.byteLength,
    extension: input.extension,
    scriptVersionId: input.scriptVersionId,
    skuId: input.skuId,
    campaignId: input.campaignId,
    provider: "elevenlabs",
    providerVoiceId: input.providerVoiceId,
    providerModelId: input.providerModelId,
    providerRequestId: input.providerRequestId,
    generatedAt,
    qaState: "qa_ready",
    label,
  };
}
