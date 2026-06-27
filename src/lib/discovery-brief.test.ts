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
  "your-challenge": "Lack of clarity or direction",
  "your-current-tools": "None yet / starting from scratch",
  "your-focus": "Brand & identity",
  "success-looks-like": "Stronger brand recognition",
  "whats-slowing-you-down": "Inconsistent messaging",
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
      "your-focus": "Marketing & growth",
      "success-looks-like": "More leads or customers",
      "whats-slowing-you-down": "Low visibility or reach",
    });
    expect(brief.selectedNeeds).toContain("get-more-customers");
  });

  it("derives improve-communication when Email marketing is selected in tools", () => {
    const brief = buildDiscoveryBrief({
      ...BASE_ANSWERS,
      "your-current-tools": "Email marketing",
    });
    expect(brief.selectedNeeds).toContain("improve-communication");
  });
});

describe("briefIndicatesRecurringWorkload", () => {
  it("is false for growing without recurring tile signals", () => {
    const brief = buildDiscoveryBrief({
      ...BASE_ANSWERS,
      "your-situation": "Growing an existing business",
      "success-looks-like": "More leads or customers",
      "whats-slowing-you-down": "Low visibility or reach",
    });
    expect(briefIndicatesRecurringWorkload(brief)).toBe(false);
  });

  it("is true when saving time on marketing is selected", () => {
    const brief = buildDiscoveryBrief({
      ...BASE_ANSWERS,
      "your-situation": "Growing an existing business",
      "success-looks-like": "Saving time on marketing",
      "whats-slowing-you-down": "Limited time or resources",
    });
    expect(briefIndicatesRecurringWorkload(brief)).toBe(true);
  });
});
