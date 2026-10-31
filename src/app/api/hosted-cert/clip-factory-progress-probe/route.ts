import { existsSync, readFileSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";

import { HOSTED_CLIP_PREVIEW_RENDER_SPLIT_V1 } from "@/config/hosted-clip-preview-render-split-v1";
import { readHostedClipProductionCheckpoint } from "@/lib/studio-hosted-cert/clip-production-checkpoint";
import { withCampaignArtifactProbeWorkspace } from "@/lib/campaign-design-artifacts";

/** Preview cert — read durable clip-factory checkpoint (not heartbeat). */
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaignId")?.trim();
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId_required" }, { status: 400 });
  }

  try {
    const snapshot = await withCampaignArtifactProbeWorkspace(
      campaignId,
      async (repoRoot) => {
        const root = path.join(
          repoRoot,
          "data/campaign-design-artifacts",
          campaignId,
          "clip-factory",
        );
        const spendAbs = path.join(root, "factory-spend.json");
        const setAbs = path.join(root, "set-result.json");
        const transcriptAbs = path.join(root, "transcript-words.json");
        const clipsRoot = path.join(root, "clips");
        let spend: Record<string, unknown> | null = null;
        type SetResultSnapshot = {
          files?: { clipId?: string; contentSha256?: string }[];
        };
        let setResult: SetResultSnapshot | null = null;
        if (existsSync(spendAbs)) {
          spend = JSON.parse(readFileSync(spendAbs, "utf8")) as Record<string, unknown>;
        }
        if (existsSync(setAbs)) {
          setResult = JSON.parse(readFileSync(setAbs, "utf8")) as SetResultSnapshot;
        }
        const clipIds: string[] = [];
        const productionMp4ByClipId: Record<string, boolean> = {};
        if (existsSync(clipsRoot)) {
          const { readdirSync } = await import("fs");
          for (const name of readdirSync(clipsRoot, { withFileTypes: true })) {
            if (name.isDirectory()) {
              clipIds.push(name.name);
              productionMp4ByClipId[name.name] = existsSync(
                path.join(clipsRoot, name.name, "production.mp4"),
              );
            }
          }
        }
        const checkpoint = readHostedClipProductionCheckpoint(repoRoot, campaignId);
        const productionMp4Count = Object.values(productionMp4ByClipId).filter(Boolean).length;
        const leaseUntil = checkpoint?.leaseUntil ?? null;
        const leaseActive =
          leaseUntil != null && Date.parse(leaseUntil) > Date.now();
        let audioFinishedClipIds: string[] = [];
        let paintedWordsClipIds: string[] = [];
        let localProofClipIds: string[] = [];
        if (existsSync(clipsRoot)) {
          const { readdirSync } = await import("fs");
          for (const name of readdirSync(clipsRoot, { withFileTypes: true })) {
            if (!name.isDirectory()) continue;
            const clipDir = path.join(clipsRoot, name.name);
            if (existsSync(path.join(clipDir, "audio-finished.mp4"))) {
              audioFinishedClipIds.push(name.name);
            }
            if (existsSync(path.join(clipDir, "burn-work", "painted-words.json"))) {
              paintedWordsClipIds.push(name.name);
            }
            if (
              existsSync(path.join(clipDir, "local-text-proof.mp4")) ||
              existsSync(path.join(clipDir, "local-proof.mp4"))
            ) {
              localProofClipIds.push(name.name);
            }
          }
        }
        return {
          previewRenderSplitPhases: [...HOSTED_CLIP_PREVIEW_RENDER_SPLIT_V1],
          hasTranscript: existsSync(transcriptAbs),
          factorySpend: spend,
          renderedClipIds: clipIds,
          productionMp4Count,
          productionMp4ByClipId,
          audioFinishedClipIds,
          paintedWordsClipIds,
          localProofClipIds,
          checkpointStage: checkpoint?.stage ?? null,
          checkpointNextRenderIndex: checkpoint?.nextRenderIndex ?? null,
          checkpointCompletedClipCount: checkpoint?.completedClips?.length ?? 0,
          checkpointUpdatedAt: checkpoint?.updatedAt ?? null,
          checkpointLeaseUntil: leaseUntil,
          checkpointLeaseActive: leaseActive,
          setResultFileCount: setResult?.files?.length ?? 0,
          setResultShas: (setResult?.files ?? [])
            .map((f) => f.contentSha256?.slice(0, 12))
            .filter(Boolean),
        };
      },
    );
    return NextResponse.json({ ok: true, campaignId, ...snapshot });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        campaignId,
        message: error instanceof Error ? error.message : "clip_factory_progress_failed",
      },
      { status: 500 },
    );
  }
}
