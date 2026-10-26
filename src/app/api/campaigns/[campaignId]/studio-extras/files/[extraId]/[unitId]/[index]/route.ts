import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { requireReadableCampaign } from "@/lib/campaign-store/server-access";
import { studioExtraArtifactAllowed } from "@/lib/studio-extras/customer-view";
import type { StudioExtraState } from "@/lib/studio-extras/types";

type RouteContext = {
  params: Promise<{ campaignId: string; extraId: string; unitId: string; index: string }>;
};

const PROOF_STATES: readonly StudioExtraState[] = ["ready_for_review", "approved", "delivered"];

export async function GET(request: Request, context: RouteContext) {
  const { campaignId, extraId, unitId, index } = await context.params;
  const access = await requireReadableCampaign(
    request,
    campaignId,
    `/api/campaigns/${campaignId}/studio-extras/files`,
  );
  if (access instanceof NextResponse) return access;

  const record = access.campaignEnvelope.record.studioExtras?.records.find((r) => r.id === extraId);
  const artifact = record?.units.find((u) => u.unitId === unitId)?.artifacts[Number(index)];
  if (!record || !artifact || !Number.isInteger(Number(index))) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  const purpose = new URL(request.url).searchParams.get("purpose") === "download" ? "download" : "proof";
  const allowed =
    purpose === "download" ? record.state === "delivered" : PROOF_STATES.includes(record.state);
  if (!allowed || !studioExtraArtifactAllowed(campaignId, artifact)) {
    return NextResponse.json({ error: "File not available." }, { status: 403 });
  }

  let body: Buffer;
  try {
    body = await readFile(path.join(process.cwd(), artifact.path));
  } catch {
    return NextResponse.json({ error: "File not available." }, { status: 404 });
  }
  const fileName = path.basename(artifact.path).replace(/[^\w.-]+/g, "_");
  // Written HTML is never rendered on the Studio origin.
  const inline = purpose === "proof" && artifact.mimeType !== "text/html";
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": artifact.mimeType === "text/html" ? "text/plain; charset=utf-8" : artifact.mimeType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}
