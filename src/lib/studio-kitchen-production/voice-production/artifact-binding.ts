import { createHash } from "crypto";
import { existsSync, readFileSync, statSync } from "fs";
import path from "path";

import type { AudioArtifactRef, AudioQualityFinding } from "./types";

/** Stable SHA-256 of audio bytes — binds QA evidence to the exact file reviewed. */
export function sha256AudioFile(absolutePath: string): string {
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
}

export function sha256AudioFileRelative(repoRoot: string, relativePath: string): string {
  return sha256AudioFile(path.join(repoRoot, relativePath));
}

export type BoundAudioArtifactProof = {
  relativePath: string;
  absolutePath: string;
  bytes: number;
  contentSha256: string;
  exists: boolean;
  scriptVersionId?: string;
};

export function bindAudioArtifactFile(
  repoRoot: string,
  relativePath: string,
  scriptVersionId?: string,
): BoundAudioArtifactProof {
  const absolutePath = path.join(repoRoot, relativePath);
  const exists = existsSync(absolutePath);
  if (!exists) {
    return {
      relativePath,
      absolutePath,
      bytes: 0,
      contentSha256: "",
      exists: false,
      scriptVersionId,
    };
  }
  const st = statSync(absolutePath);
  return {
    relativePath,
    absolutePath,
    bytes: st.size,
    contentSha256: sha256AudioFile(absolutePath),
    exists: true,
    scriptVersionId,
  };
}

/**
 * Deterministic binding: declared contentSha256 + scriptVersionId must match disk + submission.
 * Does not prove listening quality — pairs with judgment attestations.
 */
export function evaluateAudioArtifactBindings(input: {
  repoRoot: string;
  artifacts: readonly AudioArtifactRef[];
  scriptVersionId: string;
  requireBinding: boolean;
}): { ok: boolean; findings: AudioQualityFinding[]; proofs: BoundAudioArtifactProof[] } {
  const findings: AudioQualityFinding[] = [];
  const proofs: BoundAudioArtifactProof[] = [];

  for (const artifact of input.artifacts) {
    const proof = bindAudioArtifactFile(
      input.repoRoot,
      artifact.relativePath,
      artifact.scriptVersionId,
    );
    proofs.push(proof);

    if (!proof.exists) {
      findings.push({
        id: `bind_missing_${artifact.id}`,
        severity: "fail",
        checkKind: "artifact_binding",
        message: `Audio artifact ${artifact.id} file missing at ${artifact.relativePath}`,
      });
      continue;
    }

    if (artifact.scriptVersionId !== input.scriptVersionId) {
      findings.push({
        id: `bind_script_${artifact.id}`,
        severity: "fail",
        checkKind: "artifact_binding",
        message: `Audio artifact ${artifact.id} scriptVersionId does not match approved script version`,
      });
    }

    if (input.requireBinding) {
      const declared = artifact.contentSha256?.trim().toLowerCase();
      if (!declared) {
        findings.push({
          id: `bind_hash_missing_${artifact.id}`,
          severity: "fail",
          checkKind: "artifact_binding",
          message: `Audio artifact ${artifact.id} missing contentSha256`,
        });
      } else if (declared !== proof.contentSha256) {
        findings.push({
          id: `bind_hash_mismatch_${artifact.id}`,
          severity: "fail",
          checkKind: "artifact_binding",
          message: `Audio artifact ${artifact.id} contentSha256 does not match file bytes`,
        });
      }
      if (proof.bytes <= 0) {
        findings.push({
          id: `bind_empty_${artifact.id}`,
          severity: "fail",
          checkKind: "phantom_file",
          message: `Audio artifact ${artifact.id} is empty`,
        });
      }
    }
  }

  return { ok: findings.length === 0, findings, proofs };
}

/** Build a bound AudioArtifactRef from a real on-disk file (fails if missing). */
export function registerBoundAudioArtifact(input: {
  repoRoot: string;
  id: string;
  relativePath: string;
  scriptVersionId: string;
  extension: string;
}): AudioArtifactRef | { error: string } {
  const proof = bindAudioArtifactFile(
    input.repoRoot,
    input.relativePath,
    input.scriptVersionId,
  );
  if (!proof.exists || !proof.contentSha256) {
    return { error: `Cannot register missing audio at ${input.relativePath}` };
  }
  return {
    id: input.id,
    relativePath: input.relativePath,
    extension: input.extension.replace(/^\./, "").toLowerCase(),
    contentSha256: proof.contentSha256,
    scriptVersionId: input.scriptVersionId,
    byteLength: proof.bytes,
  };
}
