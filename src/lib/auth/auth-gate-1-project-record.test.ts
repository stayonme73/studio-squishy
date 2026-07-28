import { describe, expect, it } from "vitest";

import { config as rootProxyConfig, handleProtectedRoutes } from "../../proxy";
import { config as srcProxyConfig } from "@/proxy";
import { SAFE_RETURN_PATHS, safeReturnPath } from "@/lib/auth/safe-return-path";
import type { CurrentCampaignAccessState } from "@/lib/use-current-campaign";

/** Mirrors CampaignDetailsScene paint order after AUTH-GATE-1. */
export function resolveProjectRecordPaintState(input: {
  ready: boolean;
  accessState: CurrentCampaignAccessState;
  hasCampaign: boolean;
}): "loading" | "auth-required" | "denied" | "no-active-project" | "error" | "empty" | "ready" {
  if (!input.ready) return "loading";
  if (input.accessState === "auth-required") return "auth-required";
  if (input.accessState === "denied") return "denied";
  if (input.accessState === "error") return "error";
  if (input.accessState === "no-active-project") return "no-active-project";
  if (!input.hasCampaign) return "empty";
  return "ready";
}

function makeNextRequest(pathname: string, cookieHeader?: string) {
  const url = new URL(pathname, "http://127.0.0.1:3000");
  const headers = new Headers();
  if (cookieHeader) headers.set("cookie", cookieHeader);
  return {
    url: url.toString(),
    nextUrl: url,
    headers: {
      get(name: string) {
        return headers.get(name);
      },
    },
  } as Parameters<typeof handleProtectedRoutes>[0];
}

describe("AUTH-GATE-1 Project Record page authentication gate", () => {
  it("includes /campaign-details in root and src proxy matchers", () => {
    expect(rootProxyConfig.matcher).toContain("/campaign-details");
    expect(srcProxyConfig.matcher).toContain("/campaign-details");
    for (const route of [
      "/studio-board",
      "/feedback-studio",
      "/review-room",
      "/deliverables",
    ]) {
      expect(rootProxyConfig.matcher).toContain(route);
      expect(srcProxyConfig.matcher).toContain(route);
    }
  });

  it("routes signed-out Project Record to Sign In with safe from=", async () => {
    const response = await handleProtectedRoutes(makeNextRequest("/campaign-details"));
    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("/sign-in");
    expect(location).toContain("from=%2Fcampaign-details");
  });

  it("preserves query on Project Record sign-in return path", async () => {
    const response = await handleProtectedRoutes(
      makeNextRequest("/campaign-details?campaignId=demo-1"),
    );
    expect(response.status).toBe(307);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("from=%2Fcampaign-details%3FcampaignId%3Ddemo-1");
  });

  it("keeps Board, Review, and Delivery signed-out redirects", async () => {
    for (const path of ["/studio-board", "/feedback-studio", "/review-room", "/deliverables"]) {
      const response = await handleProtectedRoutes(makeNextRequest(path));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/sign-in");
      expect(response.headers.get("location")).toContain(`from=${encodeURIComponent(path)}`);
    }
  });

  it("does not gate public Help Center through client-route auth", async () => {
    const response = await handleProtectedRoutes(makeNextRequest("/help-center"));
    // Unmatched public path falls through to next()
    expect(response.status).toBe(200);
  });

  it("allowlists /campaign-details in safe return paths", () => {
    expect(SAFE_RETURN_PATHS.has("/campaign-details")).toBe(true);
    expect(safeReturnPath("/campaign-details")).toBe("/campaign-details");
    expect(safeReturnPath("/campaign-details?arrived=1")).toBe("/campaign-details?arrived=1");
  });

  it("continues rejecting unsafe return paths", () => {
    expect(safeReturnPath("https://evil.example/campaign-details")).toBe("/studio-board");
    expect(safeReturnPath("//evil.example/campaign-details")).toBe("/studio-board");
    expect(safeReturnPath("/studio-conversation-room")).toBe("/studio-board");
    expect(safeReturnPath("/file-room")).toBe("/studio-board");
    expect(safeReturnPath("campaign-details")).toBe("/studio-board");
  });

  it("maps Project Record access states truthfully", () => {
    expect(
      resolveProjectRecordPaintState({
        ready: false,
        accessState: "ready",
        hasCampaign: false,
      }),
    ).toBe("loading");
    expect(
      resolveProjectRecordPaintState({
        ready: true,
        accessState: "auth-required",
        hasCampaign: false,
      }),
    ).toBe("auth-required");
    expect(
      resolveProjectRecordPaintState({
        ready: true,
        accessState: "denied",
        hasCampaign: false,
      }),
    ).toBe("denied");
    expect(
      resolveProjectRecordPaintState({
        ready: true,
        accessState: "error",
        hasCampaign: false,
      }),
    ).toBe("error");
    expect(
      resolveProjectRecordPaintState({
        ready: true,
        accessState: "no-active-project",
        hasCampaign: false,
      }),
    ).toBe("no-active-project");
    expect(
      resolveProjectRecordPaintState({
        ready: true,
        accessState: "ready",
        hasCampaign: false,
      }),
    ).toBe("empty");
    expect(
      resolveProjectRecordPaintState({
        ready: true,
        accessState: "ready",
        hasCampaign: true,
      }),
    ).toBe("ready");
  });
});
