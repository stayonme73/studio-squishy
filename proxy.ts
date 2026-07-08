import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isStaffOrOwner } from "@/lib/auth/roles";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { resolveAccessDeniedRoomFromPath } from "@/config/access-control";
import { logAccessEvent } from "@/lib/security/access-log";

function isInternalRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/file-room") ||
    pathname.startsWith("/studio-kitchen") ||
    pathname.startsWith("/decision-learner")
  );
}

function isClientRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/studio-board") ||
    pathname.startsWith("/feedback-studio") ||
    pathname.startsWith("/review-room") ||
    pathname.startsWith("/deliverables")
  );
}

function signInRedirect(request: NextRequest) {
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("from", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

function accessDeniedRedirect(request: NextRequest) {
  const room = resolveAccessDeniedRoomFromPath(request.nextUrl.pathname);
  const url = new URL("/access-denied", request.url);
  if (room !== "customer") {
    url.searchParams.set("room", room);
  }
  return NextResponse.redirect(url);
}

export async function handleProtectedRoutes(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isInternalRoute(pathname)) {
    const user = await readSessionFromCookieHeader(request.headers.get("cookie"));
    if (!user || !isStaffOrOwner(user)) {
      logAccessEvent({
        kind: user ? "staff_route_denied" : "auth_required",
        route: pathname,
        user,
        reason: "internal_route",
      });
      if (!user) return signInRedirect(request);
      return accessDeniedRedirect(request);
    }
    return NextResponse.next();
  }

  if (isClientRoute(pathname)) {
    const user = await readSessionFromCookieHeader(request.headers.get("cookie"));
    if (!user) {
      logAccessEvent({ kind: "auth_required", route: pathname });
      return signInRedirect(request);
    }
    return NextResponse.next();
  }

  if (pathname === "/api/campaigns") {
    const user = await readSessionFromCookieHeader(request.headers.get("cookie"));
    if (!user || !isStaffOrOwner(user)) {
      logAccessEvent({
        kind: user ? "staff_route_denied" : "auth_required",
        route: pathname,
        user,
        reason: "campaign_list_api",
      });
      return NextResponse.json(
        { error: user ? "Access denied" : "Authentication required" },
        { status: user ? 403 : 401 },
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/decision-learner")) {
    const user = await readSessionFromCookieHeader(request.headers.get("cookie"));
    if (!user || !isStaffOrOwner(user)) {
      logAccessEvent({
        kind: user ? "staff_route_denied" : "auth_required",
        route: pathname,
        user,
        reason: "dev_tool_api",
      });
      return NextResponse.json(
        { error: user ? "Access denied" : "Authentication required" },
        { status: user ? 403 : 401 },
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/campaigns/") && !pathname.startsWith("/api/campaigns/current")) {
    const user = await readSessionFromCookieHeader(request.headers.get("cookie"));
    if (!user) {
      logAccessEvent({ kind: "auth_required", route: pathname });
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const proxy = handleProtectedRoutes;

export default handleProtectedRoutes;

export const config = {
  matcher: [
    "/file-room",
    "/file-room/(.*)",
    "/studio-kitchen",
    "/studio-kitchen/(.*)",
    "/decision-learner",
    "/decision-learner/(.*)",
    "/studio-board",
    "/feedback-studio",
    "/review-room",
    "/deliverables",
    "/api/campaigns",
    "/api/campaigns/(.*)",
    "/api/decision-learner",
    "/api/decision-learner/(.*)",
  ],
};
