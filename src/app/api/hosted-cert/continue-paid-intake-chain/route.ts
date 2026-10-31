import { after, NextResponse } from "next/server";

import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import type { DispatchExecutionRecord } from "@/lib/studio-dispatch/types";
import { continueHostedCertLaunchMenuChain } from "@/lib/studio-hosted-cert/continue-launch-menu-chain";
import { persistHostedLaunchMenuFailure } from "@/lib/studio-hosted-cert/persist-launch-menu-progress";
import { continuePaidIntakeOperatingChain } from "@/lib/studio-payment/intake-submit";

async function persistLaunchMenuDispatchHeartbeat(campaignId: string): Promise<string | null> {
  const envelope = await readCampaignEnvelope(campaignId);
  const dispatch = envelope?.record.dispatchExecution;
  if (!envelope?.record || !dispatch) return null;
  const chainStartedAt = new Date().toISOString();
  await upsertCampaignRecord(
    {
      ...envelope.record,
      dispatchExecution: {
        ...dispatch,
        lastAttemptAt: chainStartedAt,
      },
      updatedAt: chainStartedAt,
    },
    envelope.clientUserId,
  );
  return chainStartedAt;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Clip/SFV heavy lanes (Deepgram + multi-Shotstack) need headroom on Preview cert. */
export const maxDuration = 800;

function mapLaunchResults(dispatch: DispatchExecutionRecord | null | undefined) {
  const designResults = dispatch?.designRendererObserver?.results ?? [];
  const launchResults = dispatch?.launchMenuProductionObserver?.results ?? [];
  return {
    dispatchStatus: dispatch?.status ?? null,
    dispatchLastAttemptAt: dispatch?.lastAttemptAt ?? null,
    launchMenuObservedAt: dispatch?.launchMenuProductionObserver?.observedAt ?? null,
    designResults: designResults.map((r) => ({
      skuId: r.skuId,
      action: r.action,
      ok: r.ok,
      failureCode: r.failureCode,
      message: "message" in r && typeof r.message === "string" ? r.message : null,
    })),
    launchResults: launchResults.map((r) => ({
      skuId: r.skuId,
      action: r.action,
      ok: r.ok,
      failureCode: r.failureCode,
      message: "message" in r && typeof r.message === "string" ? r.message : null,
      clipFileCount: "clipFiles" in r && Array.isArray(r.clipFiles) ? r.clipFiles.length : 0,
    })),
  };
}

/** Preview-only disposable cert — re-run dispatch observers after runtime fixes. */
export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { campaignId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const campaignId = body.campaignId?.trim();
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId_required" }, { status: 400 });
  }

  const started = new Date().toISOString();
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "launch-menu-only";
  /** Launch-menu cert must run inline: async after() often dies at maxDuration without terminal observer. */
  const requestedMode = url.searchParams.get("mode");
  const mode =
    scope === "launch-menu-only"
      ? "sync"
      : (requestedMode ?? "async");
  const runChain =
    scope === "full"
      ? continuePaidIntakeOperatingChain
      : continueHostedCertLaunchMenuChain;

  if (mode === "sync") {
    const record = await runChain(campaignId);
    if (!record) {
      return NextResponse.json({ error: "no_record_or_intake" }, { status: 404 });
    }
    return NextResponse.json({
      at: started,
      finished: new Date().toISOString(),
      campaignId,
      mode: "sync",
      scope,
      ...mapLaunchResults(record.dispatchExecution),
    });
  }

  const dispatchLastAttemptAt = await persistLaunchMenuDispatchHeartbeat(campaignId);

  after(async () => {
    try {
      await runChain(campaignId);
    } catch (error) {
      console.error("hosted-cert continue-paid-intake-chain failed", error);
      await persistHostedLaunchMenuFailure({
        campaignId,
        failureCode: "LAUNCH_MENU_CHAIN_FAILED",
        message: error instanceof Error ? error.message : "Launch-menu chain failed.",
      });
    }
  });

  return NextResponse.json({
    ok: true,
    at: started,
    campaignId,
    mode: "async",
    scope,
    dispatchLastAttemptAt,
    message:
      "Launch-menu production scheduled on Preview (after). Poll dispatch observer + job spine.",
  });
}
