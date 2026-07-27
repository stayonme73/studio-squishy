import { NextResponse } from "next/server";

import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { resolveCampaignDisplayName } from "@/lib/campaign-record";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import {
  canAccessStaffProjectCommunication,
  canReplyStaffProjectCommunication,
} from "@/lib/project-communication/access";
import {
  createStudioProjectReply,
  hasStudioReply,
  listProjectCommunicationForStaff,
  type ProjectCommunicationMessage,
} from "@/lib/project-communication";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

type StaffMessageView = ProjectCommunicationMessage & {
  studioHasReplied: boolean;
};

function toStaffMessageViews(
  messages: readonly ProjectCommunicationMessage[],
): StaffMessageView[] {
  return messages.map((message) => ({
    ...message,
    studioHasReplied:
      message.senderRole === "customer"
        ? hasStudioReply(messages, message.id)
        : false,
  }));
}

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

  if (
    !canAccessStaffProjectCommunication(user, campaignId, campaignEnvelope, assignments)
  ) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const listed = await listProjectCommunicationForStaff(campaignId);
  if (!listed.ok) {
    return NextResponse.json({ error: listed.error }, { status: listed.status });
  }

  return NextResponse.json({
    campaignId,
    campaignName: resolveCampaignDisplayName(campaignEnvelope.record),
    campaignStatus: campaignEnvelope.record.campaignStatus,
    clientUserId: campaignEnvelope.clientUserId ?? null,
    messages: toStaffMessageViews(listed.messages),
    syncedAt: listed.envelope.updatedAt,
  });
}

type StudioReplyBody = {
  action: "studio_reply";
  body: string;
  replyToMessageId: string;
  idempotencyKey: string;
};

export async function POST(request: Request, context: RouteContext) {
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

  if (
    !canReplyStaffProjectCommunication(user, campaignId, campaignEnvelope, assignments)
  ) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  let body: StudioReplyBody;
  try {
    body = (await request.json()) as StudioReplyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.action !== "studio_reply") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  if (!body.replyToMessageId?.trim()) {
    return NextResponse.json({ error: "replyToMessageId is required." }, { status: 400 });
  }
  if (!body.idempotencyKey?.trim()) {
    return NextResponse.json({ error: "idempotencyKey is required." }, { status: 400 });
  }

  const listed = await listProjectCommunicationForStaff(campaignId);
  if (!listed.ok) {
    return NextResponse.json({ error: listed.error }, { status: listed.status });
  }

  const target = listed.messages.find((message) => message.id === body.replyToMessageId.trim());
  if (!target || target.senderRole !== "customer") {
    return NextResponse.json(
      { error: "Reply target message was not found." },
      { status: 404 },
    );
  }

  const customerUserId =
    target.customerUserId?.trim() ||
    campaignEnvelope.clientUserId?.trim() ||
    "";
  if (!customerUserId) {
    return NextResponse.json(
      { error: "Customer account is not bound to this project yet." },
      { status: 400 },
    );
  }

  // Staff identity is always derived from the signed session — never from the client body.
  const result = await createStudioProjectReply({
    campaignId,
    customerUserId,
    staffUserId: user.id,
    staffDisplayName: user.displayName ?? user.email,
    body: typeof body.body === "string" ? body.body : "",
    replyToMessageId: body.replyToMessageId.trim(),
    idempotencyKey: body.idempotencyKey.trim(),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    message: result.message,
    replayed: result.replayed,
    messages: toStaffMessageViews(result.envelope.messages),
    syncedAt: result.envelope.updatedAt,
    confirmation: "Reply saved to the project communication record.",
  });
}
