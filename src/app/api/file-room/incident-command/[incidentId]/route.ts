import { NextResponse } from "next/server";

import { isNextResponse, requireOwner } from "@/lib/auth/require-session";
import { applyRuntimeOwnerAction } from "@/lib/studio-work-supervision/runtime";
import { getLiveSupervisionMachine } from "@/lib/studio-work-supervision/live-runtime";
import { OWNER_ACTIONS, type OwnerActionId } from "@/lib/studio-work-supervision/types";

type RouteContext = {
  params: Promise<{ incidentId: string }>;
};

function isOwnerAction(value: string): value is OwnerActionId {
  return (OWNER_ACTIONS as readonly string[]).includes(value);
}

export async function POST(request: Request, context: RouteContext) {
  const user = await requireOwner(request);
  if (isNextResponse(user)) return user;

  const { incidentId } = await context.params;
  let body: { action?: string; note?: string };
  try {
    body = (await request.json()) as { action?: string; note?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.action || !isOwnerAction(body.action)) {
    return NextResponse.json({ error: "Unknown Owner action." }, { status: 400 });
  }

  const note = body.note?.trim();
  if (!note) {
    return NextResponse.json({ error: "A history note is required." }, { status: 400 });
  }

  try {
    const fixture = applyRuntimeOwnerAction(incidentId, body.action, note);
    return NextResponse.json({ incident: fixture });
  } catch (error) {
    try {
      const live = getLiveSupervisionMachine().applyOwnerAction(incidentId, body.action, note);
      return NextResponse.json({ incident: live });
    } catch {
      const message = error instanceof Error ? error.message : "Owner action failed.";
      const status = /unknown incident/i.test(message) ? 404 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  }
}
