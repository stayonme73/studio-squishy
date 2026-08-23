/**
 * Bound certification artifact registry — populated after live generation.
 * The file reviewed must be the file certified.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

import {
  CERT_VOICE_ARTIFACT_ROOT,
  CERT_VOICE_CAMPAIGN_ID,
  CERT_VOICE_FIXTURE_LABEL,
  CERT_VOICE_PROVIDER,
  CERT_VOICE_SCRIPT_VERSION_ID,
} from "./fixtures";

export type CertVoiceBoundArtifact = {
  id: string;
  relativePath: string;
  contentSha256: string;
  byteLength: number;
  extension: "mp3";
  scriptVersionId: string;
  campaignId: string;
  skuId: "ap-001";
  provider: "elevenlabs";
  providerModelId: string;
  providerVoiceId: string;
  providerOutputFormat: "mp3_44100_128";
  generatedAt: string;
  label: typeof CERT_VOICE_FIXTURE_LABEL;
  qaState: "qa_ready" | "qa_pass";
  ownerListeningApproval: "pending" | "pass";
  ownerListeningApprovedAt?: string;
  customerReadinessLabel?: string;
  wavCertified?: boolean;
};

/** Written by live cert generation; read by tests/report. */
export const CERT_VOICE_BINDING_MANIFEST_REL =
  `${CERT_VOICE_ARTIFACT_ROOT}/BINDING-MANIFEST.json` as const;

export function readCertVoiceBindingManifest(
  repoRoot = process.cwd(),
): CertVoiceBoundArtifact | null {
  const abs = path.join(repoRoot, CERT_VOICE_BINDING_MANIFEST_REL);
  if (!existsSync(abs)) return null;
  const parsed = JSON.parse(readFileSync(abs, "utf8")) as CertVoiceBoundArtifact;
  return parsed;
}

export function expectedCertVoiceDefaults(): Pick<
  CertVoiceBoundArtifact,
  | "campaignId"
  | "scriptVersionId"
  | "skuId"
  | "provider"
  | "providerModelId"
  | "providerVoiceId"
  | "providerOutputFormat"
  | "label"
  | "qaState"
  | "ownerListeningApproval"
  | "customerReadinessLabel"
  | "wavCertified"
> {
  return {
    campaignId: CERT_VOICE_CAMPAIGN_ID,
    scriptVersionId: CERT_VOICE_SCRIPT_VERSION_ID,
    skuId: "ap-001",
    provider: CERT_VOICE_PROVIDER.provider,
    providerModelId: CERT_VOICE_PROVIDER.modelId,
    providerVoiceId: CERT_VOICE_PROVIDER.voiceId,
    providerOutputFormat: CERT_VOICE_PROVIDER.outputFormat,
    label: CERT_VOICE_FIXTURE_LABEL,
    qaState: "qa_pass",
    ownerListeningApproval: "pass",
    customerReadinessLabel: "CUSTOMER READY WITH LIMITS — MP3",
    wavCertified: false,
  };
}
