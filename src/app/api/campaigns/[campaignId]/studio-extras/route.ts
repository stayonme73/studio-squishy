import { after, NextResponse } from "next/server";

import { readCampaignEnvelope, upsertCampaignRecord } from "@/lib/campaign-store/store";
import { requireReadableCampaign } from "@/lib/campaign-store/server-access";
import { getOrGenerateTasks } from "@/lib/campaign-tasks/store";
import { deriveCorrectionAccounting } from "@/lib/job-control/correction-round-ledger";
import { studioRevisionToReviewRoundTripV1 } from "@/config/studio-revision-to-review-round-trip-v1";
import { feedbackStudio } from "@/config/feedback-studio";
import { advanceStudioExtras } from "@/lib/studio-extras/advance";
import { resolveStudioExtrasCustomerView } from "@/lib/studio-extras/customer-view";
import {
  approveAndDeliverReadyStudioExtras,
  requestStudioExtrasChanges,
  type StudioExtraChangeRequest,
} from "@/lib/studio-extras/machine";
import { studioExtrasRoundUsage } from "@/lib/studio-extras/rounds";
import { isStudioExtraId } from "@/lib/studio-extras/selection";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

type StudioExtrasActionBody =
  | { action: "approve"; extraIds?: readonly string[] }
  | { action: "request_changes"; changes: readonly { id: string; note: string }[] };

export async function GET(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const access = await requireReadableCampaign(
    request,
    campaignId,
    `/api/campaigns/${campaignId}/studio-extras`,
  );
  if (access instanceof NextResponse) return access;
  const view = await resolveStudioExtrasCustomerView(access.campaignEnvelope.record);
  return NextResponse.json({ studioExtras: view });
}

export async function POST(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const access = await requireReadableCampaign(
    request,
    campaignId,
    `/api/campaigns/${campaignId}/studio-extras`,
  );
  if (access instanceof NextResponse) return access;
  const { user, campaignEnvelope } = access;

  let body: StudioExtrasActionBody;
  try {
    body = (await request.json()) as StudioExtrasActionBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const campaign = campaignEnvelope.record;
  const truth = campaign.studioExtras;
  if (!truth || truth.records.length === 0) {
    return NextResponse.json({ error: "This order has no Studio Extras." }, { status: 404 });
  }
  const at = new Date().toISOString();

  if (body.action === "approve") {
    const only = body.extraIds?.filter(isStudioExtraId);
    const result = approveAndDeliverReadyStudioExtras(truth, at, only);
    if (result.approved.length === 0) {
      return NextResponse.json(
        { error: "There is no Studio Extra waiting for your approval." },
        { status: 422 },
      );
    }
    await upsertCampaignRecord({ ...campaign, studioExtras: result.truth, updatedAt: at }, user.id);
    const saved = (await readCampaignEnvelope(campaignId))?.record ?? campaign;
    return NextResponse.json({ studioExtras: await resolveStudioExtrasCustomerView(saved) });
  }

  if (body.action === "request_changes") {
    const changes: StudioExtraChangeRequest[] = [];
    for (const change of body.changes ?? []) {
      if (!isStudioExtraId(change.id)) {
        return NextResponse.json({ error: "That Studio Extra is not part of this order." }, { status: 422 });
      }
      changes.push({ id: change.id, note: String(change.note ?? "") });
    }
    const tasksEnvelope = await getOrGenerateTasks(campaignId, campaign);
    const accounting = deriveCorrectionAccounting({ campaign, envelope: tasksEnvelope });
    const extrasRounds = studioExtrasRoundUsage(truth);
    if (accounting.pending.length > 0 || extrasRounds.pending > 0) {
      return NextResponse.json(
        {
          error: studioRevisionToReviewRoundTripV1.customerCopy.revisionAlreadyInFlight,
          revisionAlreadyInFlight: true,
        },
        { status: 422 },
      );
    }
    if (accounting.remaining <= 0) {
      return NextResponse.json(
        { error: feedbackStudio.feedbackPanel.revisionLimitShort, revisionLimitReached: true },
        { status: 422 },
      );
    }
    const result = requestStudioExtrasChanges(truth, changes, {
      at,
      packageRound: accounting.used + 1,
      ridesPackageRevision: false,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    const saved = await upsertCampaignRecord(
      { ...campaign, studioExtras: result.truth, updatedAt: at },
      user.id,
    );
    after(async () => {
      await advanceStudioExtras(saved.record);
    });
    return NextResponse.json({ studioExtras: await resolveStudioExtrasCustomerView(saved.record) });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
