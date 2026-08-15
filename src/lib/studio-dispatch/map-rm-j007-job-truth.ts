/**
 * STUDIO-OPERATING-DESIGN-RM-J007-DISPATCH-HOOK-1
 *
 * Map paid rmj007PostPayDispatchStructure (+ payment seal) → RmJ007UpdateProjectTruth.
 * Purchased 1-member update is law. Reference material must resolve from materials.
 */

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import {
  DESIGN_RENDERER_RM_J007_SKU,
  assertRmJ007PostPayStructureDispatchReady,
  assertRmJ007PostPayStructureMatchesPaymentSeal,
  recipeForRmJ007Update,
  type RmJ007BoundedChanges,
  type RmJ007PostPayDispatchStructure,
  type RmJ007ReferenceMaterial,
  type RmJ007UpdatePaymentSeal,
  type RmJ007UpdateProjectTruth,
} from "@/lib/studio-design-renderer";

import type { JobDispatchRecord } from "./types";

export const RM_J007_DISPATCH_WIRING_SCOPE_NOTE =
  "STUDIO-OPERATING-DESIGN-RM-J007-DISPATCH-HOOK-1 — Owner APPROVE B. " +
  "Paid rmj007UpdateSeal + rmj007PostPayDispatchStructure required. " +
  "One existing promotional reference → one recreated updated final. " +
  "Bounded edits only. Canva not on the fulfillment spine; Owner routine NONE.";

export type RmJ007TruthMapResult =
  | {
      ok: true;
      truth: RmJ007UpdateProjectTruth;
      structure: RmJ007PostPayDispatchStructure;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

function parseBoundedChangesFromStartingPoint(input: {
  whatChange: string;
  newInfo: string;
  remove?: string;
}): RmJ007BoundedChanges {
  const changes: RmJ007BoundedChanges = {};
  const blob = `${input.whatChange}\n${input.newInfo}`;
  const price = blob.match(/\$\d+(?:\.\d{2})?/);
  if (price) changes.prices = price[0];
  const date =
    blob.match(
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/i,
    ) ?? blob.match(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/);
  if (date) changes.dates = date[0];
  const phone = blob.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phone) changes.contact = phone[0];
  // Always keep wording from newInfo so at least one bounded field is present.
  changes.wording = input.newInfo.trim();
  if (input.remove?.trim()) changes.remove = input.remove.trim();
  return changes;
}

function resolveReferenceMaterial(input: {
  repoRoot: string;
  materials: readonly CampaignMaterialItem[];
  stagedReferenceRelativePath?: string;
}): RmJ007ReferenceMaterial | null {
  if (input.stagedReferenceRelativePath) {
    const abs = path.join(input.repoRoot, input.stagedReferenceRelativePath);
    if (existsSync(abs)) {
      const buf = readFileSync(abs);
      const lower = input.stagedReferenceRelativePath.toLowerCase();
      const mime: RmJ007ReferenceMaterial["mime"] = lower.endsWith(".pdf")
        ? "pdf"
        : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
          ? "jpeg"
          : "png";
      return {
        materialId: "mat-staged-reference",
        relativePath: input.stagedReferenceRelativePath,
        contentSha256: createHash("sha256").update(buf).digest("hex"),
        mime,
      };
    }
  }

  for (const m of input.materials) {
    const rel =
      (m as { relativePath?: string }).relativePath ??
      (m as { storageRelativePath?: string }).storageRelativePath;
    if (!rel) continue;
    const role = String((m as { role?: string }).role ?? "").toLowerCase();
    const name = String((m as { fileName?: string }).fileName ?? rel).toLowerCase();
    if (
      !role.includes("reference") &&
      !role.includes("promo") &&
      !name.includes("reference") &&
      !name.includes("before")
    ) {
      continue;
    }
    const abs = path.join(input.repoRoot, rel);
    if (!existsSync(abs)) continue;
    const buf = readFileSync(abs);
    const lower = rel.toLowerCase();
    const mime: RmJ007ReferenceMaterial["mime"] = lower.endsWith(".pdf")
      ? "pdf"
      : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
        ? "jpeg"
        : "png";
    return {
      materialId: String((m as { materialId?: string }).materialId ?? "mat-campaign-reference"),
      relativePath: rel,
      contentSha256: createHash("sha256").update(buf).digest("hex"),
      mime,
    };
  }
  return null;
}

export function mapRmJ007UpdateProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  dispatchRecord: JobDispatchRecord;
  materials: readonly CampaignMaterialItem[];
  stagedReferenceRelativePath?: string;
}): RmJ007TruthMapResult {
  const record = input.dispatchRecord;
  if (record.skuId !== DESIGN_RENDERER_RM_J007_SKU) {
    return {
      ok: false,
      code: "SKU_NOT_SUPPORTED",
      message: `rm-j007 mapper refuses SKU ${record.skuId}`,
    };
  }

  if (
    !input.campaign.paymentReceivedAt &&
    input.campaign.paymentTruth?.status !== "confirmed"
  ) {
    return {
      ok: false,
      code: "RM_J007_NOT_PAID",
      message:
        "RM_J007_NOT_PAID: confirmed payment required before Reference-Guided Update dispatch",
    };
  }

  const seal = input.campaign.paymentTruth?.rmj007UpdateSeal as
    | RmJ007UpdatePaymentSeal
    | undefined;
  if (!seal) {
    return {
      ok: false,
      code: "MISSING_PAYMENT_SEAL",
      message: "MISSING_PAYMENT_SEAL: paymentTruth.rmj007UpdateSeal required",
    };
  }

  const structure = input.campaign.rmj007PostPayDispatchStructure;
  if (!structure) {
    return {
      ok: false,
      code: "MISSING_POSTPAY_STRUCTURE",
      message:
        "MISSING_POSTPAY_STRUCTURE: campaign.rmj007PostPayDispatchStructure required",
    };
  }

  const matched = assertRmJ007PostPayStructureMatchesPaymentSeal(
    structure,
    seal,
  );
  if (!matched.ok) {
    return { ok: false, code: "SEAL_STRUCTURE_MISMATCH", message: matched.message };
  }
  const ready = assertRmJ007PostPayStructureDispatchReady(structure);
  if (!ready.ok) {
    return { ok: false, code: "SEAL_STRUCTURE_MISMATCH", message: ready.message };
  }

  const referenceMaterial = resolveReferenceMaterial({
    repoRoot: input.repoRoot,
    materials: input.materials,
    stagedReferenceRelativePath: input.stagedReferenceRelativePath,
  });
  if (!referenceMaterial) {
    return {
      ok: false,
      code: "MISSING_REFERENCE",
      message:
        "MISSING_REFERENCE: cannot dispatch without a resolvable promotional reference material",
    };
  }

  const starting = structure.startingPointIdentity;
  const recipe = recipeForRmJ007Update();
  const truth: RmJ007UpdateProjectTruth = {
    skuId: DESIGN_RENDERER_RM_J007_SKU,
    campaignId: input.campaign.campaignId,
    jobId: record.jobId ?? `${input.campaign.campaignId}::rm-j007`,
    dispatchId: record.dispatchId,
    businessName: structure.businessName,
    itemIdentity: starting.itemIdentity,
    whereLive: starting.whereLive,
    referenceMaterial,
    replacementImage: null,
    boundedChanges: parseBoundedChangesFromStartingPoint(starting),
    whatChange: starting.whatChange,
    newInfo: starting.newInfo,
    acceptRecreationLimits: true,
    redesignRequested: false,
    lockedPackageMemberCount: 1,
    plannedMembers: recipe.plannedMembers,
    fulfillmentMode: "recreation",
    label: `${structure.businessName} — rm-j007 update`,
  };

  return { ok: true, truth, structure };
}
