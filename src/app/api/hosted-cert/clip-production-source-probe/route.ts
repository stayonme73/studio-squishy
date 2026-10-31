import { NextResponse } from "next/server";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { withCampaignArtifactProductionWorkspace } from "@/lib/campaign-design-artifacts";
import { readMaterialsEnvelope } from "@/lib/materials/store";
import { mapClipRepurposingJobTruthFromJob } from "@/lib/studio-dispatch/map-clip-repurposing-job-truth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DEFAULT_CAMPAIGN_ID = "disposable-hpt-cert-clip_repurposing-6a31a13c";

/** Preview-only — same hydrate + source truth gate as launch-menu clip production. */
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId")?.trim() || DEFAULT_CAMPAIGN_ID;
  const envelope = await readCampaignEnvelope(campaignId);
  if (!envelope?.record) {
    return NextResponse.json({ ok: false, campaignId, message: "Campaign record missing." }, { status: 404 });
  }
  const materials = (await readMaterialsEnvelope(campaignId))?.items ?? [];

  try {
    const payload = await withCampaignArtifactProductionWorkspace(
      campaignId,
      async (repoRoot) => {
        const truth = mapClipRepurposingJobTruthFromJob({
          repoRoot,
          campaign: envelope.record,
          materials,
        });
        return { repoRoot, truth };
      },
    );
    return NextResponse.json({
      ok: payload.truth.ok,
      campaignId,
      productionSourceTruth: payload.truth.ok
        ? { ok: true, sourceRelativePath: payload.truth.sourceRelativePath }
        : {
            ok: false,
            code: payload.truth.code,
            message: payload.truth.message,
          },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, campaignId, message }, { status: 503 });
  }
}
