import { beforeEach, describe, expect, it, vi } from "vitest";

const findUserById = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/users", () => ({
  findUserById,
}));

import { resolveLifecycleRecipientEmail } from "@/lib/studio-lifecycle-email/campaign";

describe("resolveLifecycleRecipientEmail", () => {
  beforeEach(() => {
    findUserById.mockReset();
  });

  it("returns no email when the client user is missing", async () => {
    findUserById.mockResolvedValue(null);
    const result = await resolveLifecycleRecipientEmail({
      campaignId: "camp-1",
      clientUserId: "missing-client",
    });
    expect(result).toEqual({ email: null, userId: undefined });
  });

  it("returns no email for an unclaimed client id and does not look up a user", async () => {
    const result = await resolveLifecycleRecipientEmail({
      campaignId: "camp-1",
      clientUserId: "unclaimed-client:camp-1",
    });
    expect(result).toEqual({ email: null });
    expect(findUserById).not.toHaveBeenCalled();
  });

  it("keeps a real user id when the stored email is not sendable", async () => {
    findUserById.mockResolvedValue({
      id: "client-1",
      email: "not-an-email",
      displayName: "Client",
      roles: ["client"],
    });
    const result = await resolveLifecycleRecipientEmail({
      campaignId: "camp-1",
      clientUserId: "client-1",
    });
    expect(result).toEqual({ email: null, userId: "client-1" });
  });

  it("returns the stored email when it is sendable", async () => {
    findUserById.mockResolvedValue({
      id: "client-1",
      email: "client@studio.test",
      displayName: "Client",
      roles: ["client"],
    });
    const result = await resolveLifecycleRecipientEmail({
      campaignId: "camp-1",
      clientUserId: "client-1",
    });
    expect(result).toEqual({ email: "client@studio.test", userId: "client-1" });
  });
});
