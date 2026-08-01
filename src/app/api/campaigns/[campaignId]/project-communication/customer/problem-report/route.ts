import { NextResponse } from "next/server";

import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import {
  canCreateCustomerProjectCommunication,
  canReadCustomerProjectCommunication,
} from "@/lib/project-communication/access";
import { getOrGenerateTasks, readTasksEnvelope, writeTasksEnvelope } from "@/lib/campaign-tasks/store";
import {
  applyClientSubmitProblemReport,
  findLatestComplaintForCampaign,
} from "@/lib/campaign-tasks/problem-report-actions";
import { toProblemReportCustomerView } from "@/lib/campaign-tasks/problem-report-status-view";

/**
 * ISSUE-ENTRY-1 — Customer Problem Reporting Through Project Communication.
 *
 * Sibling of project-communication/customer/route.ts. Ordinary "Ask a question" messages
 * keep using that route unchanged and stay ProjectCommunicationMessage records. This route
 * exists only for the "Report a problem" intent so a problem report is never written into
 * the ordinary message stream — it is submitted through the existing complaint authority
 * (OwnerDecisionInteractionRecord, interactionKind "complaint") instead.
 */
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

  if (!canReadCustomerProjectCommunication(user, campaignId, campaignEnvelope)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Read-only — never generates or writes tasks on a status poll.
  const tasksEnvelope = await readTasksEnvelope(campaignId);
  const interaction = findLatestComplaintForCampaign(tasksEnvelope, campaignId);

  return NextResponse.json({
    campaignId,
    problemReport: interaction ? toProblemReportCustomerView(interaction) : null,
  });
}

type ProblemReportBody = {
  action?: string;
  message?: unknown;
  idempotencyKey?: unknown;
  jobId?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const { campaignId } = await context.params;
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const campaignEnvelope = await readCampaignEnvelope(campaignId);
  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Resource not available" }, { status: 404 });
  }

  // Same authorization boundary as an ordinary customer project message.
  if (!canCreateCustomerProjectCommunication(user, campaignId, campaignEnvelope)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  let body: ProblemReportBody;
  try {
    body = (await request.json()) as ProblemReportBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.action != null && body.action !== "customer_problem_report") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  if (!body.idempotencyKey || typeof body.idempotencyKey !== "string" || !body.idempotencyKey.trim()) {
    return NextResponse.json({ error: "idempotencyKey is required." }, { status: 400 });
  }

  // jobId, when present, must belong to this campaign's own job records — the client
  // cannot bind a report to a job it does not own by spoofing this value; the adapter
  // verifies membership against the authorized campaign's tasksEnvelope.jobRecords.
  const jobId = typeof body.jobId === "string" && body.jobId.trim() ? body.jobId.trim() : undefined;

  const tasksEnvelope = await getOrGenerateTasks(campaignId, campaignEnvelope.record);
  const result = applyClientSubmitProblemReport(
    tasksEnvelope,
    {
      jobId,
      message: typeof body.message === "string" ? body.message : "",
      idempotencyKey: body.idempotencyKey.trim(),
    },
    user,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (!result.replayed) {
    await writeTasksEnvelope(result.envelope);
  }

  return NextResponse.json({
    campaignId,
    replayed: result.replayed,
    problemReport: toProblemReportCustomerView(result.interaction),
    // System-receipt only — never implies a person has read it or that review has begun.
    confirmation: "Received by the Studio system.",
  });
}
