/**
 * Local caption-baseline proof. Does not reopen set ranking or Shotstack by itself.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";

import { assembleBurnedShort, exactWords, paintExactTextLine } from "@/lib/studio-short-form-video-editing/caption-burn";
import { buildFootageShotstackPayload } from "@/lib/studio-short-form-video-editing/footage-payload";
import { applyDotenvLocal } from "@/lib/studio-short-form-video-editing/load-env-local";
import { resolveFootageRenderEnv } from "@/lib/studio-short-form-video-editing/render-env";
import type { EditDecisionList } from "@/lib/studio-short-form-video-editing/types";
import {
  shotstackDownloadMp4,
  shotstackPollUntilDone,
  shotstackSubmitRender,
} from "@/lib/studio-kitchen-production/video-integration/client";
import { readShotstackApiKey } from "@/lib/studio-kitchen-production/video-integration/config";
import { shotstackUploadLocalFile } from "@/lib/studio-kitchen-production/video-integration/media-ingest";

import { restorePortraitIfLandscape } from "./extract-window";
import { CERTIFICATION_SHARED_CTA } from "./frozen-selection";

const LINES = [
  { id: "short", text: "The Studio" },
  { id: "six-word", text: "They think a bigger menu looks" },
  { id: "ascenders-descenders", text: "paying quality gym flying" },
] as const;

export async function writeCaptionBaselineProof(repoRoot: string) {
  const outDir = path.join(
    repoRoot,
    "docs/launch/studio-operating-clip-repurposing-build-1/live-proof/caption-baseline",
  );
  mkdirSync(outDir, { recursive: true });
  const painted = [];
  const phoneComposites = [];
  for (const [index, line] of LINES.entries()) {
    const barPath = path.join(outDir, `${line.id}.png`);
    const result = await paintExactTextLine({
      text: line.text,
      outputAbsolutePath: barPath,
      width: 1080,
      height: 160,
      fontSize: 44,
      fill: "#ffffff",
      background: "#111111",
      radius: 10,
    });
    if (!result.ok) {
      throw new Error(result.message);
    }
    painted.push({
      id: line.id,
      text: line.text,
      words: result.words,
      wordGapPx: result.wordGapPx,
      sharedSpriteHeight: result.sharedSpriteHeight,
      sharedBaseline: result.sharedBaseline,
    });
    const phone = await sharp({
      create: {
        width: 1080,
        height: 1920,
        channels: 4,
        background: { r: 24, g: 24, b: 24, alpha: 1 },
      },
    })
      .composite([{ input: barPath, left: 0, top: 1920 - 160 - 72 }])
      .jpeg({ quality: 86 })
      .toBuffer();
    const phonePath = path.join(outDir, `${line.id}-phone.jpg`);
    writeFileSync(phonePath, phone);
    const glance = await sharp(phone)
      .resize(390, 693, { fit: "fill" })
      .jpeg({ quality: 86 })
      .toFile(path.join(outDir, `${line.id}-samsung-glance.jpg`));
    void glance;
    phoneComposites.push(phonePath);
    void index;
  }
  const report = {
    paidProduction: false,
    spacingPreservedPx: painted[0]?.wordGapPx,
    sharedSpriteHeights: painted.map((row) => row.sharedSpriteHeight),
    oneSharedHeight: new Set(painted.map((row) => row.sharedSpriteHeight)).size === 1,
    lines: painted,
  };
  writeFileSync(path.join(outDir, "proof.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

export async function produceCaptionBaselineComposite(repoRoot: string) {
  applyDotenvLocal(repoRoot);
  const outDir = path.join(
    repoRoot,
    "docs/launch/studio-operating-clip-repurposing-build-1/live-proof/caption-baseline",
  );
  mkdirSync(outDir, { recursive: true });
  const clipDir = path.join(
    repoRoot,
    "docs/launch/studio-operating-clip-repurposing-build-1/live-proof/clips/c-56-423",
  );
  const sourceAbs = path.join(clipDir, "audio-finished.mp4");
  const edl = JSON.parse(readFileSync(path.join(clipDir, "edl.json"), "utf8")) as EditDecisionList;
  if (!existsSync(sourceAbs) || !edl.ok) {
    throw new Error("Minimum Production proof needs the existing menu-clip extract and EDL.");
  }
  const upright = restorePortraitIfLandscape(sourceAbs);
  if (!upright.ok) {
    throw new Error(upright.message);
  }
  const burned = await assembleBurnedShort({
    sourceAbsolutePath: sourceAbs,
    edl,
    workDirectory: path.join(outDir, "burn-work"),
    outputAbsolutePath: path.join(outDir, "local-composite.mp4"),
    approvedCta: CERTIFICATION_SHARED_CTA,
    transcriptWordsInRange: exactWords(edl.clips[0]?.text ?? ""),
  });
  if (!burned.ok) {
    throw new Error(burned.message);
  }
  const renderEnv = resolveFootageRenderEnv(process.env);
  const shotstackKey = readShotstackApiKey(process.env, renderEnv.envName);
  if (!shotstackKey) {
    throw new Error("Shotstack key absent. Do not paste keys into chat.");
  }
  const uploaded = await shotstackUploadLocalFile({
    absolutePath: burned.outputAbsolutePath,
    apiKey: shotstackKey,
    envName: renderEnv.envName,
  });
  if (!uploaded.ok) {
    throw new Error(uploaded.message);
  }
  const built = buildFootageShotstackPayload({
    sourceUrl: uploaded.sourceUrl,
    edl,
    textAlreadyBurned: true,
  });
  if (!built.ok) {
    throw new Error(built.findings.join("; "));
  }
  const submit = await shotstackSubmitRender(built.payload, {
    apiKey: shotstackKey,
    envName: renderEnv.envName,
    retry: { maxAttempts: 1, baseDelayMs: 0 },
  });
  if (!submit.ok) {
    throw new Error(submit.message);
  }
  const poll = await shotstackPollUntilDone(submit.providerRenderId, {
    apiKey: shotstackKey,
    envName: renderEnv.envName,
    maxAttempts: 60,
    delayMs: 2000,
  });
  if (!poll.ok || poll.status !== "done" || !poll.outputUrl) {
    throw new Error(poll.ok ? poll.error ?? poll.status : poll.message);
  }
  const download = await shotstackDownloadMp4(poll.outputUrl);
  if (!download.ok) {
    throw new Error(download.message);
  }
  const productionPath = path.join(outDir, "production-proof.mp4");
  writeFileSync(productionPath, download.bytes);
  writeFileSync(
    path.join(outDir, "production-proof.json"),
    `${JSON.stringify(
      {
        providerRenderId: submit.providerRenderId,
        credits: poll.credits ?? null,
        renderEnv: renderEnv.envName,
        watermarkExpected: renderEnv.watermarkExpected,
        localComposite: "local-composite.mp4",
        productionProof: "production-proof.mp4",
      },
      null,
      2,
    )}\n`,
  );
  return { productionPath, providerRenderId: submit.providerRenderId };
}
