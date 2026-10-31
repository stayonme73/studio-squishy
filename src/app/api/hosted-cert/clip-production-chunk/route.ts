import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { withCampaignArtifactProductionWorkspace } from "@/lib/campaign-design-artifacts";
import {
  runHostedClipProductionStep,
  scheduleHostedClipProductionContinuation,
} from "@/lib/studio-hosted-cert/hosted-clip-production-orchestrator";
import { continueHostedCertLaunchMenuChain } from "@/lib/studio-hosted-cert/continue-launch-menu-chain";
import { isVercelClipFfmpegDelegatedToWorker } from "@/lib/studio-hosted-cert/hosted-clip-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;

function chunkRequestAuthorized(request: Request): boolean {
  const internal = process.env.HOSTED_CERT_INTERNAL_CHUNK_KEY?.trim();
  if (internal) {
    return request.headers.get("x-hosted-cert-internal") === internal;
  }
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (bypass && request.headers.get("x-vercel-protection-bypass") === bypass) {
    return true;
  }
  return process.env.VERCEL_ENV === "preview";
}

type ChunkBody = {
  campaignId?: string;
  finalizeLaunchMenu?: boolean;
  scheduleContinuation?: boolean;
  /** Machine continuation: respond immediately; run the step in after(). */
  dequeueAsync?: boolean;
};

async function runClipProductionChunk(body: ChunkBody): Promise<{
  ok: true;
  campaignId: string;
  stage: string;
  continue: boolean;
  message: string;
  hookOk: boolean | null;
  failureCode: string | null;
  skippedDueToLease: boolean;
}> {
  const campaignId = body.campaignId!.trim();
  const envelope = await readCampaignEnvelope(campaignId);
  const dispatch = envelope?.record.dispatchExecution;
  const record = dispatch?.records?.find((r) => r.skuId === "v2-rtu-clip-repurposing");
  if (!envelope?.record || !record?.executionIdentityReady) {
    throw new Error("no_dispatch_record");
  }

  const step = await withCampaignArtifactProductionWorkspace(campaignId, (repoRoot) =>
    runHostedClipProductionStep({
      repoRoot,
      campaign: envelope.record,
      dispatchRecord: record,
    }),
  );

  if (step.continue && body.scheduleContinuation !== false && !step.skippedDueToLease) {
    // Nested after() from a dequeueAsync worker often never fires; chain eagerly instead.
    await scheduleHostedClipProductionContinuation(
      campaignId,
      body.dequeueAsync ? { eager: true } : undefined,
    );
  }

  if (step.hookResult?.ok && body.finalizeLaunchMenu !== false) {
    await continueHostedCertLaunchMenuChain(campaignId);
  }

  return {
    ok: true,
    campaignId,
    stage: step.stage,
    continue: step.continue,
    message: step.message,
    hookOk: step.hookResult?.ok ?? null,
    failureCode:
      step.failureCode ??
      (step.hookResult && !step.hookResult.ok ? step.hookResult.failureCode : null) ??
      null,
    skippedDueToLease: step.skippedDueToLease ?? false,
  };
}

/** Preview Machine — one resumable clip-factory stage per invocation. */
export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!chunkRequestAuthorized(request)) {
    return NextResponse.json({ error: "chunk_unauthorized" }, { status: 401 });
  }

  let body: ChunkBody;
  try {
    body = (await request.json()) as ChunkBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const campaignId = body.campaignId?.trim();
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId_required" }, { status: 400 });
  }

  if (isVercelClipFfmpegDelegatedToWorker()) {
    return NextResponse.json(
      {
        error: "clip_worker_external",
        message:
          "Preview FFmpeg is delegated to HOSTED_CLIP_WORKER_URL. Do not run serverless video chunks.",
      },
      { status: 409 },
    );
  }

  if (body.dequeueAsync) {
    waitUntil(
      runClipProductionChunk({ ...body, campaignId }).catch((error) => {
        console.error("hosted clip production chunk async worker failed", error);
      }),
    );
    return NextResponse.json({
      ok: true,
      accepted: true,
      campaignId,
      dequeueAsync: true,
    });
  }

  try {
    const result = await runClipProductionChunk({ ...body, campaignId });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "chunk_failed";
    if (message === "no_dispatch_record") {
      return NextResponse.json({ error: "no_dispatch_record" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
