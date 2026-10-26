import { NextResponse } from "next/server";

import { requireReadableCampaign } from "@/lib/campaign-store/server-access";
import {
  isCustomerObservationKind,
  recordCustomerObservation,
} from "@/lib/studio-customer-observation/record";

const ACK =
  "The Studio received your note. It does not start a revision, a refund, or a new service. Someone at The Studio will read it.";

export async function POST(request: Request) {
  let body: { campaignId?: string; jobId?: string; kind?: string; note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "The note could not be read." }, { status: 400 });
  }

  const campaignId = body.campaignId?.trim() ?? "";
  const kind = body.kind?.trim() ?? "";
  const note = body.note?.trim() ?? "";
  if (!campaignId || !isCustomerObservationKind(kind) || note.length < 8 || note.length > 800) {
    return NextResponse.json(
      { error: "Choose a topic and write a short note." },
      { status: 400 },
    );
  }

  const access = await requireReadableCampaign(
    request,
    campaignId,
    "/api/studio-customer-observation",
    body.jobId,
  );
  if (access instanceof NextResponse) return access;

  const saved = await recordCustomerObservation({
    campaignId,
    jobId: body.jobId?.trim() || null,
    userId: access.user.id,
    displayName: access.user.displayName,
    kind,
    note,
  });

  return NextResponse.json({
    ok: true,
    id: saved.id,
    acknowledgement: ACK,
  });
}
