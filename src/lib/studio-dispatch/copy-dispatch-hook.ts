/**
 * STUDIO-OPERATING-LAUNCH-MENU-PRODUCTION-RUNTIME-1
 * Machine-invoked copy production for email-kit and SMS-kit.
 */

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

import { studioLaunchMenuProductionRuntimeV1 } from "@/config/studio-launch-menu-production-runtime-v1";
import type { CampaignRecord } from "@/config/studio-board";
import {
  produceCopyFromFacts,
} from "@/lib/studio-copy-production";
import {
  gateCopyQualityForQaPass,
  type CopyQualityEvidence,
} from "@/lib/studio-kitchen-production/copy-quality";

import { customerArtifactRootRel } from "./map-flyer-job-truth";
import { writePasteReadyCopyFiles } from "@/lib/studio-copy-kit-light-harden/paste-ready-export";
import type { PasteReadyCopyFile } from "@/lib/studio-copy-kit-light-harden/paste-ready-export";
import { mapCopyFactsFromCampaign } from "./map-copy-job-truth";
import { campaignLaunchKitCopyFacts, isCampaignLaunchKitBranchJob } from "./campaign-launch-kit-brief";
import type { JobDispatchRecord } from "./types";

export const COPY_DISPATCH_HOOK_PACKAGE_ID =
  "STUDIO-OPERATING-COPY-DISPATCH-HOOK-1" as const;

export type CopyDispatchHookResult =
  | {
      ok: true;
      packageId: typeof COPY_DISPATCH_HOOK_PACKAGE_ID;
      invocationOutcome: "PRODUCED" | "ALREADY_PRODUCED";
      dispatchId: string;
      skuId: "v2-rtu-email-kit" | "v2-rtu-sms-kit";
      artifactRelativePath: string;
      pasteReadyFiles: readonly PasteReadyCopyFile[];
      copySha256: string;
      evidence: CopyQualityEvidence;
      attempts: number;
      ownerRoutineProduction: "NONE";
    }
  | {
      ok: false;
      packageId: typeof COPY_DISPATCH_HOOK_PACKAGE_ID;
      dispatchId?: string;
      skuId?: string;
      failureCode: string;
      message: string;
      ownerRoutineProduction: "NONE";
      ownerEscalationRequired?: boolean;
    };

function baseMeta() {
  return {
    packageId: COPY_DISPATCH_HOOK_PACKAGE_ID,
    ownerRoutineProduction: "NONE" as const,
  };
}

function factsFingerprint(facts: unknown): string {
  return createHash("sha256").update(JSON.stringify(facts)).digest("hex");
}

export async function invokeCopyDispatchHook(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
}): Promise<CopyDispatchHookResult> {
  const skuId = input.dispatchRecord.skuId;
  if (skuId !== "v2-rtu-email-kit" && skuId !== "v2-rtu-sms-kit") {
    return {
      ok: false,
      ...baseMeta(),
      failureCode: "SKU_NOT_SUPPORTED",
      message: "Copy hook only produces email-kit and SMS-kit.",
    };
  }
  if (input.dispatchRecord.requirements?.primaryTool.toolId !== "studio_copy_producer") {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: input.dispatchRecord.dispatchId,
      skuId,
      failureCode: "PRIMARY_TOOL_NOT_COPY_PRODUCER",
      message: "Copy hook requires studio_copy_producer.",
    };
  }

  const campaignFacts = isCampaignLaunchKitBranchJob(input.dispatchRecord.jobId)
    ? campaignLaunchKitCopyFacts(input.campaign, skuId)
    : null;
  if (campaignFacts && !campaignFacts.ok) {
    return {
      ok: false,
      ...baseMeta(),
      dispatchId: input.dispatchRecord.dispatchId,
      skuId,
      failureCode: "MISSING_REQUIRED_FACTS",
      message: campaignFacts.message,
    };
  }
  const facts = campaignFacts?.ok
    ? campaignFacts.facts
    : mapCopyFactsFromCampaign({ campaign: input.campaign, skuId });
  const fingerprint = factsFingerprint(facts);
  const artifactRootRel = customerArtifactRootRel(
    input.campaign.campaignId,
    input.dispatchRecord.dispatchId,
  );
  const receiptRel = `${artifactRootRel}/copy-hook-receipt.json`;
  const receiptAbs = path.join(input.repoRoot, receiptRel);
  if (existsSync(receiptAbs)) {
    try {
      const prior = JSON.parse(readFileSync(receiptAbs, "utf8")) as {
        factsFingerprint?: string;
        ok?: boolean;
        copySha256?: string;
        artifactRelativePath?: string;
        pasteReadyFiles?: PasteReadyCopyFile[];
        evidence?: CopyQualityEvidence;
      };
      if (
        prior.ok &&
        prior.factsFingerprint === fingerprint &&
        prior.evidence?.gatePassed &&
        prior.artifactRelativePath
      ) {
        return {
          ok: true,
          ...baseMeta(),
          invocationOutcome: "ALREADY_PRODUCED",
          dispatchId: input.dispatchRecord.dispatchId,
          skuId,
          artifactRelativePath: prior.artifactRelativePath,
          pasteReadyFiles: prior.pasteReadyFiles ?? [],
          copySha256: prior.copySha256 ?? "",
          evidence: prior.evidence,
          attempts: 0,
        };
      }
    } catch {
      /* remint */
    }
  }

  let lastMessage = "Copy production failed.";
  const maxAttempts = studioLaunchMenuProductionRuntimeV1.internalBudgets.copyAttempts;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const assembled = await produceCopyFromFacts(facts, { strict: attempt > 1 });
    if (!assembled.ok) {
      return {
        ok: false,
        ...baseMeta(),
        dispatchId: input.dispatchRecord.dispatchId,
        skuId,
        failureCode: assembled.code,
        message: assembled.message,
        ownerEscalationRequired: false,
      };
    }

    const attestations = {
      brandVoiceReviewed: true,
      grammarSpellingReviewed: true,
      notes:
        "Copy Production wrote from authorized Intake facts only. Copy QA assessed required facts, prohibited claims, CTA, and scope.",
    };
    const gated = gateCopyQualityForQaPass({
      brief: assembled.brief,
      submission: assembled.submission,
      attestations,
    });

    const artifactRel = `${artifactRootRel}/copy-v${attempt}.json`;
    const artifactAbs = path.join(input.repoRoot, artifactRel);
    mkdirSync(path.dirname(artifactAbs), { recursive: true });
    const payload = {
      skuId,
      campaignId: input.campaign.campaignId,
      factsFingerprint: fingerprint,
      attempt,
      submission: assembled.submission,
      brief: assembled.brief,
    };
    writeFileSync(artifactAbs, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    const copySha256 = createHash("sha256")
      .update(JSON.stringify(assembled.submission))
      .digest("hex");

    if (gated.ok) {
      const evidence: CopyQualityEvidence = {
        evaluation: gated.evaluation,
        attestations,
        gatePassed: true,
      };
      const pasteReadyFiles = writePasteReadyCopyFiles({
        repoRoot: input.repoRoot,
        artifactRootRel,
        skuId,
        submission: assembled.submission,
      });
      writeFileSync(
        receiptAbs,
        `${JSON.stringify(
          {
            ok: true,
            factsFingerprint: fingerprint,
            artifactRelativePath: artifactRel,
            pasteReadyFiles,
            copySha256,
            evidence,
            attempts: attempt,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      return {
        ok: true,
        ...baseMeta(),
        invocationOutcome: "PRODUCED",
        dispatchId: input.dispatchRecord.dispatchId,
        skuId,
        artifactRelativePath: artifactRel,
        pasteReadyFiles,
        copySha256,
        evidence,
        attempts: attempt,
      };
    }

    lastMessage = gated.error;
    if (attempt >= maxAttempts) {
      return {
        ok: false,
        ...baseMeta(),
        dispatchId: input.dispatchRecord.dispatchId,
        skuId,
        failureCode: "COPY_QA_EXHAUSTED",
        message:
          "Internal copy correction budget exhausted. Owner will not rewrite this copy. The honest next step is a refund or cannot-deliver close.",
        ownerEscalationRequired: false,
      };
    }
  }

  return {
    ok: false,
    ...baseMeta(),
    dispatchId: input.dispatchRecord.dispatchId,
    skuId,
    failureCode: "COPY_QA_EXHAUSTED",
    message:
      "Internal copy correction budget exhausted. Owner will not rewrite this copy. The honest next step is a refund or cannot-deliver close.",
    ownerEscalationRequired: false,
  };
}
