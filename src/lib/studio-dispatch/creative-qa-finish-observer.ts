import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CampaignRecord } from "@/config/studio-board";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { CREATIVE_QA_FINISH_SKU, CREATIVE_QA_MAX_ROUNDS } from "@/lib/studio-creative-qa-finish/contract";
import {
  creativeQaAssetBlock,
  creativeQaFactsText,
  creativeQaStoredAssets,
  finishCreativeQaAsset,
  readCreativeQaSourceBytes,
  sha256,
  type CreativeQaSummary,
} from "@/lib/studio-creative-qa-finish/finish";

import type { DispatchExecutionRecord } from "./types";

export const CREATIVE_QA_FINISH_OBSERVER_PACKAGE_ID = "CREATIVE-QA-FINISH-PRODUCTION-1" as const;

export type CreativeQaFinishedFile = {
  fileName: string;
  absolutePath: string;
  sha256: string;
  marginPx: number;
  revisionRound: number;
  preservedFacts: string;
  requestedCorrection: string;
  sourceSha256: string;
};

export type CreativeQaFinishObserverResult = {
  dispatchId: string;
  skuId: string;
  action: "skipped" | "finished" | "failed";
  ok: boolean;
  failureCode?: string;
  message?: string;
  files?: readonly CreativeQaFinishedFile[];
};

export type CreativeQaFinishObserverPass = {
  packageId: typeof CREATIVE_QA_FINISH_OBSERVER_PACKAGE_ID;
  observedAt: string;
  campaignId: string;
  results: readonly CreativeQaFinishObserverResult[];
};

function whatWeFixedText(files: readonly CreativeQaFinishedFile[]): string {
  const first = files[0];
  const lines = [
    "What We Fixed",
    "",
    "We kept your facts as written:",
    first?.preservedFacts ?? "",
    "",
    "You asked:",
    first?.requestedCorrection ?? "",
    "",
    "What changed:",
    "Each supplied artwork was fitted inside a 1080 by 1080 file with a clean margin. Nothing was cropped, and no words were redrawn.",
    "",
    "Files:",
    ...files.map((file) => file.fileName),
    "",
  ];
  return lines.join("\n");
}

function finishedFileName(sourceFileName: string, revisionRound: number): string {
  const stem = path
    .basename(sourceFileName, path.extname(sourceFileName))
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const safe = stem || "static-asset";
  const suffix = revisionRound > 1 ? `-revision-${revisionRound - 1}` : "";
  return `${safe}-finished${suffix}.png`;
}

function correctionFromCampaign(
  campaign: CampaignRecord,
  explicit: string | undefined,
): string {
  const offered = explicit?.trim() || campaign.condensedOffer?.projectNeed?.trim() || "";
  if (!offered || offered === campaign.condensedOffer?.name) return "";
  return offered;
}

async function existingFinish(
  pngPath: string,
  sidecarPath: string,
  summary: CreativeQaSummary,
): Promise<CreativeQaFinishedFile | null> {
  try {
    const png = await readFile(pngPath);
    const sidecar = JSON.parse(await readFile(sidecarPath, "utf8")) as CreativeQaSummary;
    if (sha256(png) !== summary.outputSha256) return null;
    if (sidecar.sourceSha256 !== summary.sourceSha256) return null;
    if (sidecar.marginPx !== summary.marginPx) return null;
    if (sidecar.preservedFacts !== summary.preservedFacts) return null;
    if (sidecar.requestedCorrection !== summary.requestedCorrection) return null;
    return {
      fileName: path.basename(pngPath),
      absolutePath: pngPath,
      sha256: summary.outputSha256,
      marginPx: summary.marginPx,
      revisionRound: summary.revisionRound,
      preservedFacts: summary.preservedFacts,
      requestedCorrection: summary.requestedCorrection,
      sourceSha256: summary.sourceSha256,
    };
  } catch {
    return null;
  }
}

export async function runCreativeQaFinishObserver(input: {
  campaign: CampaignRecord;
  dispatch: DispatchExecutionRecord;
  materials?: readonly CampaignMaterialItem[];
  outputDir?: string;
  repoRoot?: string;
  revisionRound?: number;
  correctionRequest?: string;
}): Promise<CreativeQaFinishObserverPass> {
  const observedAt = new Date().toISOString();
  const targets = input.dispatch.records.filter(
    (record) => record.skuId === CREATIVE_QA_FINISH_SKU,
  );
  if (targets.length === 0) {
    return {
      packageId: CREATIVE_QA_FINISH_OBSERVER_PACKAGE_ID,
      observedAt,
      campaignId: input.campaign.campaignId,
      results: [],
    };
  }

  const revisionRound = input.revisionRound ?? 1;
  const results: CreativeQaFinishObserverResult[] = [];
  for (const record of targets) {
    if (input.campaign.paymentTruth?.status !== "confirmed") {
      results.push({
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        action: "failed",
        ok: false,
        failureCode: "payment_not_confirmed",
        message: "Creative QA production does not start before payment is confirmed.",
      });
      continue;
    }
    if (!record.executionIdentityReady) {
      results.push({
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        action: "skipped",
        ok: true,
        failureCode: "not_ready",
        message: "Dispatch identity is not ready.",
      });
      continue;
    }
    if (!Number.isInteger(revisionRound) || revisionRound < 1 || revisionRound > CREATIVE_QA_MAX_ROUNDS) {
      results.push({
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        action: "failed",
        ok: false,
        failureCode: "revision_round_exceeded",
        message: "Creative QA & Finish includes 3 revision rounds.",
      });
      continue;
    }

    const materials =
      input.materials ??
      (await readMaterialsEnvelope(input.campaign.campaignId).catch(() => null))?.items ??
      [];
    const facts = creativeQaFactsText(materials);
    const correction = correctionFromCampaign(input.campaign, input.correctionRequest);
    const assets = creativeQaStoredAssets(materials);
    if (assets.length === 0) {
      results.push({
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        action: "failed",
        ok: false,
        failureCode: "asset_missing",
        message: "One existing static asset is required.",
      });
      continue;
    }
    if (!facts) {
      results.push({
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        action: "failed",
        ok: false,
        failureCode: "facts_missing",
        message: "Facts to confirm are missing.",
      });
      continue;
    }
    if (!correction) {
      results.push({
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        action: "failed",
        ok: false,
        failureCode: "correction_missing",
        message: "The correction request is missing.",
      });
      continue;
    }

    const blocked = assets
      .map((asset) => creativeQaAssetBlock(asset))
      .find((entry) => entry != null);
    if (blocked) {
      results.push({
        dispatchId: record.dispatchId,
        skuId: record.skuId,
        action: "failed",
        ok: false,
        failureCode: blocked.code,
        message: blocked.message,
      });
      continue;
    }

    const prepared: { fileName: string; png: Buffer; summary: CreativeQaSummary }[] = [];
    let preparationFailed = false;
    for (const asset of assets) {
      const source = await readCreativeQaSourceBytes(asset);
      if (!source) {
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "failed",
          ok: false,
          failureCode: "source_bytes_missing",
          message: "The static asset is not on the production path.",
        });
        preparationFailed = true;
        break;
      }
      const finished = await finishCreativeQaAsset({
        source,
        facts,
        correctionRequest: correction,
        revisionRound,
      });
      if (!finished.ok) {
        results.push({
          dispatchId: record.dispatchId,
          skuId: record.skuId,
          action: "failed",
          ok: false,
          failureCode: finished.code,
          message: finished.message,
        });
        preparationFailed = true;
        break;
      }
      prepared.push({
        fileName: finishedFileName(asset.fileName ?? "static-asset.png", revisionRound),
        png: finished.png,
        summary: finished.summary,
      });
    }
    if (preparationFailed) continue;

    const outputDir =
      input.outputDir ??
      path.join(
        input.repoRoot ?? process.cwd(),
        "studio-production",
        "creative-qa-finish",
        input.campaign.campaignId,
      );
    await mkdir(outputDir, { recursive: true });
    const files: CreativeQaFinishedFile[] = [];
    const summaryName =
      revisionRound > 1 ? `what-we-fixed-revision-${revisionRound - 1}.txt` : "what-we-fixed.txt";
    for (const entry of prepared) {
      const pngPath = path.join(outputDir, entry.fileName);
      const sidecarPath = `${pngPath}.json`;
      const reused = await existingFinish(pngPath, sidecarPath, entry.summary);
      if (!reused) {
        await writeFile(pngPath, entry.png);
        await writeFile(sidecarPath, JSON.stringify(entry.summary, null, 2));
      }
      files.push(
        reused ?? {
          fileName: entry.fileName,
          absolutePath: pngPath,
          sha256: entry.summary.outputSha256,
          marginPx: entry.summary.marginPx,
          revisionRound: entry.summary.revisionRound,
          preservedFacts: entry.summary.preservedFacts,
          requestedCorrection: entry.summary.requestedCorrection,
          sourceSha256: entry.summary.sourceSha256,
        },
      );
    }
    const summaryPath = path.join(outputDir, summaryName);
    await writeFile(summaryPath, whatWeFixedText(files));
    results.push({
      dispatchId: record.dispatchId,
      skuId: record.skuId,
      action: "finished",
      ok: true,
      message: files.length === 1 ? "One static file finished." : "Static files finished.",
      files,
    });
  }

  return {
    packageId: CREATIVE_QA_FINISH_OBSERVER_PACKAGE_ID,
    observedAt,
    campaignId: input.campaign.campaignId,
    results,
  };
}
