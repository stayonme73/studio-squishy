import { NextResponse } from "next/server";

import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { isRequestTargetKey } from "@/lib/customer-field-tokens";
import {
  canReadProjectActivity,
  canRespondProjectChangeConsent,
  canReviewInformationUpdateRequest,
  canSubmitInformationUpdateRequest,
} from "@/lib/project-activity/access";
import { submitInformationUpdateRequest } from "@/lib/project-activity/actions";
import {
  countPendingCustomerRequests,
  projectActivityToCustomerTimeline,
  resolveCustomerPendingProjectChangeConsent,
} from "@/lib/project-activity/customer-view";
import { getOrInitializeProjectActivity } from "@/lib/project-activity/store";
import { orchestrateProjectChangeConsentResponse } from "@/lib/project-change/consent-orchestrator";
import type { ProjectChangeConsentResponse } from "@/lib/project-change/consent-response";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const [campaignEnvelope, assignments] = await Promise.all([
    readCampaignEnvelope(campaignId),
    readCampaignAssignments(),
  ]);

  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Resource not available" }, { status: 404 });
  }

  if (!canReadProjectActivity(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const envelope = await getOrInitializeProjectActivity(campaignId);
  const events = projectActivityToCustomerTimeline(envelope.events);
  const staffReview = canReviewInformationUpdateRequest(
    user,
    campaignId,
    campaignEnvelope,
    assignments,
  );
  const pendingProjectChangeConsent = resolveCustomerPendingProjectChangeConsent(envelope);

  return NextResponse.json({
    events,
    pendingCount: countPendingCustomerRequests(envelope.requests),
    syncedAt: envelope.updatedAt,
    ...(pendingProjectChangeConsent ? { pendingProjectChangeConsent } : {}),
    ...(staffReview ? { requests: envelope.requests } : {}),
  });
}

type SubmitRequestBody = {
  action: "submit_request";
  idempotencyKey: string;
  targetKey: string;
  requestedValue: string;
  note?: string;
  confirmScopeDisclaimer: boolean;
};

type ConsentResponseBody = {
  action: "respond_project_change_consent";
  requestId: string;
  response: ProjectChangeConsentResponse;
};

type PostBody = SubmitRequestBody | ConsentResponseBody;

function isConsentResponse(value: ProjectChangeConsentResponse): boolean {
  return value === "granted" || value === "declined";
}

export async function POST(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const campaignEnvelope = await readCampaignEnvelope(campaignId);
  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Resource not available" }, { status: 404 });
  }

  const body = (await request.json()) as PostBody;

  if (body.action === "respond_project_change_consent") {
    if (!canRespondProjectChangeConsent(user, campaignId, campaignEnvelope)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!body.requestId?.trim()) {
      return NextResponse.json({ error: "requestId is required." }, { status: 400 });
    }
    if (!isConsentResponse(body.response)) {
      return NextResponse.json({ error: "response must be granted or declined." }, { status: 400 });
    }

    const tasksEnvelope = await readTasksEnvelope(campaignId);
    if (!tasksEnvelope) {
      return NextResponse.json({ error: "Owner Desk record is not available." }, { status: 404 });
    }

    const result = await orchestrateProjectChangeConsentResponse({
      campaignId,
      requestId: body.requestId.trim(),
      response: body.response,
      user,
      tasksEnvelope,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      requestId: result.request.id,
      consentStatus: result.request.consentStatus,
      status: result.request.status,
      idempotent: result.idempotent,
      message: result.response === "granted" ? "Confirmation recorded" : "Response recorded",
    });
  }

  if (body.action !== "submit_request") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  if (!canSubmitInformationUpdateRequest(user, campaignId, campaignEnvelope)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (!body.confirmScopeDisclaimer) {
    return NextResponse.json({ error: "Scope disclaimer confirmation is required." }, { status: 400 });
  }
  if (!body.idempotencyKey?.trim()) {
    return NextResponse.json({ error: "idempotencyKey is required." }, { status: 400 });
  }
  if (!isRequestTargetKey(body.targetKey)) {
    return NextResponse.json({ error: "Invalid request target." }, { status: 400 });
  }
  if (!body.requestedValue?.trim()) {
    return NextResponse.json({ error: "requestedValue is required." }, { status: 400 });
  }

  const result = await submitInformationUpdateRequest({
    campaignId,
    user,
    idempotencyKey: body.idempotencyKey.trim(),
    targetKey: body.targetKey,
    requestedValue: body.requestedValue,
    note: body.note,
    campaign: campaignEnvelope.record,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    requestId: result.request.id,
    status: result.request.status,
    message: "Request received",
  });
}
