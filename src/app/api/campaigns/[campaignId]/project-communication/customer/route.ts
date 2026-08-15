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
import {
  handleCustomerBoardQuestion,
  machineAnswerForMessage,
  readCustomerLifeEnvelope,
  readCustomerLifeStatus,
} from "@/lib/studio-customer-life/communication-loop";
import type { MachineAnswerView } from "@/lib/studio-customer-life/communication-loop";

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
  machineAnswer: MachineAnswerView | null;
};

function toCustomerMessageViews(
  messages: readonly ProjectCommunicationMessage[],
  lifeAsks: Awaited<ReturnType<typeof readCustomerLifeEnvelope>> | null,
): CustomerMessageView[] {
  return messages.map((message) => ({
    id: message.id,
    senderRole: message.senderRole,
    body: message.body,
    createdAt: message.createdAt,
    replyToMessageId: message.replyToMessageId,
    studioHasReplied:
      message.senderRole === "customer" ? hasStudioReply(messages, message.id) : null,
    machineAnswer: lifeAsks ? machineAnswerForMessage(lifeAsks, message) : null,
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

  const life = await readCustomerLifeEnvelope(campaignId);
  const status = await readCustomerLifeStatus(campaignId);

  return NextResponse.json({
    campaignId,
    messages: toCustomerMessageViews(listed.messages, life),
    studioRequests: status.studioRequests,
    communicationSummary: status.summary,
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

  let loop: Awaited<ReturnType<typeof handleCustomerBoardQuestion>> | null = null;
  try {
    loop = result.replayed
      ? null
      : await handleCustomerBoardQuestion({
          campaignId,
          question: result.message.body,
          commMessageId: result.message.id,
        });
  } catch {
    loop = {
      answer: {
        intent: "unknown",
        text: "",
        known: false,
        phase: "no_project",
        source: "none",
      },
      truth: (await readCustomerLifeStatus(campaignId)).truth,
      confirmation:
        "We received your message and attached it to this project. The Studio could not look up the live record just now, so it will not guess. Please ask again in a moment.",
      machineAnswer: {
        text: "I could not reach the live project record just now, so I will not guess. Please ask again in a moment, or check your Studio Board.",
        known: false,
        source: "none",
        intent: "unknown",
        askState: "waiting_for_studio",
        lookupFailed: true,
      },
      studioRequests: [],
    };
  }

  const listed = await listProjectCommunicationForCustomer(campaignId);
  const life = await readCustomerLifeEnvelope(campaignId);
  const messages = listed.ok
    ? toCustomerMessageViews(listed.messages, life)
    : toCustomerMessageViews(result.envelope.messages, life);
  const machineAnswer =
    loop?.machineAnswer ??
    machineAnswerForMessage(life, result.message);

  return NextResponse.json({
    message: {
      id: result.message.id,
      senderRole: result.message.senderRole,
      body: result.message.body,
      createdAt: result.message.createdAt,
      replyToMessageId: result.message.replyToMessageId,
      studioHasReplied: false,
      machineAnswer,
    } satisfies CustomerMessageView,
    replayed: result.replayed,
    messages,
    studioRequests: loop?.studioRequests ?? (await readCustomerLifeStatus(campaignId)).studioRequests,
    confirmation: "Message sent to The Studio.",
    machineConfirmation: loop?.confirmation ??
      (machineAnswer?.known
        ? "We received your question and answered it from the project record."
        : undefined),
    syncedAt: result.envelope.updatedAt,
  });
}
