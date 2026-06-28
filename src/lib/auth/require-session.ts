import { NextResponse } from "next/server";

import type { StudioUser } from "@/lib/campaign-store/types";
import { readSessionFromRequest } from "@/lib/auth/session";
import { isStaffOrOwner } from "@/lib/auth/roles";

export async function requireSession(request: Request): Promise<StudioUser | NextResponse> {
  const user = await readSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  return user;
}

export async function requireStaffOrOwner(request: Request): Promise<StudioUser | NextResponse> {
  const user = await requireSession(request);
  if (user instanceof NextResponse) return user;
  if (!isStaffOrOwner(user)) {
    return NextResponse.json({ error: "Owner or staff access required" }, { status: 403 });
  }
  return user;
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
