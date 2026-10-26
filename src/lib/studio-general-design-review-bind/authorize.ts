/**
 * Review authorization for general Design Production proofs.
 * Spine status alone is not enough. Filename alone is not enough.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";

import {
  GENERAL_DESIGN_REVIEW_BIND_SKUS,
  GENERAL_DESIGN_REVIEW_HOLD_SKUS,
} from "@/config/studio-general-design-review-bind-v1";
import { createHash } from "crypto";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import { contentSha256Hex, sameContentSha256 } from "@/lib/studio-review-revision/hash";

import { customerFacingReviewTextLeaks } from "./customer-facing";
import type {
  GeneralDesignReviewArtifactContract,
  GeneralDesignReviewAuthorizeBlock,
  GeneralDesignReviewAuthorizeResult,
} from "./types";

const BIND_SKU_SET = new Set<string>(GENERAL_DESIGN_REVIEW_BIND_SKUS);
const HOLD_SKU_SET = new Set<string>(GENERAL_DESIGN_REVIEW_HOLD_SKUS);

function fail(
  contract: GeneralDesignReviewArtifactContract,
  block: GeneralDesignReviewAuthorizeBlock,
  message: string,
): GeneralDesignReviewAuthorizeResult {
  return { ok: false, block, message, contract };
}

function qaPassHashes(envelope: ServerTasksEnvelope, skuId: string): string[] {
  return (envelope.qaRecords ?? [])
    .filter(
      (record) =>
        record.action === "qa_pass" &&
        (record.taskId.includes(skuId) ||
          record.artifactBinding?.workVersionId?.includes(skuId)),
    )
    .flatMap((record) => record.artifactBinding?.contentSha256s ?? [])
    .map((value) => contentSha256Hex(value))
    .filter(Boolean);
}

function fileHashMatches(rel: string, expectedHex: string): boolean {
  const abs = path.join(process.cwd(), rel.replace(/\\/g, "/"));
  if (!existsSync(abs)) return false;
  try {
    const bytes = readFileSync(abs);
    if (bytes.byteLength < 32) return false;
    const actual = createHash("sha256").update(bytes).digest("hex");
    return sameContentSha256(actual, expectedHex);
  } catch {
    return false;
  }
}

export function authorizeGeneralDesignReviewProof(input: {
  contract: GeneralDesignReviewArtifactContract;
  envelope: ServerTasksEnvelope;
  forceStaleHash?: string;
}): GeneralDesignReviewAuthorizeResult {
  const { contract, envelope } = input;

  if (HOLD_SKU_SET.has(contract.skuId) || !BIND_SKU_SET.has(contract.skuId)) {
    return fail(contract, "hold_sku", "This SKU is not Review-bind certified.");
  }

  if (!contract.observerOk) {
    return fail(
      contract,
      "observer_not_ok",
      "Design Production did not pass for every required format.",
    );
  }

  if (
    contract.setStatus === "partial_set" ||
    contract.members.length < contract.requiredMemberCount
  ) {
    return fail(
      contract,
      "partial_required_set",
      "The required design set is not complete. Review will not present the service as ready.",
    );
  }

  for (const member of contract.members) {
    const leak = customerFacingReviewTextLeaks(member.customerFormatLabel);
    if (leak) {
      return fail(
        contract,
        "customer_facing_leak",
        `Customer-facing Review proof leaked internal naming (${leak}).`,
      );
    }
    if (member.memberId === "portrait" && member.widthPx === 1536) {
      return fail(contract, "unsupported_plate", "Landscape promo plate remains HOLD.");
    }
    if (!existsSync(path.join(process.cwd(), member.pngRelativePath))) {
      return fail(contract, "missing_artifact", `Missing proof file for ${member.customerFormatLabel}.`);
    }
    if (!fileHashMatches(member.pngRelativePath, member.pngContentSha256)) {
      return fail(
        contract,
        "corrupt_artifact",
        `Proof bytes do not match the bound hash for ${member.customerFormatLabel}.`,
      );
    }
  }

  const authorized = qaPassHashes(envelope, contract.skuId);
  if (authorized.length === 0) {
    return fail(contract, "qa_does_not_authorize", "QA did not authorize this artifact.");
  }

  for (const member of contract.members) {
    const match = authorized.some((hash) => sameContentSha256(hash, member.pngContentSha256));
    if (!match) {
      return fail(
        contract,
        "hash_mismatch",
        `QA does not authorize ${member.customerFormatLabel}.`,
      );
    }
  }

  if (input.forceStaleHash) {
    const stillCurrent = contract.members.some((member) =>
      sameContentSha256(member.pngContentSha256, input.forceStaleHash),
    );
    if (!stillCurrent) {
      return fail(contract, "stale_or_superseded", "That proof is no longer the authorized identity.");
    }
  }

  const job = envelope.jobRecords?.find((entry) => entry.skuId === contract.skuId);
  if (!job) {
    return fail(contract, "job_not_review_eligible", "No job record exists for this SKU.");
  }

  return {
    ok: true,
    contract,
    authorizedHashes: contract.members.map((member) => member.pngContentSha256),
  };
}
