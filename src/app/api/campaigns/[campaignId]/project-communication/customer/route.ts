import { NextResponse } from "next/server";

import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import {
  canCreateCustomerProjectCommunication,
  canReadCustomerProjectCommunication,
} from "@/lib/project-communication/access";
import {
  createCustomerProjectMessage,
  hasStudioReply,
  listProjectCommunicationForCustomer,
  type ProjectCommunicationMessage,
} from "@/lib/project-communication";

type RouteContext = {
  params: Promise<{ campaignId: string }>;
};

/** Customer-safe message view — no staff ids, idempotency keys, or storage paths. */
export type CustomerMessageView = {
  id: string;
  senderRole: "customer" | "studio_staff";
  body: string;
  createdAt: string;
  replyToMessageId: string | null;
  studioHasReplied: boolean | null;
};

function toCustomerMessageViews(
  messages: readonly ProjectCommunicationMessage[],
): CustomerMessageView[] {
  return messages.map((message) => ({
    id: message.id,
    senderRole: message.senderRole,
    body: message.body,
    createdAt: message.createdAt,
    replyToMessageId: message.replyToMessageId,
    studioHasReplied:
      message.senderRole === "customer" ? hasStudioReply(messages, message.id) : null,
  }));
}

export async function GET(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const campaignEnvelope = await readCampaignEnvelope(campaignId);
  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Resource not available" }, { status: 404 });
  }

  if (!canReadCustomerProjectCommunication(user, campaignId, campaignEnvelope)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const listed = await listProjectCommunicationForCustomer(campaignId);
  if (!listed.ok) {
    return NextResponse.json({ error: listed.error }, { status: listed.status });
  }

  return NextResponse.json({
    campaignId,
    messages: toCustomerMessageViews(listed.messages),
    syncedAt: listed.envelope.updatedAt,
  });
}

type CustomerMessageBody = {
  action?: string;
  body?: unknown;
  idempotencyKey?: unknown;
  customerUserId?: unknown;
  senderUserId?: unknown;
  senderRole?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const campaignEnvelope = await readCampaignEnvelope(campaignId);
  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Resource not available" }, { status: 404 });
  }

  if (!canCreateCustomerProjectCommunication(user, campaignId, campaignEnvelope)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  let body: CustomerMessageBody;
  try {
    body = (await request.json()) as CustomerMessageBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Customers may only create customer messages — staff reply is never available here.
  if (body.action != null && body.action !== "customer_message") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  if (!body.idempotencyKey || typeof body.idempotencyKey !== "string" || !body.idempotencyKey.trim()) {
    return NextResponse.json({ error: "idempotencyKey is required." }, { status: 400 });
  }

  // Customer identity and sender role are always derived from the signed session.
  // Arbitrary body fields (customerUserId / senderUserId / senderRole) are ignored.
  const result = await createCustomerProjectMessage({
    campaignId,
    customerUserId: user.id,
    senderUserId: user.id,
    senderDisplayName: user.displayName?.trim() || user.email,
    body: typeof body.body === "string" ? body.body : "",
    idempotencyKey: body.idempotencyKey.trim(),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const listed = await listProjectCommunicationForCustomer(campaignId);
  const messages = listed.ok
    ? toCustomerMessageViews(listed.messages)
    : toCustomerMessageViews(result.envelope.messages);

  return NextResponse.json({
    message: {
      id: result.message.id,
      senderRole: result.message.senderRole,
      body: result.message.body,
      createdAt: result.message.createdAt,
      replyToMessageId: result.message.replyToMessageId,
      studioHasReplied: false,
    } satisfies CustomerMessageView,
    replayed: result.replayed,
    messages,
    syncedAt: result.envelope.updatedAt,
    confirmation: "Message sent to The Studio.",
  });
}
