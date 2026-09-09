import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";
import { localCustomerOneAuthFixtureCopy } from "@/lib/auth/local-customer-one-fixture-copy";
import {
  LOCAL_CUSTOMER_ONE_FIXTURE_ID,
  pickLocalCustomerOnePaidFlyerCampaign,
  pickLocalCustomerOneRecord,
  resolveLocalCustomerOneUser,
} from "@/lib/auth/local-customer-one-fixture";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { listStudioUsers } from "@/lib/auth/users";
import type { StudioUserRecord } from "@/lib/campaign-store/types";

const mayaCustomer = (id: string): StudioUserRecord => ({
  id,
  email: `${id}@example.com`,
  displayName: "Maya",
  roles: ["client"],
  accountClass: "customer",
  clientCampaignIds: [],
  passwordHash: "scrypt$placeholder",
  emailVerifiedAt: null,
});

describe("local Customer-One auth fixture gate", () => {
  it("is available in development and test only", () => {
    expect(
      isLocalAuthFixtureAvailable({
        env: { NODE_ENV: "development" } as NodeJS.ProcessEnv,
      }),
    ).toBe(true);
    expect(
      isLocalAuthFixtureAvailable({
        env: { NODE_ENV: "test" } as NodeJS.ProcessEnv,
      }),
    ).toBe(true);
  });

  it("cannot activate in production, even with sandbox or dev-tool flags", () => {
    expect(
      isLocalAuthFixtureAvailable({
        env: { NODE_ENV: "production" } as NodeJS.ProcessEnv,
      }),
    ).toBe(false);
    expect(
      isLocalAuthFixtureAvailable({
        env: {
          NODE_ENV: "production",
          NEXT_PUBLIC_DEV_TOOLS: "1",
          NEXT_PUBLIC_PAYMENT_SANDBOX: "1",
        } as NodeJS.ProcessEnv,
      }),
    ).toBe(false);
  });
});

describe("pickLocalCustomerOneRecord", () => {
  it("prefers the named fixture id, else the first Maya customer", () => {
    const firstMaya = mayaCustomer("maya-a");
    const secondMaya = mayaCustomer("maya-b");
    const fixture: StudioUserRecord = {
      ...mayaCustomer(LOCAL_CUSTOMER_ONE_FIXTURE_ID),
      accountClass: "test",
    };
    expect(pickLocalCustomerOneRecord([firstMaya, secondMaya])?.id).toBe(
      "maya-a",
    );
    expect(
      pickLocalCustomerOneRecord([firstMaya, fixture, secondMaya])?.id,
    ).toBe(LOCAL_CUSTOMER_ONE_FIXTURE_ID);
    expect(pickLocalCustomerOneRecord([])).toBeNull();
  });

  it("does not pick staff or owner Mayas", () => {
    const staff: StudioUserRecord = {
      ...mayaCustomer("maya-staff"),
      roles: ["staff", "client"],
      accountClass: "staff",
    };
    expect(pickLocalCustomerOneRecord([staff])).toBeNull();
  });
});

describe("pickLocalCustomerOnePaidFlyerCampaign", () => {
  it("selects the latest unowned paid Maya flyer and prefers i20", () => {
    const older = {
      campaignId: "older",
      clientUserId: undefined,
      record: {
        campaignId: "older",
        campaignName: "Maya’s Mobile Boutique",
        paymentReceivedAt: "2026-09-06T20:00:00.000Z",
        approvedStudioPlan: { selectedServiceIds: ["v2-rtu-flyer"] },
        routeMapContext: { roadId: "i20" },
      },
    };
    const newer = {
      campaignId: "newer",
      clientUserId: undefined,
      record: {
        campaignId: "newer",
        campaignName: "Maya’s Mobile Boutique",
        paymentReceivedAt: "2026-09-06T22:28:33.080Z",
        approvedStudioPlan: { selectedServiceIds: ["v2-rtu-flyer"] },
        routeMapContext: { roadId: "i20" },
      },
    };
    const otherRoad = {
      campaignId: "random",
      clientUserId: undefined,
      record: {
        campaignId: "random",
        campaignName: "Maya’s Mobile Boutique",
        paymentReceivedAt: "2026-09-07T00:00:00.000Z",
        approvedStudioPlan: { selectedServiceIds: ["v2-rtu-flyer"] },
        routeMapContext: { roadId: "random-exit" },
      },
    };
    const picked = pickLocalCustomerOnePaidFlyerCampaign(
      [older, newer, otherRoad] as never,
      "maya-a",
    );
    expect(picked?.campaignId).toBe("newer");
  });
});

describe("resolveLocalCustomerOneUser", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null in production and does not create a user", async () => {
    const before = (await listStudioUsers()).length;
    vi.stubEnv("NODE_ENV", "production");
    await expect(resolveLocalCustomerOneUser()).resolves.toBeNull();
    expect((await listStudioUsers()).length).toBe(before);
  });

  it("reuses an existing Maya customer instead of creating another", async () => {
    const before = await listStudioUsers();
    const beforeMaya = before.filter(
      (user) => String(user.displayName || "").trim() === "Maya",
    ).length;
    const user = await resolveLocalCustomerOneUser();
    expect(user).not.toBeNull();
    expect(user?.displayName).toBe("Maya");
    expect(user?.roles).toContain("client");
    expect(
      (user as { password?: string; passwordHash?: string }).passwordHash,
    ).toBeUndefined();
    const after = await listStudioUsers();
    const afterMaya = after.filter(
      (user) => String(user.displayName || "").trim() === "Maya",
    ).length;
    expect(afterMaya).toBe(beforeMaya);
    expect(after.length).toBe(before.length);
  });
});

describe("local auth fixture surfaces", () => {
  it("Sign In only renders the control when the server flag is true", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/auth/SignInScene.tsx"),
      "utf8",
    );
    expect(source).toContain("showLocalAuthFixture");
    expect(source).toContain("{showLocalAuthFixture ? (");
    expect(source).toContain("localCustomerOneAuthFixtureCopy.eyebrow");
    expect(source).toContain("localCustomerOneAuthFixtureCopy.button");
    expect(localCustomerOneAuthFixtureCopy.eyebrow).toBe("LOCAL DEVELOPER TEST");
    expect(localCustomerOneAuthFixtureCopy.button).toBe("Continue as Customer-One");
    expect(source).toContain('className="utility-btn utility-btn--secondary"');
    expect(source).toContain("/api/auth/local-customer-one");
    expect(source).not.toContain("NEXT_PUBLIC_");
    expect(source).not.toContain("process.env");
  });

  it("Sign In page gates the fixture from the local-only helper", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/sign-in/page.tsx"),
      "utf8",
    );
    expect(source).toContain("isLocalAuthFixtureAvailable()");
    expect(source).toContain("showLocalAuthFixture={isLocalAuthFixtureAvailable()}");
    expect(source).not.toContain("NEXT_PUBLIC_");
  });

  it("login still requires a password and is not the fixture route", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/auth/login/route.ts"),
      "utf8",
    );
    expect(source).toContain("verifyLogin(body.email, body.password)");
    expect(source).not.toContain("resolveLocalCustomerOneUser");
    expect(source).not.toContain("local-customer-one");
  });

  it("fixture route 404s before resolving a user when unavailable", () => {
    const source = readFileSync(
      join(process.cwd(), "src/app/api/auth/local-customer-one/route.ts"),
      "utf8",
    );
    const gate = source.indexOf("isLocalAuthFixtureAvailable()");
    const resolve = source.indexOf("resolveLocalCustomerOneUser()");
    const setCookie = source.indexOf("response.cookies.set(");
    expect(gate).toBeGreaterThan(-1);
    expect(resolve).toBeGreaterThan(gate);
    expect(setCookie).toBeGreaterThan(resolve);
    expect(source).toContain("status: 404");
    expect(source).not.toContain("NEXT_PUBLIC_");
  });
});

describe("POST /api/auth/local-customer-one", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("404s in production and does not set a session cookie", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "test-session-secret-value");
    const { POST } = await import("@/app/api/auth/local-customer-one/route");

    const response = await POST();
    const body = (await response.json()) as { error?: string; user?: unknown };

    expect(response.status).toBe(404);
    expect(body.user).toBeUndefined();
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("GET is never an entry, including in test", async () => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret-value");
    const { GET } = await import("@/app/api/auth/local-customer-one/route");
    const response = await GET();
    expect(response.status).toBe(404);
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("issues the normal session cookie in local/test without a password", async () => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret-value");
    const { POST } = await import("@/app/api/auth/local-customer-one/route");
    const before = await listStudioUsers();
    const beforeMaya = before.filter(
      (user) => String(user.displayName || "").trim() === "Maya",
    ).length;

    const response = await POST();
    const body = (await response.json()) as {
      user?: { id?: string; displayName?: string; passwordHash?: string };
      fixture?: string;
    };

    expect(response.status).toBe(200);
    expect(body.fixture).toBe("local-developer-test");
    expect(body.user?.displayName).toBe("Maya");
    expect(body.user?.id).toBeTruthy();
    expect(body.user?.passwordHash).toBeUndefined();
    const cookie = response.cookies.get(SESSION_COOKIE_NAME);
    expect(cookie?.value).toBeTruthy();
    const after = await listStudioUsers();
    const afterMaya = after.filter(
      (user) => String(user.displayName || "").trim() === "Maya",
    ).length;
    expect(afterMaya).toBe(beforeMaya);
  });
});
