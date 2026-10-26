/**
 * Collect general Design Review members from Machine receipts.
 * Authoritative identity is the producer receipt, not the filename.
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

import { getServiceById } from "@/catalog/accessors";
import { studioGeneralDesignReviewBindV1 } from "@/config/studio-general-design-review-bind-v1";
import type { DesignRendererObserverResult } from "@/lib/studio-dispatch/design-renderer-observer";
import { contentSha256Hex } from "@/lib/studio-review-revision/hash";

import {
  customerFormatLabelForMember,
  memberIdFromPromoDimensions,
} from "./customer-facing";
import { requiredGeneralDesignReviewMemberIds } from "./members";
import type {
  GeneralDesignReviewArtifactContract,
  GeneralDesignReviewProofMember,
  GeneralDesignReviewSetStatus,
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

function sha256Rel(rel: string): string {
  const abs = path.join(process.cwd(), normalizeRel(rel));
  if (!existsSync(abs) || !rel.trim()) return "";
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

function stringField(record: Record<string, unknown> | null, key: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function numberField(record: Record<string, unknown> | null, key: string): number {
  const value = record?.[key];
  return typeof value === "number" ? value : 0;
}

function member(input: {
  memberId: GeneralDesignReviewProofMember["memberId"];
  pngRelativePath: string;
  pngContentSha256: string;
  widthPx: number;
  heightPx: number;
  pdfRelativePath?: string;
  pdfContentSha256?: string;
  requiredForSet?: boolean;
}): GeneralDesignReviewProofMember | null {
  if (!input.pngRelativePath || !input.pngContentSha256) return null;
  return {
    memberId: input.memberId,
    customerFormatLabel: customerFormatLabelForMember(input.memberId),
    mimeType: "image/png",
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    pngRelativePath: normalizeRel(input.pngRelativePath),
    pngContentSha256: contentSha256Hex(input.pngContentSha256),
    pdfRelativePath: input.pdfRelativePath
      ? normalizeRel(input.pdfRelativePath)
      : undefined,
    pdfContentSha256: input.pdfContentSha256
      ? contentSha256Hex(input.pdfContentSha256)
      : undefined,
    requiredForSet: input.requiredForSet !== false,
  };
}

function setStatus(
  found: number,
  required: number,
  observerOk: boolean,
): GeneralDesignReviewSetStatus {
  if (required <= 0) return "not_reviewable";
  if (found <= 0) return "not_reviewable";
  if (found < required) return "partial_set";
  if (!observerOk) return "partial_set";
  if (required === 1) return "individual_ready";
  return "complete_reviewable_set";
}

function collectPromo(identity: Record<string, unknown>): GeneralDesignReviewProofMember[] {
  const assets = Array.isArray(identity.assets) ? identity.assets : [];
  const members: GeneralDesignReviewProofMember[] = [];
  for (const raw of assets) {
    const asset = asRecord(raw);
    const widthPx = numberField(asset, "widthPx");
    const heightPx = numberField(asset, "heightPx");
    const kind = memberIdFromPromoDimensions(widthPx, heightPx);
    if (kind === "landscape-hold" || kind === null) continue;
    const next = member({
      memberId: kind,
      pngRelativePath: stringField(asset, "pngRelativePath"),
      pngContentSha256: stringField(asset, "pngContentSha256"),
      widthPx,
      heightPx,
    });
    if (next) members.push(next);
  }
  return members;
}

function collectSocial(identity: Record<string, unknown>): GeneralDesignReviewProofMember[] {
  const assets = Array.isArray(identity.assets) ? identity.assets : [];
  const members: GeneralDesignReviewProofMember[] = [];
  const orderIds = ["post-1", "post-2", "post-3", "post-4"] as const;
  assets.forEach((raw, index) => {
    const asset = asRecord(raw);
    const order = numberField(asset, "orderIndex") || index + 1;
    const memberId = orderIds[order - 1];
    if (!memberId) return;
    const next = member({
      memberId,
      pngRelativePath: stringField(asset, "pngRelativePath"),
      pngContentSha256: stringField(asset, "pngContentSha256"),
      widthPx: numberField(asset, "widthPx") || 1024,
      heightPx: numberField(asset, "heightPx") || 1024,
    });
    if (next) members.push(next);
  });
  return members;
}

function collectCard(identity: Record<string, unknown>): GeneralDesignReviewProofMember[] {
  const sides = Array.isArray(identity.sides) ? identity.sides : [];
  const members: GeneralDesignReviewProofMember[] = [];
  const pdfRelativePath = stringField(identity, "pdfRelativePath") || undefined;
  const pdfContentSha256 = stringField(identity, "pdfContentSha256") || undefined;
  for (const raw of sides) {
    const side = asRecord(raw);
    const sideId = stringField(side, "side");
    const memberId = sideId === "back" ? "back" : "front";
    const next = member({
      memberId,
      pngRelativePath: stringField(side, "pngRelativePath"),
      pngContentSha256: stringField(side, "pngContentSha256"),
      widthPx: numberField(side, "widthPx"),
      heightPx: numberField(side, "heightPx"),
      pdfRelativePath: memberId === "front" ? pdfRelativePath : undefined,
      pdfContentSha256: memberId === "front" ? pdfContentSha256 : undefined,
    });
    if (next) members.push(next);
  }
  return members;
}

function collectSingle(
  identity: Record<string, unknown>,
  memberId: "menu" | "service-sheet",
): GeneralDesignReviewProofMember[] {
  const next = member({
    memberId,
    pngRelativePath: stringField(identity, "pngRelativePath"),
    pngContentSha256: stringField(identity, "pngContentSha256"),
    widthPx: numberField(identity, "widthPx"),
    heightPx: numberField(identity, "heightPx"),
    pdfRelativePath: stringField(identity, "pdfRelativePath") || undefined,
    pdfContentSha256: stringField(identity, "pdfContentSha256") || undefined,
  });
  return next ? [next] : [];
}

function requiredCountForSku(skuId: string): number {
  return requiredGeneralDesignReviewMemberIds(skuId).length;
}

export function collectGeneralDesignReviewContract(input: {
  campaignId: string;
  jobId: string;
  skuId: string;
  result: DesignRendererObserverResult;
}): GeneralDesignReviewArtifactContract {
  const receipt = readJson(input.result.receiptRelativePath);
  const identity = asRecord(receipt?.identity) ?? receipt;
  let members: GeneralDesignReviewProofMember[] = [];
  if (input.skuId === "v2-rtu-promotion-graphics" && identity) {
    members = collectPromo(identity);
  } else if (input.skuId === "v2-rtu-social-posts" && identity) {
    members = collectSocial(identity);
  } else if (input.skuId === "v2-rtu-business-card" && identity) {
    members = collectCard(identity);
  } else if (input.skuId === "v2-rtu-menu" && identity) {
    members = collectSingle(identity, "menu");
  } else if (input.skuId === "v2-rtu-service-sheet" && identity) {
    members = collectSingle(identity, "service-sheet");
  }

  const requiredMemberCount = requiredCountForSku(input.skuId);
  const observerOk = input.result.ok === true && input.result.action === "invoked";
  const serviceName = getServiceById(input.skuId as never)?.name ?? input.skuId;
  const renderVersion = input.result.renderVersion ?? 1;
  const captionTextRelativePath =
    input.skuId === "v2-rtu-social-posts" && identity
      ? stringField(identity, "captionTextRelativePath") || undefined
      : undefined;
  const postingOrderJsonRel =
    input.skuId === "v2-rtu-social-posts" && identity
      ? stringField(identity, "postingOrderRelativePath")
      : "";
  const postingOrderTextRelativePath = postingOrderJsonRel
    ? postingOrderJsonRel.replace(/posting-order\.json$/i, "posting-order.txt")
    : undefined;
  const captionTextSha256 = captionTextRelativePath
    ? sha256Rel(captionTextRelativePath)
    : "";
  const postingOrderTextSha256 = postingOrderTextRelativePath
    ? sha256Rel(postingOrderTextRelativePath)
    : "";

  return {
    packageId: studioGeneralDesignReviewBindV1.packageId,
    campaignId: input.campaignId,
    jobId: input.jobId,
    skuId: input.skuId,
    serviceName,
    renderVersion,
    workVersionId: `${input.skuId}-v${renderVersion}`,
    members,
    requiredMemberCount,
    setStatus: setStatus(members.length, requiredMemberCount, observerOk),
    observerOk,
    captionTextRelativePath,
    captionTextSha256: captionTextSha256 || undefined,
    postingOrderTextRelativePath,
    postingOrderTextSha256: postingOrderTextSha256 || undefined,
  };
}
