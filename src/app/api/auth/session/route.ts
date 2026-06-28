import { NextResponse } from "next/server";

import { readSessionFromRequest } from "@/lib/auth/session";

export async function GET(request: Request) {
  const user = await readSessionFromRequest(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
