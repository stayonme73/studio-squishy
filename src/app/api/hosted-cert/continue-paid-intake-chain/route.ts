import { NextResponse } from "next/server";

import { continuePaidIntakeOperatingChain } from "@/lib/studio-payment/intake-submit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
  const record = await continuePaidIntakeOperatingChain(campaignId);
  if (!record) {
    return NextResponse.json({ error: "no_record_or_intake" }, { status: 404 });
  }

  const dispatch = record.dispatchExecution;
  const results = dispatch?.designRendererObserver?.results ?? [];

  return NextResponse.json({
    at: started,
    finished: new Date().toISOString(),
    campaignId,
    dispatchStatus: dispatch?.status ?? null,
    designResults: results.map((r) => ({
      skuId: r.skuId,
      action: r.action,
      ok: r.ok,
      failureCode: r.failureCode,
      message: "message" in r && typeof r.message === "string" ? r.message : null,
    })),
  });
}
