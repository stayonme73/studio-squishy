import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import {
  createSessionToken,
  parseSessionToken,
  sessionPayloadToUser,
} from "@/lib/auth/session";
import { SESSION_MAX_AGE_MS } from "@/lib/auth/session-lifetime";

const user: StudioUser = {
  id: "tagia",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner", "client"],
  currentCampaignId: "abc",
  clientCampaignIds: ["abc", "def"],
  emailVerifiedAt: "2026-07-19T18:58:50.825Z",
};

describe("session signing", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret-value");
  });

  it("round-trips a signed session token including verification truth", async () => {
    const token = await createSessionToken(user);
    const payload = await parseSessionToken(token);
    expect(payload).not.toBeNull();
    expect(sessionPayloadToUser(payload!)).toMatchObject({
      id: user.id,
      email: user.email,
      roles: user.roles,
      currentCampaignId: user.currentCampaignId,
      clientCampaignIds: user.clientCampaignIds,
      emailVerifiedAt: user.emailVerifiedAt,
    });
  });

  it("rejects tampered tokens", async () => {
    const token = await createSessionToken(user);
    const tampered = `${token}x`;
    expect(await parseSessionToken(tampered)).toBeNull();
  });

  it("rejects expired tokens by issuedAt TTL", async () => {
    const fresh = await createSessionToken(user);
    expect(await parseSessionToken(fresh)).not.toBeNull();

    const now = Date.now();
    const spy = vi.spyOn(Date, "now").mockReturnValue(now + SESSION_MAX_AGE_MS + 5_000);
    expect(await parseSessionToken(fresh)).toBeNull();
    spy.mockRestore();
  });

  it("maps unverified customers with null emailVerifiedAt", async () => {
    const unverified: StudioUser = { ...user, emailVerifiedAt: null };
    const token = await createSessionToken(unverified);
    const payload = await parseSessionToken(token);
    expect(payload?.emailVerifiedAt).toBeNull();
    expect(sessionPayloadToUser(payload!).emailVerifiedAt).toBeNull();
  });
});
