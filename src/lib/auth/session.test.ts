import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StudioUser } from "@/lib/campaign-store/types";
import {
  createSessionToken,
  parseSessionToken,
  sessionPayloadToUser,
} from "@/lib/auth/session";

const user: StudioUser = {
  id: "tagia",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner", "client"],
  currentCampaignId: "abc",
  clientCampaignIds: ["abc", "def"],
};

describe("session signing", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-session-secret-value");
  });

  it("round-trips a signed session token", async () => {
    const token = await createSessionToken(user);
    const payload = await parseSessionToken(token);
    expect(payload).not.toBeNull();
    expect(sessionPayloadToUser(payload!)).toMatchObject({
      id: user.id,
      email: user.email,
      roles: user.roles,
      currentCampaignId: user.currentCampaignId,
      clientCampaignIds: user.clientCampaignIds,
    });
  });

  it("rejects tampered tokens", async () => {
    const token = await createSessionToken(user);
    const tampered = `${token}x`;
    expect(await parseSessionToken(tampered)).toBeNull();
  });
});
