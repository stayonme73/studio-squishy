import { describe, expect, it } from "vitest";

import {
  classifyOwnerConsoleCampaignForLiveDesk,
  shouldAppearOnLiveOwnerDesk,
} from "./owner-console-live-desk";

describe("owner-console-live-desk", () => {
  it("keeps current live work on the desk", () => {
    expect(classifyOwnerConsoleCampaignForLiveDesk("owner-live-desk-now")).toBe(
      "live_owner_work",
    );
    expect(shouldAppearOnLiveOwnerDesk("maya-brooks-cedar")).toBe(true);
  });

  it("classifies stored certification and prior walk records as historical evidence", () => {
    expect(classifyOwnerConsoleCampaignForLiveDesk("p3-cert-j12")).toBe(
      "stored_historical_evidence",
    );
    expect(classifyOwnerConsoleCampaignForLiveDesk("camp-apply-scope-1")).toBe(
      "stored_historical_evidence",
    );
    expect(classifyOwnerConsoleCampaignForLiveDesk("camp-consent-no-pending-1")).toBe(
      "stored_historical_evidence",
    );
    expect(classifyOwnerConsoleCampaignForLiveDesk("pay-truth-sandbox-1")).toBe(
      "stored_historical_evidence",
    );
    expect(classifyOwnerConsoleCampaignForLiveDesk("pay-truth-amt-1")).toBe(
      "stored_historical_evidence",
    );
    expect(classifyOwnerConsoleCampaignForLiveDesk("room3-s1-refund-old")).toBe(
      "stored_historical_evidence",
    );
    expect(classifyOwnerConsoleCampaignForLiveDesk("room3-s2w-price-oldwalk")).toBe(
      "stored_historical_evidence",
    );
    expect(shouldAppearOnLiveOwnerDesk("p3-cert-j12")).toBe(false);
  });

  it("classifies guarded fixtures as residue without deleting them", () => {
    expect(classifyOwnerConsoleCampaignForLiveDesk("test-owner-desk")).toBe(
      "stale_fixture_residue",
    );
    expect(classifyOwnerConsoleCampaignForLiveDesk("owner-qa-dev")).toBe(
      "stale_fixture_residue",
    );
  });
});
