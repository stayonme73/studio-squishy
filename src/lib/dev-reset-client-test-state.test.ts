import { describe, expect, it } from "vitest";

import { stripActiveCampaignSearchParams } from "@/lib/dev-reset-client-test-state";

describe("stripActiveCampaignSearchParams", () => {
  it("removes campaign-scoped query params used by dev fixtures", () => {
    const params = new URLSearchParams(
      "campaignId=studio-record-polish-partial&status=payment&record=open&jobId=abc%3Ajob&foo=bar",
    );
    expect(stripActiveCampaignSearchParams(params)).toBe("?foo=bar");
  });

  it("returns an empty string when no params remain", () => {
    const params = new URLSearchParams("campaignId=test&status=review");
    expect(stripActiveCampaignSearchParams(params)).toBe("");
  });
});
