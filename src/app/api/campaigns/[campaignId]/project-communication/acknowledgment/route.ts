import { NextResponse } from "next/server";

import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import {
  acknowledgeStudioReply,
  canReadStudioReplyAcknowledgment,
  canWriteStudioReplyAcknowledgment,
  getStudioReplyNotificationState,
} from "@/lib/project-communication-ack";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const campaignEnvelope = await readCampaignEnvelope(campaignId);
  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Resource not available" }, { status: 404 });
  }

  if (!canReadStudioReplyAcknowledgment(user, campaignId, campaignEnvelope)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const result = await getStudioReplyNotificationState(campaignId, user.id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    campaignId,
    notification: result.notification,
  });
}

type AcknowledgeBody = {
  action?: string;
  studioReplyMessageId?: unknown;
  customerUserId?: unknown;
  channel?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const campaignEnvelope = await readCampaignEnvelope(campaignId);
  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Resource not available" }, { status: 404 });
  }

  if (!canWriteStudioReplyAcknowledgment(user, campaignId, campaignEnvelope)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  let body: AcknowledgeBody;
  try {
    body = (await request.json()) as AcknowledgeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.action !== "acknowledge_studio_reply") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  if (
    typeof body.studioReplyMessageId !== "string" ||
    !body.studioReplyMessageId.trim()
  ) {
    return NextResponse.json(
      { error: "studioReplyMessageId is required." },
      { status: 400 },
    );
  }

  const channel =
    body.channel === "customer_board_communication_section"
      ? "customer_board_communication_section"
      : "customer_board_view_messages";

  // Customer identity is always session-derived — body.customerUserId is ignored.
  const result = await acknowledgeStudioReply({
    campaignId,
    customerUserId: user.id,
    studioReplyMessageId: body.studioReplyMessageId.trim(),
    channel,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    campaignId,
    notification: result.notification,
    replayed: result.replayed,
    confirmation: "Reply notice updated.",
  });
}
