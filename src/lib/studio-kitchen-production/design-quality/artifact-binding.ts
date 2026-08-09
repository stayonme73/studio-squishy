import { createHash } from "crypto";
import { existsSync, readFileSync, statSync } from "fs";
import path from "path";

import type { DesignArtifactRef, DesignQualityFinding } from "./types";

/** Stable SHA-256 of artifact bytes — binds QA evidence to the exact PNG reviewed. */
export function sha256File(absolutePath: string): string {
  const buf = readFileSync(absolutePath);
  return createHash("sha256").update(buf).digest("hex");
}

export function sha256FileRelative(repoRoot: string, relativePath: string): string {
  return sha256File(path.join(repoRoot, relativePath));
}

export type BoundArtifactProof = {
  relativePath: string;
  absolutePath: string;
  bytes: number;
  contentSha256: string;
  exists: boolean;
};

export function bindArtifactFile(
  repoRoot: string,
  relativePath: string,
): BoundArtifactProof {
  const absolutePath = path.join(repoRoot, relativePath);
  const exists = existsSync(absolutePath);
  if (!exists) {
    return {
      relativePath,
      absolutePath,
      bytes: 0,
      contentSha256: "",
      exists: false,
    };
  }
  const st = statSync(absolutePath);
  return {
    relativePath,
    absolutePath,
    bytes: st.size,
    contentSha256: sha256File(absolutePath),
    exists: true,
  };
}

/**
 * Deterministic binding check: declared contentSha256 must match bytes on disk.
 * Does not visually recognize logos — pairs with renderedIdentityMatchesDeclaredSource attestation.
 */
export function evaluateArtifactBindings(input: {
  repoRoot: string;
  artifacts: readonly DesignArtifactRef[];
  requireBinding: boolean;
}): { ok: boolean; findings: DesignQualityFinding[]; proofs: BoundArtifactProof[] } {
  const findings: DesignQualityFinding[] = [];
  const proofs: BoundArtifactProof[] = [];

  for (const artifact of input.artifacts) {
    const proof = bindArtifactFile(input.repoRoot, artifact.relativePath);
    proofs.push(proof);

    if (!proof.exists) {
      findings.push({
        id: `bind_missing_${artifact.id}`,
        severity: "fail",
        checkKind: "artifact_binding",
        message: `Artifact ${artifact.id} file missing at ${artifact.relativePath}`,
      });
      continue;
    }

    if (input.requireBinding) {
      const declared = artifact.contentSha256?.trim().toLowerCase();
      if (!declared) {
        findings.push({
          id: `bind_hash_missing_${artifact.id}`,
          severity: "fail",
          checkKind: "artifact_binding",
          message: `Artifact ${artifact.id} missing contentSha256 — QA cannot certify unbound metadata`,
        });
      } else if (declared !== proof.contentSha256) {
        findings.push({
          id: `bind_hash_mismatch_${artifact.id}`,
          severity: "fail",
          checkKind: "artifact_binding",
          message: `Artifact ${artifact.id} contentSha256 does not match file bytes at ${artifact.relativePath}`,
        });
      }

      if (!artifact.approvedIdentitySourceId?.trim()) {
        findings.push({
          id: `bind_identity_source_${artifact.id}`,
          severity: "fail",
          checkKind: "artifact_binding",
          message: `Artifact ${artifact.id} missing approvedIdentitySourceId (production must declare which approved identity source was used)`,
        });
      }
    }
  }

  return { ok: findings.length === 0, findings, proofs };
}
