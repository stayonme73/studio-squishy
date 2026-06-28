import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  assertCampaignSyncAllowed,
  FixtureCampaignBlockedError,
  isFixtureCampaignId,
  isFixtureSyncAllowed,
} from "./fixture-guard";

describe("fixture-guard", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("detects owner-qa-dev and test-* campaign ids", () => {
    expect(isFixtureCampaignId("owner-qa-dev")).toBe(true);
    expect(isFixtureCampaignId("test-campaign")).toBe(true);
    expect(isFixtureCampaignId("a-real-uuid")).toBe(false);
  });

  it("blocks fixture sync unless ALLOW_FIXTURE_SYNC=1", () => {
    expect(isFixtureSyncAllowed()).toBe(false);
    expect(() => assertCampaignSyncAllowed("owner-qa-dev")).toThrow(FixtureCampaignBlockedError);

    vi.stubEnv("ALLOW_FIXTURE_SYNC", "1");
    expect(isFixtureSyncAllowed()).toBe(true);
    expect(() => assertCampaignSyncAllowed("owner-qa-dev")).not.toThrow();
  });
});
