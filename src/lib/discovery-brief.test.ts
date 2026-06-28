import { describe, expect, it } from "vitest";

import {
  briefIndicatesRecurringWorkload,
  buildDiscoveryBrief,
  deriveSelectedNeeds,
} from "@/lib/discovery-brief";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";

const BASE_ANSWERS: DiscoveryAnswers = {
  "your-business": "Test Co",
  "your-situation": "Starting fresh",
  "your-challenge": "I am not sure what to say about my business",
  "your-current-tools": "None yet / starting from scratch",
  "your-focus": "Refresh my brand look",
  "success-looks-like": "A stronger, more polished brand presence",
  "whats-slowing-you-down": "My branding looks inconsistent",
};

describe("deriveSelectedNeeds", () => {
  it("maps multiselect tiles and focus to StudioNeedId values", () => {
    const brief = buildDiscoveryBrief(BASE_ANSWERS);
    expect(brief.selectedNeeds).toContain("better-branding");
    expect(deriveSelectedNeeds(brief.answers)).toEqual(brief.selectedNeeds);
  });

  it("derives get-more-customers from success and focus tiles", () => {
    const brief = buildDiscoveryBrief({
      ...BASE_ANSWERS,
      "your-focus": "Promote an offer, event, or launch",
      "success-looks-like": "A successful launch, event, sale, or promotion",
      "whats-slowing-you-down": "I am not visible enough online",
    });
    expect(brief.selectedNeeds).toContain("get-more-customers");
  });

  it("derives improve-communication when email channel is selected in tools", () => {
    const brief = buildDiscoveryBrief({
      ...BASE_ANSWERS,
      "your-current-tools": "Email list or email platform",
    });
    expect(brief.selectedNeeds).toContain("improve-communication");
  });
});

describe("briefIndicatesRecurringWorkload", () => {
  it("is false for growing without recurring tile signals", () => {
    const brief = buildDiscoveryBrief({
      ...BASE_ANSWERS,
      "your-situation": "Trying to stay visible more consistently",
      "success-looks-like": "A successful launch, event, sale, or promotion",
      "whats-slowing-you-down": "I am not visible enough online",
    });
    expect(briefIndicatesRecurringWorkload(brief)).toBe(false);
  });

  it("is true when spending less time on marketing is selected", () => {
    const brief = buildDiscoveryBrief({
      ...BASE_ANSWERS,
      "your-situation": "Trying to stay visible more consistently",
      "success-looks-like": "Spending less time creating and posting marketing",
      "whats-slowing-you-down": "I do not have time to create or post content",
    });
    expect(briefIndicatesRecurringWorkload(brief)).toBe(true);
  });
});
