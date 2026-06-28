import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ServiceId } from "@/catalog/types";
import {
  PROJECT_SUMMARY_PLAN_DRAFT_KEY_PREFIX,
  clearProjectSummaryPlanDraft,
  readProjectSummaryPlanDraft,
  resolveProjectSummaryPlanDraftCampaignId,
  saveProjectSummaryPlanDraft,
} from "@/lib/project-summary-plan-draft";

const CAMPAIGN_KEY = "studio-squishy:current-campaign";

function mockStorage() {
  const store: Record<string, string> = {};
  return {
    store,
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
}

describe("project-summary-plan-draft", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      localStorage: mockStorage(),
    });
  });

  it("round-trips selectedServiceIds for a campaign", () => {
    window.localStorage.setItem(
      CAMPAIGN_KEY,
      JSON.stringify({ campaignId: "campaign-a" }),
    );
    const ids = ["bf-001", "em-001"] as ServiceId[];
    saveProjectSummaryPlanDraft(ids);
    const draft = readProjectSummaryPlanDraft();
    expect(draft?.selectedServiceIds).toEqual(ids);
    expect(draft?.updatedAt).toBeTruthy();
  });

  it("uses anonymous key when no campaign exists", () => {
    saveProjectSummaryPlanDraft(["sm-001"] as ServiceId[]);
    const key = `${PROJECT_SUMMARY_PLAN_DRAFT_KEY_PREFIX}${resolveProjectSummaryPlanDraftCampaignId()}`;
    expect(window.localStorage.getItem(key)).toBeTruthy();
    expect(readProjectSummaryPlanDraft()?.selectedServiceIds).toEqual(["sm-001"]);
  });

  it("clears draft for the active campaign", () => {
    window.localStorage.setItem(
      CAMPAIGN_KEY,
      JSON.stringify({ campaignId: "campaign-b" }),
    );
    saveProjectSummaryPlanDraft(["bf-001"] as ServiceId[]);
    clearProjectSummaryPlanDraft();
    expect(readProjectSummaryPlanDraft()).toBeNull();
  });
});
