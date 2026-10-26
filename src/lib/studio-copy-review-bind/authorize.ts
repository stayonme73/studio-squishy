/**
 * Review authorization for copy proofs.
 * Spine status alone is not enough. Text existence alone is not enough.
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

import {
  COPY_REVIEW_BIND_SKUS,
  COPY_REVIEW_HOLD_SKUS,
} from "@/config/studio-copy-review-bind-v1";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { contentSha256Hex, sameContentSha256 } from "@/lib/studio-review-revision/hash";

import { customerFacingCopyReviewTextLeaks, renderCustomerCopyProofHtml } from "./customer-facing";
import type {
  CopyReviewArtifactContract,
  CopyReviewAuthorizeBlock,
  CopyReviewAuthorizeResult,
} from "./types";

const BIND_SKU_SET = new Set<string>(COPY_REVIEW_BIND_SKUS);
const HOLD_SKU_SET = new Set<string>(COPY_REVIEW_HOLD_SKUS);

function fail(
  contract: CopyReviewArtifactContract,
  block: CopyReviewAuthorizeBlock,
  message: string,
): CopyReviewAuthorizeResult {
  return { ok: false, block, message, contract };
}

function qaPassHashes(envelope: ServerTasksEnvelope, skuId: string): string[] {
  return (envelope.qaRecords ?? [])
    .filter(
      (record) =>
        record.action === "qa_pass" &&
        (record.taskId.includes(skuId) ||
          record.artifactBinding?.workVersionId?.includes(skuId)) &&
        record.copyQualityEvidence?.gatePassed === true,
    )
    .flatMap((record) => record.artifactBinding?.contentSha256s ?? [])
    .map((value) => contentSha256Hex(value))
    .filter(Boolean);
}

function submissionHashFromArtifact(rel: string): string | null {
  const abs = path.join(process.cwd(), rel.replace(/\\/g, "/"));
  if (!existsSync(abs)) return null;
  try {
    const parsed = JSON.parse(readFileSync(abs, "utf8")) as { submission?: unknown };
    if (!parsed.submission) return null;
    return createHash("sha256").update(JSON.stringify(parsed.submission)).digest("hex");
  } catch {
    return null;
  }
}

export function authorizeCopyReviewProof(input: {
  contract: CopyReviewArtifactContract;
  envelope: ServerTasksEnvelope;
  forceStaleHash?: string;
}): CopyReviewAuthorizeResult {
  const { contract, envelope } = input;

  if (HOLD_SKU_SET.has(contract.skuId) || !BIND_SKU_SET.has(contract.skuId)) {
    return fail(contract, "hold_sku", "This SKU is not copy Review-bind certified.");
  }

  if (!contract.observerOk) {
    const evidenceFailed =
      contract.copyQualityEvidence && contract.copyQualityEvidence.gatePassed !== true;
    if (evidenceFailed) {
      return fail(
        contract,
        "unsupported_claim",
        "Copy QA did not authorize this content.",
      );
    }
    return fail(
      contract,
      "observer_not_ok",
      "Copy production did not pass for this job.",
    );
  }

  if (
    contract.setStatus === "partial_set" ||
    contract.members.length < contract.requiredMemberCount
  ) {
    return fail(
      contract,
      "partial_required_set",
      "The required copy set is not complete. Review will not present the service as ready.",
    );
  }

  if (!contract.artifactRelativePath) {
    return fail(contract, "missing_artifact", "Copy artifact is missing.");
  }

  const actualHash = submissionHashFromArtifact(contract.artifactRelativePath);
  if (!actualHash) {
    return fail(contract, "missing_artifact", "Copy artifact could not be read.");
  }
  if (!sameContentSha256(actualHash, contract.copySha256)) {
    return fail(
      contract,
      "corrupt_artifact",
      "Copy artifact bytes do not match the bound identity.",
    );
  }

  for (const member of contract.members) {
    const leak = customerFacingCopyReviewTextLeaks(
      `${member.customerFormatLabel} ${member.subject ?? ""} ${member.body} ${renderCustomerCopyProofHtml(member)}`,
    );
    if (leak) {
      return fail(
        contract,
        "customer_facing_leak",
        `Customer-facing Review proof leaked internal naming (${leak}).`,
      );
    }
  }

  const authorized = qaPassHashes(envelope, contract.skuId);
  if (authorized.length === 0) {
    return fail(contract, "qa_does_not_authorize", "QA did not authorize this copy.");
  }

  if (!authorized.some((hash) => sameContentSha256(hash, contract.copySha256))) {
    return fail(
      contract,
      "hash_mismatch",
      "QA does not authorize this copy identity.",
    );
  }

  if (input.forceStaleHash && !sameContentSha256(contract.copySha256, input.forceStaleHash)) {
    return fail(contract, "stale_or_superseded", "That copy is no longer the authorized identity.");
  }

  const job = envelope.jobRecords?.find((entry) => entry.skuId === contract.skuId);
  if (!job) {
    return fail(contract, "job_not_review_eligible", "No job record exists for this SKU.");
  }

  return {
    ok: true,
    contract,
    authorizedHashes: [contract.copySha256, ...contract.members.map((m) => m.pieceContentSha256)],
  };
}
