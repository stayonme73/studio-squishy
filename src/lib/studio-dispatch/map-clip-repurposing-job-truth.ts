/**
 * Map campaign intake + Materials into Clip Repurposing source truth.
 * Does not call the $349 footage mapper or the $149 stills mapper.
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import { materialBlocksProductionUse } from "@/lib/studio-material-use";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { readClipAuthorizedFact } from "./clip-door-facts";

const VIDEO_EXT = /\.(mp4|mov)$/i;
const CUSTOMER_BASIS = new Set(["customer_owns", "customer_has_permission"]);

export type ClipRepurposingIntake = {
  skuId: typeof CLIP_REPURPOSING_SKU;
  sourceRelativePath: string;
  ctaText: string;
  mustKeepLine?: string;
  rightsCleared: true;
  language: "en";
};

export type ClipRepurposingJobTruth =
  | {
      ok: true;
      intake: ClipRepurposingIntake;
      sourceAbsolutePath: string;
      sourceRelativePath: string;
    }
  | {
      ok: false;
      code:
        | "MISSING_REQUIRED_FACTS"
        | "RIGHTS_NOT_ACKNOWLEDGED"
        | "MISSING_USABLE_SOURCE"
        | "UNCLEARED_CUSTOMER_SOURCE"
        | "MORE_THAN_ONE_SOURCE";
      message: string;
    };

function isStoredTalkingHeadFile(item: CampaignMaterialItem): boolean {
  if (item.category !== "photo-video") return false;
  if (item.reviewStatus === "blocked_from_use") return false;
  if (item.uploadStatus !== "stored") return false;
  return Boolean(item.fileName && VIDEO_EXT.test(item.fileName));
}

function hasCustomerUseBasis(item: CampaignMaterialItem): boolean {
  const basis = item.useAuthorization?.basis;
  return Boolean(basis && CUSTOMER_BASIS.has(basis));
}

function isCustomerClearedTalkingHead(
  item: CampaignMaterialItem,
  campaignId: string,
): boolean {
  if (!isStoredTalkingHeadFile(item) || !hasCustomerUseBasis(item)) return false;
  if (item.reviewStatus === "approved_for_use") return true;
  return (
    item.contentCertification?.productionCleared === true &&
    !materialBlocksProductionUse(item, campaignId)
  );
}

function resolvedCustomerSourceFile(
  item: CampaignMaterialItem,
  campaignId: string,
  repoRoot: string,
): { rel: string; abs: string } | null {
  const candidates: string[] = [];
  if (item.url) candidates.push(item.url.replace(/\\/g, "/"));
  const objectPath =
    item.storageRef?.provider === "supabase_storage"
      ? item.storageRef.objectPath.replace(/\\/g, "/")
      : "";
  if (objectPath) {
    candidates.push(["data/file-room-objects", ...objectPath.split("/").filter(Boolean)].join("/"));
  }
  if (item.fileName) {
    candidates.push(
      `data/campaign-design-artifacts/${campaignId}/materials/${item.fileName}`,
    );
  }
  for (const rel of candidates) {
    const abs = path.join(repoRoot, ...rel.split("/"));
    if (existsSync(abs)) return { rel, abs };
  }
  return null;
}

function isPendingTalkingHead(item: CampaignMaterialItem, campaignId: string): boolean {
  if (!isStoredTalkingHeadFile(item)) return false;
  return !isCustomerClearedTalkingHead(item, campaignId);
}

export function mapClipRepurposingJobTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  materials: readonly CampaignMaterialItem[];
}): ClipRepurposingJobTruth {
  const answers = {
    ...(input.campaign.routeMapIntakeDraft?.answers ?? {}),
    ...(input.campaign.routeMapIntake?.answers ?? {}),
  };
  const videoPurpose = readClipAuthorizedFact(answers, "videoPurpose");
  const talkingHeadConfirm = readClipAuthorizedFact(answers, "talkingHeadConfirm");
  const rightsAcknowledgement = readClipAuthorizedFact(answers, "rightsAcknowledgement");
  const ctaText = readClipAuthorizedFact(answers, "ctaText").trim();
  const mustKeepLine = readClipAuthorizedFact(answers, "mustKeepLine").trim() || undefined;

  if (!videoPurpose || !talkingHeadConfirm) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_FACTS",
      message:
        "Clip Repurposing needs the video purpose and a 15–60 minute native-vertical talking-head confirmation.",
    };
  }

  const rightsCleared = /own|permission/i.test(rightsAcknowledgement);
  if (!rightsCleared) {
    return {
      ok: false,
      code: "RIGHTS_NOT_ACKNOWLEDGED",
      message:
        "The customer must acknowledge they own the recording or have permission from everyone who appears in it.",
    };
  }

  const sources: { rel: string; abs: string }[] = [];
  let pendingUncleared = false;
  for (const item of input.materials) {
    if (isPendingTalkingHead(item, input.campaign.campaignId)) {
      pendingUncleared = true;
      continue;
    }
    if (!isCustomerClearedTalkingHead(item, input.campaign.campaignId)) continue;
    const stored = resolvedCustomerSourceFile(
      item,
      input.campaign.campaignId,
      input.repoRoot,
    );
    if (stored && !sources.some((source) => source.rel === stored.rel)) {
      sources.push(stored);
    }
  }

  if (sources.length === 0 && pendingUncleared) {
    return {
      ok: false,
      code: "UNCLEARED_CUSTOMER_SOURCE",
      message:
        "A talking-head file is stored but not cleared for use. Wait for the customer. Do not substitute stock or Studio footage.",
    };
  }

  if (sources.length === 0) {
    return {
      ok: false,
      code: "MISSING_USABLE_SOURCE",
      message:
        "Clip Repurposing cannot start without one customer-cleared native-vertical MP4 or MOV on disk.",
    };
  }

  if (sources.length > 1) {
    return {
      ok: false,
      code: "MORE_THAN_ONE_SOURCE",
      message:
        "This service takes one talking-head. Remove extra video files before production.",
    };
  }

  const source = sources[0]!;
  return {
    ok: true,
    sourceAbsolutePath: source.abs,
    sourceRelativePath: source.rel,
    intake: {
      skuId: CLIP_REPURPOSING_SKU,
      sourceRelativePath: source.rel,
      ctaText,
      mustKeepLine,
      rightsCleared: true,
      language: "en",
    },
  };
}
