import { createHash } from "crypto";
import { existsSync, readFileSync, statSync } from "fs";
import path from "path";

import type { VideoArtifactRef, VideoQualityFinding } from "./types";

/** Stable SHA-256 of video bytes — binds QA evidence to the exact file reviewed. */
export function sha256VideoFile(absolutePath: string): string {
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
}

export function sha256VideoFileRelative(repoRoot: string, relativePath: string): string {
  return sha256VideoFile(path.join(repoRoot, relativePath));
}

export type BoundVideoArtifactProof = {
  relativePath: string;
  absolutePath: string;
  bytes: number;
  contentSha256: string;
  exists: boolean;
  scriptVersionId?: string;
  campaignId?: string;
  skuId?: string;
};

export function bindVideoArtifactFile(
  repoRoot: string,
  relativePath: string,
  meta?: { scriptVersionId?: string; campaignId?: string; skuId?: string },
): BoundVideoArtifactProof {
  const absolutePath = path.join(repoRoot, relativePath);
  const exists = existsSync(absolutePath);
  if (!exists) {
    return {
      relativePath,
      absolutePath,
      bytes: 0,
      contentSha256: "",
      exists: false,
      scriptVersionId: meta?.scriptVersionId,
      campaignId: meta?.campaignId,
      skuId: meta?.skuId,
    };
  }
  const st = statSync(absolutePath);
  return {
    relativePath,
    absolutePath,
    bytes: st.size,
    contentSha256: sha256VideoFile(absolutePath),
    exists: true,
    scriptVersionId: meta?.scriptVersionId,
    campaignId: meta?.campaignId,
    skuId: meta?.skuId,
  };
}

/**
 * Deterministic binding: path + hash + script + campaign + SKU must match.
 * Does not prove visual quality — pairs with judgment attestations.
 */
export function evaluateVideoArtifactBindings(input: {
  repoRoot: string;
  artifacts: readonly VideoArtifactRef[];
  scriptVersionId: string;
  campaignId: string;
  skuId: string;
  requireBinding: boolean;
}): { ok: boolean; findings: VideoQualityFinding[]; proofs: BoundVideoArtifactProof[] } {
  const findings: VideoQualityFinding[] = [];
  const proofs: BoundVideoArtifactProof[] = [];

  for (const artifact of input.artifacts) {
    const proof = bindVideoArtifactFile(input.repoRoot, artifact.relativePath, {
      scriptVersionId: artifact.scriptVersionId,
      campaignId: artifact.campaignId,
      skuId: artifact.skuId,
    });
    proofs.push(proof);

    if (!proof.exists) {
      findings.push({
        id: `bind_missing_${artifact.id}`,
        severity: "fail",
        checkKind: "artifact_binding",
        message: `Video artifact ${artifact.id} file missing at ${artifact.relativePath}`,
      });
      continue;
    }

    if (artifact.scriptVersionId !== input.scriptVersionId) {
      findings.push({
        id: `bind_script_${artifact.id}`,
        severity: "fail",
        checkKind: "script_version",
        message: `Video artifact ${artifact.id} scriptVersionId does not match approved script version`,
      });
    }

    if (artifact.campaignId !== input.campaignId) {
      findings.push({
        id: `bind_campaign_${artifact.id}`,
        severity: "fail",
        checkKind: "campaign_scope",
        message: `Video artifact ${artifact.id} campaignId does not match job campaign`,
      });
    }

    if (artifact.skuId !== input.skuId) {
      findings.push({
        id: `bind_sku_${artifact.id}`,
        severity: "fail",
        checkKind: "sku_scope",
        message: `Video artifact ${artifact.id} skuId does not match job SKU`,
      });
    }

    if (input.requireBinding) {
      const declared = artifact.contentSha256?.trim().toLowerCase();
      if (!declared) {
        findings.push({
          id: `bind_hash_missing_${artifact.id}`,
          severity: "fail",
          checkKind: "artifact_binding",
          message: `Video artifact ${artifact.id} missing contentSha256`,
        });
      } else if (declared !== proof.contentSha256) {
        findings.push({
          id: `bind_hash_mismatch_${artifact.id}`,
          severity: "fail",
          checkKind: "artifact_binding",
          message: `Video artifact ${artifact.id} contentSha256 does not match file bytes`,
        });
      }
      if (proof.bytes <= 0) {
        findings.push({
          id: `bind_empty_${artifact.id}`,
          severity: "fail",
          checkKind: "phantom_file",
          message: `Video artifact ${artifact.id} is empty`,
        });
      }
    }
  }

  return { ok: findings.length === 0, findings, proofs };
}

/** Build a bound VideoArtifactRef from a real on-disk file (fails if missing). */
export function registerBoundVideoArtifact(input: {
  repoRoot: string;
  id: string;
  relativePath: string;
  scriptVersionId: string;
  campaignId: string;
  skuId: string;
  extension: string;
  productionMethod?: "capcut" | "unknown";
  sourceAssetRefs?: readonly string[];
  voiceArtifactSha256?: string;
  declaredDurationSeconds?: number;
  declaredWidth?: number;
  declaredHeight?: number;
  declaredAspectRatio?: "vertical" | "square" | "landscape";
}): VideoArtifactRef | { error: string } {
  const proof = bindVideoArtifactFile(input.repoRoot, input.relativePath, {
    scriptVersionId: input.scriptVersionId,
    campaignId: input.campaignId,
    skuId: input.skuId,
  });
  if (!proof.exists || !proof.contentSha256) {
    return { error: `Cannot register missing video at ${input.relativePath}` };
  }
  return {
    id: input.id,
    relativePath: input.relativePath,
    extension: input.extension.replace(/^\./, "").toLowerCase(),
    contentSha256: proof.contentSha256,
    byteLength: proof.bytes,
    scriptVersionId: input.scriptVersionId,
    campaignId: input.campaignId,
    skuId: input.skuId,
    productionMethod: input.productionMethod ?? "capcut",
    sourceAssetRefs: input.sourceAssetRefs ?? [],
    voiceArtifactSha256: input.voiceArtifactSha256,
    declaredDurationSeconds: input.declaredDurationSeconds,
    declaredWidth: input.declaredWidth,
    declaredHeight: input.declaredHeight,
    declaredAspectRatio: input.declaredAspectRatio,
  };
}
