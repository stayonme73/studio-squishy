import { NextResponse } from "next/server";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { canEscalateProjectChange, canReviewInformationUpdateRequest } from "@/lib/project-activity/access";
import {
  applyInformationUpdateRequest,
  classifyInformationUpdateRequest,
  escalateProjectChangeRequest,
  rejectInformationUpdateRequest,
} from "@/lib/project-activity/actions";
import type { RequestClassification } from "@/lib/project-activity/types";
import { applyApprovedProjectChange } from "@/lib/project-change/apply-orchestrator";
import { parseProjectChangeDelta } from "@/lib/project-change/types";

type RouteContext = {
  params: Promise<{ campaignId: string; requestId: string }>;
};

type PatchBody =
  | { action: "classify"; classification: RequestClassification }
  | { action: "apply" }
  | { action: "apply_project_change"; change: { kind: string; serviceId: string } }
  | { action: "reject"; customerReason: string }
  | { action: "escalate" };

export async function PATCH(request: Request, context: RouteContext) {
  const { campaignId, requestId } = await context.params;
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const [campaignEnvelope, assignments] = await Promise.all([
    readCampaignEnvelope(campaignId),
    readCampaignAssignments(),
  ]);

  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Resource not available" }, { status: 404 });
  }

  if (!canReviewInformationUpdateRequest(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = (await request.json()) as PatchBody;

  if (body.action === "classify") {
    if (!body.classification) {
      return NextResponse.json({ error: "classification is required." }, { status: 400 });
    }
    const result = await classifyInformationUpdateRequest({
      campaignId,
      requestId,
      user,
      classification: body.classification,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ requestId, status: result.request.status, classification: result.request.classification });
  }

  if (body.action === "apply") {
    const result = await applyInformationUpdateRequest({ campaignId, requestId, user });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, conflict: result.conflict ?? false },
        { status: result.status },
      );
    }
    return NextResponse.json({ requestId, status: result.request.status });
  }

  if (body.action === "apply_project_change") {
    const change = parseProjectChangeDelta(body.change);
    if (!change) {
      return NextResponse.json({ error: "Invalid project change payload." }, { status: 400 });
    }
    const result = await applyApprovedProjectChange({
      campaignId,
      requestId,
      change,
      user,
      assignments,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, paymentRequired: result.paymentRequired ?? false },
        { status: result.status },
      );
    }
    return NextResponse.json({
      requestId,
      status: result.request.status,
      idempotent: result.idempotent,
      selectedServiceIds: result.approvedStudioPlan?.selectedServiceIds ?? [],
    });
  }

  if (body.action === "reject") {
    if (!body.customerReason?.trim()) {
      return NextResponse.json({ error: "customerReason is required." }, { status: 400 });
    }
    const result = await rejectInformationUpdateRequest({
      campaignId,
      requestId,
      user,
      customerReason: body.customerReason,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ requestId, status: result.request.status });
  }

  if (body.action === "escalate") {
    if (!canEscalateProjectChange(user, campaignId, campaignEnvelope, assignments)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const result = await escalateProjectChangeRequest({
      campaignId,
      requestId,
      user,
      assignments,
      campaign: campaignEnvelope.record,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({
      requestId,
      status: result.request.status,
      exceptionId: result.exceptionId,
      alreadyEscalated: result.alreadyEscalated,
    });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
