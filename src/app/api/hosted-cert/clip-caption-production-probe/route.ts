import { existsSync, readFileSync } from "fs";
import path from "path";

import { NextResponse } from "next/server";

import { withCampaignArtifactProductionWorkspace } from "@/lib/campaign-design-artifacts";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import { CERTIFICATION_SHARED_CTA } from "@/lib/studio-clip-repurposing/frozen-selection";
import { runClipCaptionProductionProbe } from "@/lib/studio-clip-repurposing/clip-caption-production-probe";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { mapClipRepurposingJobTruthFromJob } from "@/lib/studio-dispatch/map-clip-repurposing-job-truth";
import type { SpeechWord } from "@/lib/studio-short-form-video-editing/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

const DEFAULT_CAMPAIGN_ID = "disposable-hpt-cert-clip_repurposing-6a31a13c";

/** Preview-only — post-finishClipDecisionList caption burn for frozen cert clips. */
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId")?.trim() || DEFAULT_CAMPAIGN_ID;
  const envelope = await readCampaignEnvelope(campaignId);
  const materials = (await readMaterialsEnvelope(campaignId))?.items ?? [];

  try {
    const payload = await withCampaignArtifactProductionWorkspace(
      campaignId,
      async (repoRoot) => {
        const productionSourceTruth = envelope?.record
          ? mapClipRepurposingJobTruthFromJob({
              repoRoot,
              campaign: envelope.record,
              materials,
            })
          : { ok: false as const, code: "MISSING_REQUIRED_FACTS" as const, message: "Campaign record missing." };
        const transcriptAbs = path.join(
          repoRoot,
          "data/campaign-design-artifacts",
          campaignId,
          "clip-factory",
          "transcript-words.json",
        );
        if (!existsSync(transcriptAbs)) {
          return {
            ok: false,
            campaignId,
            message:
              "Clip factory transcript missing. Run launch-menu production once to cache Deepgram words.",
            clips: [],
          };
        }
        const saved = JSON.parse(readFileSync(transcriptAbs, "utf8")) as {
          words: SpeechWord[];
          durationSeconds: number;
        };
        if (!saved.words?.length) {
          return {
            ok: false,
            campaignId,
            message: "Transcript file has no words.",
            clips: [],
          };
        }
        const probe = await runClipCaptionProductionProbe({
          repoRoot,
          campaignId,
          words: saved.words,
          sourceDurationSeconds: saved.durationSeconds,
          ctaText: CERTIFICATION_SHARED_CTA,
          forceFrozenSelection: true,
        });
        return {
          ...probe,
          campaignId,
          productionSourceTruth: productionSourceTruth.ok
            ? {
                ok: true,
                sourceRelativePath: productionSourceTruth.sourceRelativePath,
              }
            : {
                ok: false,
                code: productionSourceTruth.code,
                message: productionSourceTruth.message,
              },
        };
      },
    );
    return NextResponse.json(payload, { status: payload.ok ? 200 : 503 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, campaignId, message, clips: [] }, { status: 503 });
  }
}
