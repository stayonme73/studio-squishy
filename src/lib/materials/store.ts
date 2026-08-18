import { promises as fs } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import {
  FLYER_PROOF_CONTRACT,
  isDesignRendererProofSku,
} from "@/lib/studio-design-renderer";

import { syncMaterialsSummaryOnCampaign } from "./campaign-summary";
import { migrateFromProjectDetails } from "./migrate-from-project-details";
import { countBlockingRequiredMaterials } from "./materials-view";
import type { CampaignMaterialItem, ServerMaterialsEnvelope } from "./types";

const MATERIALS_DIR = path.join(process.cwd(), "data", "campaign-materials");

function materialsPath(campaignId: string): string {
  return path.join(MATERIALS_DIR, `${campaignId}.json`);
}

async function ensureMaterialsDir(): Promise<void> {
  await fs.mkdir(MATERIALS_DIR, { recursive: true });
}

export async function readMaterialsEnvelope(
  campaignId: string,
): Promise<ServerMaterialsEnvelope | null> {
  try {
    const raw = await fs.readFile(materialsPath(campaignId), "utf8");
    return JSON.parse(raw) as ServerMaterialsEnvelope;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeMaterialsEnvelope(
  envelope: ServerMaterialsEnvelope,
): Promise<ServerMaterialsEnvelope> {
  await ensureMaterialsDir();
  await fs.writeFile(materialsPath(envelope.campaignId), JSON.stringify(envelope, null, 2), "utf8");
  return envelope;
}

function toEnvelope(record: ReturnType<typeof migrateFromProjectDetails>): ServerMaterialsEnvelope {
  const now = new Date().toISOString();
  return { ...record, syncedAt: now };
}

async function ensureCampaignMaterialsSummary(
  campaignId: string,
  items: readonly CampaignMaterialItem[],
): Promise<void> {
  const campaignEnvelope = await readCampaignEnvelope(campaignId);
  if (!campaignEnvelope?.record.materialsSummary) {
    await syncMaterialsSummaryOnCampaign(campaignId, countBlockingRequiredMaterials(items));
  }
}

/**
 * Existing ledgers may still seed required logo/photo/document slots for the sealed
 * wordmark-only flyer. Demote those slots without rewriting frozen product law.
 */
export function reconcileFlyerWordmarkMaterialTruth(
  envelope: ServerMaterialsEnvelope,
  campaign?: CampaignRecord | null,
): { envelope: ServerMaterialsEnvelope; changed: boolean } {
  const flyerSkuIds = new Set(
    (campaign?.approvedStudioPlan?.lineItems ?? [])
      .map((item) => item.skuId)
      .filter((skuId) => isDesignRendererProofSku(skuId)),
  );
  if (flyerSkuIds.size === 0 || FLYER_PROOF_CONTRACT.customerLogoRequired) {
    return { envelope, changed: false };
  }

  const now = new Date().toISOString();
  let changed = false;
  const items = envelope.items.map((item) => {
    const flyerRelated = item.relatedServiceIds.some((skuId) => flyerSkuIds.has(skuId));
    if (!flyerRelated) return item;

    if (item.sourceExceptionId || item.promotionApprovedAt || item.reviewStatus === "requested") {
      return item;
    }

    if (
      (item.category === "document-reference" ||
        item.category === "access-instructions" ||
        item.category === "factual-confirmation") &&
      item.uploadStatus !== "stored" &&
      item.reviewStatus !== "submitted" &&
      item.reviewStatus !== "approved_for_use"
    ) {
      changed = true;
      return {
        ...item,
        requirementLevel: "optional" as const,
        reviewStatus:
          item.reviewStatus === "missing" || item.reviewStatus === "requested"
            ? ("not_needed" as const)
            : item.reviewStatus,
      };
    }

    if (
      (item.category === "logo-brand" || item.category === "photo-video") &&
      item.requirementLevel === "required"
    ) {
      changed = true;
      return { ...item, requirementLevel: "optional" as const };
    }

    return item;
  });

  if (!changed) return { envelope, changed: false };
  return {
    changed: true,
    envelope: {
      ...envelope,
      items,
      updatedAt: now,
      syncedAt: now,
    },
  };
}

async function persistReconciliationIfNeeded(
  envelope: ServerMaterialsEnvelope,
  campaign?: CampaignRecord,
): Promise<ServerMaterialsEnvelope> {
  const reconciled = reconcileFlyerWordmarkMaterialTruth(envelope, campaign);
  if (!reconciled.changed) return envelope;
  const saved = await writeMaterialsEnvelope(reconciled.envelope);
  await syncMaterialsSummaryOnCampaign(
    saved.campaignId,
    countBlockingRequiredMaterials(saved.items, saved.campaignId),
  );
  return saved;
}

/**
 * Read materials for a campaign. On first access, migrate from campaign record + project details.
 */
export async function getOrInitializeMaterials(
  campaignId: string,
  campaign?: CampaignRecord,
): Promise<ServerMaterialsEnvelope> {
  const existing = await readMaterialsEnvelope(campaignId);
  if (existing) {
    let record = campaign;
    if (!record) {
      const envelope = await readCampaignEnvelope(campaignId);
      record = envelope?.record;
    }
    const reconciled = await persistReconciliationIfNeeded(existing, record);
    await ensureCampaignMaterialsSummary(campaignId, reconciled.items);
    return reconciled;
  }

  let record = campaign;
  if (!record) {
    const envelope = await readCampaignEnvelope(campaignId);
    record = envelope?.record;
  }
  if (!record) {
    throw new Error(`Cannot initialize materials — campaign "${campaignId}" not found.`);
  }

  const migrated = migrateFromProjectDetails(record);
  const envelope = await writeMaterialsEnvelope(toEnvelope(migrated));
  await syncMaterialsSummaryOnCampaign(campaignId, countBlockingRequiredMaterials(envelope.items));
  return envelope;
}
