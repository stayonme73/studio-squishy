import { existsSync } from "fs";
import path from "path";

import type { CampaignRecord } from "@/config/studio-board";
import { evaluateShortVideoExactFacts } from "@/lib/studio-design-renderer/short-video-exact-facts";
import { readProjectIntakeAnswer } from "@/lib/project-intake-plan";
import type { CampaignMaterialItem } from "@/lib/materials/types";

const IMAGE_EXT = /\.(png|jpe?g)$/i;
const CUSTOMER_BASIS = new Set(["customer_owns", "customer_has_permission"]);

export type ShortVideoJobTruth =
  | {
      ok: true;
      videoPurpose: string;
      onScreenText: string;
      format: "Vertical";
      stillRelativePaths: readonly string[];
    }
  | {
      ok: false;
      code:
        | "MISSING_REQUIRED_FACTS"
        | "MISSING_USABLE_FOOTAGE"
        | "UNCLEARED_CUSTOMER_STILL"
        | "AMBIGUOUS_CUSTOMER_FACT"
        | "UNSUPPORTED_FOOTAGE_CLAIM"
        | "UNSUPPORTED_SUBSTITUTE"
        | "UNSUPPORTED_PLATE_CLAIM";
      message: string;
    };

function isCustomerClearedStill(item: CampaignMaterialItem): boolean {
  if (item.category !== "photo-video") return false;
  if (item.reviewStatus === "blocked_from_use") return false;
  if (item.uploadStatus !== "stored") return false;
  if (!item.fileName || !IMAGE_EXT.test(item.fileName)) return false;
  if (item.reviewStatus !== "approved_for_use") return false;
  const basis = item.useAuthorization?.basis;
  if (!basis || !CUSTOMER_BASIS.has(basis)) return false;
  return true;
}

function isPendingStill(item: CampaignMaterialItem): boolean {
  if (item.category !== "photo-video") return false;
  if (!item.fileName || !IMAGE_EXT.test(item.fileName)) return false;
  if (item.reviewStatus === "blocked_from_use") return false;
  return (
    item.uploadStatus === "stored" &&
    item.reviewStatus !== "approved_for_use"
  );
}

export function mapShortVideoProjectTruthFromJob(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  materials: readonly CampaignMaterialItem[];
}): ShortVideoJobTruth {
  const answers = input.campaign.routeMapIntake?.answers;
  const skuId = "v2-rtu-short-video";
  const videoPurpose = readProjectIntakeAnswer(answers, "videoPurpose", skuId);
  const onScreenText = readProjectIntakeAnswer(answers, "onScreenText", skuId);
  const format = readProjectIntakeAnswer(answers, "format", skuId) || "Vertical";
  const footageMaterials = readProjectIntakeAnswer(answers, "footageMaterials", skuId);

  const facts = evaluateShortVideoExactFacts({
    videoPurpose,
    onScreenText,
    format,
    footageMaterials,
  });
  if (!facts.ok) {
    return { ok: false, code: facts.code, message: facts.message };
  }

  const stills: string[] = [];
  let pendingUncleared = false;
  for (const item of input.materials) {
    if (isPendingStill(item)) {
      pendingUncleared = true;
      continue;
    }
    if (!isCustomerClearedStill(item)) continue;
    const rel = (item.url ||
      `data/campaign-design-artifacts/${input.campaign.campaignId}/materials/${item.fileName}`)
      .replace(/\\/g, "/");
    if (existsSync(path.join(input.repoRoot, rel)) && !stills.includes(rel)) {
      stills.push(rel);
    }
  }

  if (stills.length === 0 && pendingUncleared) {
    return {
      ok: false,
      code: "UNCLEARED_CUSTOMER_STILL",
      message:
        "Customer stills are on disk but not cleared for use. Wait for the customer. Do not substitute stock or Studio photos.",
    };
  }

  if (stills.length === 0) {
    return {
      ok: false,
      code: "MISSING_USABLE_FOOTAGE",
      message:
        "Short video cannot be produced without 1–4 customer-cleared still photos on disk. The Studio does not invent footage.",
    };
  }

  return {
    ok: true,
    videoPurpose,
    onScreenText,
    format: "Vertical",
    stillRelativePaths: stills.slice(0, 4),
  };
}
