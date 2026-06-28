import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isStaffOrOwner } from "@/lib/auth/roles";
import { readSessionFromCookieHeader } from "@/lib/auth/session";

export async function handleProtectedRoutes(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/file-room")) {
    const user = await readSessionFromCookieHeader(request.headers.get("cookie"));
    if (!user || !isStaffOrOwner(user)) {
      return NextResponse.json({ error: "Owner or staff access required" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname === "/api/campaigns") {
    const user = await readSessionFromCookieHeader(request.headers.get("cookie"));
    if (!user || !isStaffOrOwner(user)) {
      return NextResponse.json({ error: "Owner or staff access required" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/campaigns/") && !pathname.startsWith("/api/campaigns/current")) {
    const user = await readSessionFromCookieHeader(request.headers.get("cookie"));
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export default handleProtectedRoutes;

export const config = {
  matcher: ["/file-room", "/file-room/(.*)", "/api/campaigns", "/api/campaigns/(.*)"],
};
