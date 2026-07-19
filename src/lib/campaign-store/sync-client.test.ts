import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { CUSTOM_STUDIO_PLAN_PACKAGE_ID } from "@/config/studio-board";
import { SESSION_COOKIE_NAME, createSessionToken } from "@/lib/auth/session";
import type { StudioUser } from "@/lib/campaign-store/types";

import { readCampaignSyncStatus, syncCampaignToServer } from "./sync-client";

function minimalCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Sync Auth Guard Test",
    campaignStatus: "DISCOVERY_COMPLETE",
    campaignDescription: "",
    estimatedCompletion: "",
    packageId: CUSTOM_STUDIO_PLAN_PACKAGE_ID,
    packageLabel: "",
    paymentReceivedAt: null,
    targetCompletionDate: null,
    revisionRoundsIncluded: 1,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
  };
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function makeNextRequest(pathname: string, cookie?: string) {
  return {
    url: `http://localhost${pathname}`,
    nextUrl: new URL(`http://localhost${pathname}`),
    headers: new Headers(cookie ? { Cookie: cookie } : {}),
  } as import("next/server").NextRequest;
}

async function sessionCookie(user: StudioUser): Promise<string> {
  const token = await createSessionToken(user);
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
}

describe("syncCampaignToServer auth guard", () => {
  const campaignId = "sync-auth-guard-campaign";
  let fetchMock: ReturnType<typeof vi.fn>;
  let localStore: Record<string, string>;

  beforeEach(() => {
    vi.stubEnv("ALLOW_FIXTURE_SYNC", "0");
    vi.stubEnv("SESSION_SECRET", "test-session-secret-value");
    localStore = {};
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);
      if (url.endsWith("/api/campaigns/current") && init?.method === "PATCH") {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Unexpected fetch" }), { status: 500 });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      localStorage: {
        getItem(key: string) {
          return localStore[key] ?? null;
        },
        setItem(key: string, value: string) {
          localStore[key] = value;
        },
        removeItem(key: string) {
          delete localStore[key];
        },
      },
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("never calls auth bootstrap endpoints during customer-flow sync", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await syncCampaignToServer(minimalCampaign(campaignId));

    const urls = fetchMock.mock.calls.map((call) => requestUrl(call[0]));
    expect(urls.some((url) => url.includes("/api/auth/login"))).toBe(false);
    expect(urls.some((url) => url.includes("/api/auth/session"))).toBe(false);
    expect(urls).toEqual([expect.stringContaining("/api/campaigns/current")]);
  });

  it("file-room and studio-kitchen remain protected after sync without login", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await syncCampaignToServer(minimalCampaign(campaignId));

    const { handleProtectedRoutes } = await import("../../../proxy");
    const fileRoomRes = await handleProtectedRoutes(makeNextRequest("/file-room"));
    expect(fileRoomRes?.status).toBe(307);
    expect(fileRoomRes?.headers.get("location")).toContain("/sign-in");

    const kitchenRes = await handleProtectedRoutes(makeNextRequest("/studio-kitchen"));
    expect(kitchenRes?.status).toBe(307);
    expect(kitchenRes?.headers.get("location")).toContain("/sign-in");

    const kitchenDetailRes = await handleProtectedRoutes(
      makeNextRequest("/studio-kitchen/demo-campaign"),
    );
    expect(kitchenDetailRes?.status).toBe(307);
    expect(kitchenDetailRes?.headers.get("location")).toContain("/sign-in");

    const status = readCampaignSyncStatus();
    // Remote sync unavailable without session — local campaign remains; do not mark error.
    expect(status?.state).toBe("idle");
  });

  it("does not mint owner/staff session via sync (no /api/auth/* calls)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await syncCampaignToServer(minimalCampaign(campaignId));

    const authCalls = fetchMock.mock.calls.filter((call) => requestUrl(call[0]).includes("/api/auth/"));
    expect(authCalls).toHaveLength(0);
  });

  it.each(["production", "test"])(
    "auth bootstrap stays disabled when NODE_ENV=%s",
    async (nodeEnv) => {
      vi.stubEnv("NODE_ENV", nodeEnv);
      await syncCampaignToServer(minimalCampaign(campaignId));

      const authCalls = fetchMock.mock.calls.filter((call) =>
        requestUrl(call[0]).includes("/api/auth/"),
      );
      expect(authCalls).toHaveLength(0);

      const { handleProtectedRoutes } = await import("../../../proxy");
      const fileRoomRes = await handleProtectedRoutes(makeNextRequest("/file-room"));
      expect(fileRoomRes?.status).toBe(307);
    },
  );

  it("blocks client accounts from staff-only internal routes", async () => {
    const { handleProtectedRoutes } = await import("../../../proxy");
    const clientCookie = await sessionCookie({
      id: "client-1",
      email: "client@example.com",
      displayName: "Client",
      roles: ["client"],
      clientCampaignIds: ["campaign-a"],
    });

    const response = await handleProtectedRoutes(makeNextRequest("/file-room", clientCookie));
    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toContain("/access-denied");
  });

  it("allows staff accounts into File Room", async () => {
    const { handleProtectedRoutes } = await import("../../../proxy");
    const staffCookie = await sessionCookie({
      id: "staff-dev",
      email: "staff@local.dev",
      displayName: "Staff",
      roles: ["staff"],
    });

    const response = await handleProtectedRoutes(makeNextRequest("/file-room", staffCookie));
    expect(response?.status).toBe(200);
  });

  it("routes unauthenticated client surfaces to sign-in", async () => {
    const { handleProtectedRoutes } = await import("../../../proxy");
    const response = await handleProtectedRoutes(makeNextRequest("/studio-board?campaignId=x"));

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toContain("/sign-in");
    expect(response?.headers.get("location")).toContain("from=%2Fstudio-board%3FcampaignId%3Dx");
  });

  it("keeps dev tool APIs staff-only", async () => {
    const { handleProtectedRoutes } = await import("../../../proxy");
    const clientCookie = await sessionCookie({
      id: "client-1",
      email: "client@example.com",
      displayName: "Client",
      roles: ["client"],
    });

    const response = await handleProtectedRoutes(
      makeNextRequest("/api/decision-learner/stats", clientCookie),
    );
    expect(response?.status).toBe(403);
  });
});
