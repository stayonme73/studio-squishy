/**
 * Map campaign intake + Materials into frozen FootageIntake.
 * Does not call the $149 stills mapper or invent a CTA.
 */

import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import { readProjectIntakeAnswer } from "@/lib/project-intake-plan";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { materialBlocksProductionUse } from "@/lib/studio-material-use";
import type { FootageIntake } from "@/lib/studio-short-form-video-editing";

import { studioShortFormCurrentDoorContractV1 } from "@/config/studio-short-form-current-door-contract-v1";

import {
  buildShortFormCurrentDoorJob,
  type ShortFormCurrentDoorJob,
} from "./short-form-current-door-job";
import {
  readShortFormAuthorizedFact,
  shortFormDoorUsableFootage,
} from "./short-form-door-facts";

const VIDEO_EXT = /\.(mp4|mov)$/i;
const CUSTOMER_BASIS = new Set(["customer_owns", "customer_has_permission"]);

export type FootageEditingJobTruth =
  | {
      ok: true;
      intake: FootageIntake;
      sourceAbsolutePath: string;
      sourceRelativePath: string;
      currentDoor?: ShortFormCurrentDoorJob;
    }
  | {
      ok: false;
      code:
        | "MISSING_REQUIRED_FACTS"
        | "RIGHTS_NOT_ACKNOWLEDGED"
        | "MISSING_USABLE_SOURCE"
        | "UNCLEARED_CUSTOMER_SOURCE"
        | "MORE_THAN_ONE_SOURCE"
        | "TOO_MANY_SOURCES";
      message: string;
    };

function isStoredVideoFile(item: CampaignMaterialItem): boolean {
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
  if (!isStoredVideoFile(item) || !hasCustomerUseBasis(item)) return false;
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
    candidates.push(
      ["data/file-room-objects", ...objectPath.split("/").filter(Boolean)].join("/"),
    );
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
  if (!isStoredVideoFile(item)) return false;
  return !isCustomerClearedTalkingHead(item, campaignId);
}

export function mapFootageEditingJobTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  materials: readonly CampaignMaterialItem[];
}): FootageEditingJobTruth {
  const answers = input.campaign.routeMapIntake?.answers;
  const skuId = SHORT_FORM_VIDEO_EDITING_SKU;
  const legacyPurpose = readProjectIntakeAnswer(answers, "videoPurpose", skuId);
  const videoPurpose = readShortFormAuthorizedFact(answers, "videoPurpose");
  const talkingHeadConfirm = readShortFormAuthorizedFact(answers, "talkingHeadConfirm");
  const rightsAcknowledgement = readShortFormAuthorizedFact(
    answers,
    "rightsAcknowledgement",
  );
  const ctaText = readShortFormAuthorizedFact(answers, "ctaText").trim();
  const mustKeepLine =
    readShortFormAuthorizedFact(answers, "mustKeepLine").trim() || undefined;
  const usableFootage = shortFormDoorUsableFootage(answers);
  const currentDoor = !legacyPurpose.trim();

  if (!videoPurpose || !talkingHeadConfirm || (!currentDoor && !ctaText)) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_FACTS",
      message: currentDoor
        ? "Short-Form Video Editing needs the purpose and the marked-clip confirmation."
        : "Short-Form Video Editing needs the purpose, the marked-clip confirmation, and the customer's call-to-action wording.",
    };
  }

  if (!legacyPurpose.trim() && !usableFootage.trim()) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_FACTS",
      message:
        "Short-Form Video Editing needs the customer to confirm the footage and audio are clear enough to use.",
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

  const sources: { rel: string; abs: string; slotId: string | null }[] = [];
  let pendingUncleared = false;
  for (const item of input.materials) {
    if (isPendingTalkingHead(item, input.campaign.campaignId)) {
      pendingUncleared = true;
      continue;
    }
    if (!isCustomerClearedTalkingHead(item, input.campaign.campaignId)) continue;
    const resolved = resolvedCustomerSourceFile(
      item,
      input.campaign.campaignId,
      input.repoRoot,
    );
    if (resolved && !sources.some((source) => source.rel === resolved.rel)) {
      sources.push({ ...resolved, slotId: item.id ?? null });
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
        "Short-Form Video Editing cannot start without one customer-cleared native-vertical MP4 or MOV on disk.",
    };
  }

  const sourceLimit = currentDoor
    ? studioShortFormCurrentDoorContractV1.sourceMax
    : 1;
  if (sources.length > sourceLimit) {
    return currentDoor
      ? {
          ok: false,
          code: "TOO_MANY_SOURCES",
          message:
            "Short-Form Video Editing accepts up to 3 qualifying clips. Remove the extra video files before production.",
        }
      : {
          ok: false,
          code: "MORE_THAN_ONE_SOURCE",
          message:
            "The footage factory starts from one selected clip. Remove extra video files before production.",
        };
  }

  const source = sources[0]!;
  const currentDoorJob = currentDoor
    ? buildShortFormCurrentDoorJob({
        sources: sources.map((row) => ({
          slotId: row.slotId,
          relativePath: row.rel,
          absolutePath: row.abs,
        })),
        ctaText,
        mustKeepLine,
      })
    : undefined;
  return {
    ok: true,
    sourceAbsolutePath: source.abs,
    sourceRelativePath: source.rel,
    currentDoor: currentDoorJob,
    intake: {
      skuId: SHORT_FORM_VIDEO_EDITING_SKU,
      sourceRelativePath: source.rel,
      ctaText,
      ctaTreatment: currentDoorJob?.cta.treatment,
      mustKeepLine,
      rightsCleared: true,
      language: "en",
    },
  };
}
