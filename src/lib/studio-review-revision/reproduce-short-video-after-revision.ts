/**
 * After customer revision feedback on short-video timing:
 * adjust packet → (optional Shotstack pipeline OR pre-rendered MP4) → re-bind Review.
 * Owner routine remains NONE. No CapCut. No outside humans.
 */

import { existsSync, writeFileSync } from "fs";
import path from "path";

import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import {
  SHORT_VIDEO_MACHINE_REVIEW_SKU,
  type MachineShortVideoRevisionEmphasis,
} from "@/config/studio-review-revision-full-loop-v1";
import { ensureShortVideoMachineReviewBind } from "@/lib/studio-customer-life/machine-short-video-review-bind";
import { loadShotstackWorkPacket } from "@/lib/studio-kitchen-production/video-integration/work-packet";
import { runShotstackWorkPacketPipeline } from "@/lib/studio-kitchen-production/video-integration/pipeline";
import type { ShotstackWorkPacket } from "@/lib/studio-kitchen-production/video-integration/types";
import { sha256VideoFile } from "@/lib/studio-kitchen-production/video-production/artifact-binding";

import { applyShortVideoTimingRevision } from "./short-video-timing-revision";
import { shouldLengthenPriceDateSceneHolds } from "./short-video-revision-emphasis";

function normalizeRel(rel: string): string {
  return rel.replace(/\\/g, "/").replace(/^\.?\//, "");
}

export async function reproduceShortVideoAfterRevision(input: {
  campaignId: string;
  feedbackText: string;
  basePacketPath: string;
  /**
   * Prefer for tests / already-rendered Room 4B walks.
   * When set, Shotstack pipeline is skipped and this MP4 is re-bound.
   */
  revisedMp4RelativePath?: string;
  revisedContentSha256?: string;
  /** When true and no revised MP4 given, call Shotstack pipeline (live only). */
  runPipeline?: boolean;
  renderVersion?: number;
  emphasis?: MachineShortVideoRevisionEmphasis | null;
}): Promise<{
  ok: boolean;
  campaignId: string;
  adjustedPacket?: ShotstackWorkPacket;
  adjustedPacketRelativePath?: string;
  mp4RelativePath?: string;
  contentSha256?: string;
  message?: string;
}> {
  const envelope = await readCampaignEnvelope(input.campaignId);
  if (!envelope?.record) {
    return { ok: false, campaignId: input.campaignId, message: "Campaign not found." };
  }

  const packetRel = normalizeRel(input.basePacketPath);
  const packetAbs = path.join(process.cwd(), packetRel);
  if (!existsSync(packetAbs)) {
    return {
      ok: false,
      campaignId: input.campaignId,
      message: `Work packet missing at ${packetRel}`,
    };
  }

  const basePacket = loadShotstackWorkPacket(process.cwd(), packetRel);
  const lengthen =
    input.emphasis?.lengthenPriceDateSceneHolds ??
    shouldLengthenPriceDateSceneHolds(input.feedbackText);
  const adjustedBase = applyShortVideoTimingRevision(
    basePacket,
    input.emphasis ??
      (lengthen
        ? {
            packageId: "STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1",
            instruction: input.feedbackText,
            lengthenPriceDateSceneHolds: true,
            holdExtensionSeconds: 1.5,
            sourceRevisionPackageId: "reproduce",
            priorWorkVersionId: null,
            recordedAt: new Date().toISOString(),
          }
        : null),
  );
  const adjusted: ShotstackWorkPacket = {
    ...adjustedBase,
    exportRelativePath: adjustedBase.exportRelativePath.replace(
      /\.mp4$/i,
      "-rev-timing.mp4",
    ),
  };

  const outPacketRel = normalizeRel(
    packetRel.replace(/\.json$/i, "-rev-timing.json"),
  );
  const outPacketAbs = path.join(process.cwd(), outPacketRel);
  writeFileSync(outPacketAbs, `${JSON.stringify(adjusted, null, 2)}\n`, "utf8");

  let mp4Rel = input.revisedMp4RelativePath
    ? normalizeRel(input.revisedMp4RelativePath)
    : undefined;
  let hash = input.revisedContentSha256;

  if (!mp4Rel && input.runPipeline) {
    const pipeline = await runShotstackWorkPacketPipeline({
      repoRoot: process.cwd(),
      packet: adjusted,
    });
    if (!pipeline.ok) {
      return {
        ok: false,
        campaignId: input.campaignId,
        adjustedPacket: adjusted,
        adjustedPacketRelativePath: outPacketRel,
        message: pipeline.message ?? pipeline.verdict,
      };
    }
    mp4Rel = normalizeRel(
      pipeline.artifact?.relativePath ?? adjusted.exportRelativePath,
    );
    hash = pipeline.artifact?.sha256;
  }

  if (!mp4Rel) {
    return {
      ok: false,
      campaignId: input.campaignId,
      adjustedPacket: adjusted,
      adjustedPacketRelativePath: outPacketRel,
      message:
        "Timing packet adjusted. Provide revisedMp4RelativePath (preferred for Room 4B) or runPipeline:true after Shotstack production.",
    };
  }

  const mp4Abs = path.join(process.cwd(), mp4Rel);
  if (!existsSync(mp4Abs)) {
    return {
      ok: false,
      campaignId: input.campaignId,
      adjustedPacket: adjusted,
      adjustedPacketRelativePath: outPacketRel,
      mp4RelativePath: mp4Rel,
      message: `Revised MP4 missing at ${mp4Rel}`,
    };
  }

  const contentSha256 = hash ?? sha256VideoFile(mp4Abs);
  const renderVersion = input.renderVersion ?? 2;

  if (lengthen || input.emphasis) {
    await upsertCampaignRecord(
      {
        ...envelope.record,
        machineShortVideoRevisionEmphasis: undefined,
        updatedAt: new Date().toISOString(),
      },
      envelope.clientUserId,
    );
  }

  await ensureShortVideoMachineReviewBind({
    campaignId: input.campaignId,
    mp4Path: mp4Rel,
    contentSha256,
    durationSeconds: adjusted.durationTargetSeconds,
    renderVersion,
    scriptVersionId: adjusted.scriptVersionId,
    versionLabel: `Version ${renderVersion}`,
    artifactId: `${SHORT_VIDEO_MACHINE_REVIEW_SKU}-v${renderVersion}`,
  });

  return {
    ok: true,
    campaignId: input.campaignId,
    adjustedPacket: adjusted,
    adjustedPacketRelativePath: outPacketRel,
    mp4RelativePath: mp4Rel,
    contentSha256,
  };
}
