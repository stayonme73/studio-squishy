/**
 * Collect copy Review members from the Machine copy receipt + artifact.
 * Authoritative identity is copySha256 of the producer submission, not a filename.
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

import { getServiceById } from "@/catalog/accessors";
import { studioCopyReviewBindV1 } from "@/config/studio-copy-review-bind-v1";
import type { CampaignRecord } from "@/config/studio-board";
import type { CopyQualityEvidence, CopyQualitySubmission } from "@/lib/studio-kitchen-production/copy-quality";
import type { PasteReadyCopyFile } from "@/lib/studio-copy-kit-light-harden/paste-ready-export";
import { customerArtifactRootRel } from "@/lib/studio-dispatch/map-flyer-job-truth";
import { contentSha256Hex } from "@/lib/studio-review-revision/hash";

import { emailMemberLabel, smsMemberLabel } from "./customer-facing";
import type {
  CopyReviewArtifactContract,
  CopyReviewProofMember,
  CopyReviewSetStatus,
} from "./types";

function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function readJson(rel: string | undefined): Record<string, unknown> | null {
  if (!rel?.trim()) return null;
  const abs = path.join(process.cwd(), normalizeRel(rel));
  if (!existsSync(abs)) return null;
  try {
    return JSON.parse(readFileSync(abs, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function stringField(record: Record<string, unknown> | null, key: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function numberField(record: Record<string, unknown> | null, key: string): number {
  const value = record?.[key];
  return typeof value === "number" ? value : 0;
}

function parsePasteReadyFiles(receipt: Record<string, unknown> | null): PasteReadyCopyFile[] {
  const raw = receipt?.pasteReadyFiles;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const record = asRecord(entry);
    if (!record) return [];
    const relativePath = stringField(record, "relativePath");
    const label = stringField(record, "label");
    const format = stringField(record, "format");
    const sha256 = stringField(record, "sha256");
    if (!relativePath || !label || (format !== "txt" && format !== "html") || !sha256) {
      return [];
    }
    return [{ relativePath, label, format, sha256 }];
  });
}

function hashJson(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function setStatus(
  found: number,
  required: number,
  observerOk: boolean,
): CopyReviewSetStatus {
  if (required <= 0) return "not_reviewable";
  if (found <= 0) return "not_reviewable";
  if (found < required) return "partial_set";
  if (!observerOk) return "not_reviewable";
  if (required === 1) return "individual_ready";
  return "complete_reviewable_set";
}

function emailMembers(submission: CopyQualitySubmission): CopyReviewProofMember[] {
  return (submission.emails ?? []).map((email, index) => {
    const n = index + 1;
    return {
      memberId: `email-${n}`,
      memberKind: "email" as const,
      customerFormatLabel: emailMemberLabel(n),
      subject: email.subjectOptions[0] ?? "",
      previewText: email.previewText,
      body: email.body,
      cta: email.cta,
      pieceContentSha256: hashJson({
        subject: email.subjectOptions[0] ?? "",
        previewText: email.previewText,
        body: email.body,
        cta: email.cta,
      }),
      requiredForSet: true,
    };
  });
}

function smsMembers(submission: CopyQualitySubmission): CopyReviewProofMember[] {
  return (submission.smsMessages ?? []).map((message, index) => {
    const n = index + 1;
    return {
      memberId: `sms-${n}`,
      memberKind: "sms" as const,
      customerFormatLabel: smsMemberLabel(n),
      body: message.body,
      pieceContentSha256: hashJson({ body: message.body }),
      requiredForSet: true,
    };
  });
}

export function collectCopyReviewContract(input: {
  campaign: CampaignRecord;
  jobId: string;
  skuId: string;
}): CopyReviewArtifactContract {
  const skuId = input.skuId;
  const serviceName =
    getServiceById(skuId)?.name ??
    (skuId === "v2-rtu-sms-kit"
      ? "Make My Text Message Campaign Kit"
      : "Make My Email Campaign Kit");
  const dispatch = input.campaign.dispatchExecution?.records.find(
    (record) => record.skuId === skuId,
  );
  const observer = input.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
    (result) => result.skuId === skuId,
  );
  const observerOk = observer?.action === "invoked" && observer.ok === true;
  const empty: CopyReviewArtifactContract = {
    packageId: studioCopyReviewBindV1.packageId,
    campaignId: input.campaign.campaignId,
    jobId: input.jobId,
    skuId,
    serviceName,
    renderVersion: 1,
    workVersionId: `${skuId}-v1`,
    artifactRelativePath: "",
    copySha256: "",
    members: [],
    requiredMemberCount: skuId === "v2-rtu-email-kit" ? 2 : 1,
    setStatus: "not_reviewable",
    observerOk,
  };

  if (!dispatch) return empty;

  const receiptRel = `${customerArtifactRootRel(input.campaign.campaignId, dispatch.dispatchId)}/copy-hook-receipt.json`;
  const receipt = readJson(receiptRel);
  const artifactRel =
    stringField(receipt, "artifactRelativePath") ||
    (typeof observer?.artifactRelativePath === "string"
      ? observer.artifactRelativePath
      : "");
  const artifact = readJson(artifactRel);
  const submission = asRecord(artifact)?.submission as CopyQualitySubmission | undefined;
  const attempt = numberField(asRecord(artifact), "attempt") || 1;
  const copySha256 = contentSha256Hex(
    stringField(receipt, "copySha256") ||
      (typeof observer?.copySha256 === "string" ? observer.copySha256 : "") ||
      (submission ? hashJson(submission) : ""),
  );

  const members =
    submission?.kind === "sms_set"
      ? smsMembers(submission)
      : submission?.kind === "email_set"
        ? emailMembers(submission)
        : [];
  const selectedIds: readonly string[] = input.campaign.approvedStudioPlan?.selectedServiceIds ?? [];
  const campaignSingleEmail =
    skuId === "v2-rtu-email-kit" &&
    (selectedIds.includes("campaign_launch_kit") ||
      input.jobId.includes(":campaign_launch_kit:"));
  const requiredMemberCount = campaignSingleEmail
    ? 1
    : skuId === "v2-rtu-email-kit"
      ? 2
      : Math.max(members.length, 1);

  const evidence = receipt?.evidence as CopyQualityEvidence | undefined;

  return {
    packageId: studioCopyReviewBindV1.packageId,
    campaignId: input.campaign.campaignId,
    jobId: input.jobId,
    skuId,
    serviceName,
    renderVersion: attempt,
    workVersionId: `${skuId}-v${attempt}`,
    artifactRelativePath: normalizeRel(artifactRel),
    copySha256,
    factsFingerprint: stringField(receipt, "factsFingerprint") || undefined,
    members,
    requiredMemberCount,
    setStatus: setStatus(members.length, requiredMemberCount, observerOk),
    observerOk,
    copyQualityEvidence: evidence?.gatePassed ? evidence : undefined,
    pasteReadyFiles: parsePasteReadyFiles(receipt),
  };
}
