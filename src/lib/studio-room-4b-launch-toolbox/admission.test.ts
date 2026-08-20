/**
 * Room 4B — admission pure-function tests.
 */

import { describe, expect, it } from "vitest";

import {
  FULL_CAMPAIGN_MIN_CALENDAR_DAYS,
  calendarDaysBetween,
  classifyToolboxComponent,
  evaluateCampaignDeadlineAdmission,
  evaluateCarouselAdmission,
} from "./admission";

const NOW = "2026-08-19T15:00:00.000Z";

describe("Room 4B launch toolbox admission", () => {
  it("refuses tomorrow morning for a full campaign with video and revision", () => {
    const tomorrowMorning = "2026-08-20T11:00:00.000Z";
    const result = evaluateCampaignDeadlineAdmission({
      requestedDeliveryIso: tomorrowMorning,
      nowIso: NOW,
      includesRevisionRound: true,
      includesVideo: true,
    });
    expect(result.admit).toBe(false);
    expect(result.reason).toBe("tomorrow_morning_full_campaign_not_feasible");
    expect(result.earliestFeasibleIso).toBeTruthy();
    expect(result.customerFacingMessage).toMatch(/tomorrow morning/i);
    expect(calendarDaysBetween(NOW, tomorrowMorning)).toBe(1);
  });

  it("evaluates next-Friday windows conservatively for full campaign", () => {
    // ~5–6 calendar days (tight Friday) -> refuse with earliest 7-day window
    const fridaySixDays = "2026-08-25T17:00:00.000Z";
    expect(calendarDaysBetween(NOW, fridaySixDays)).toBe(6);
    const tight = evaluateCampaignDeadlineAdmission({
      requestedDeliveryIso: fridaySixDays,
      nowIso: NOW,
      includesRevisionRound: true,
      includesVideo: true,
    });
    expect(tight.admit).toBe(false);
    expect(tight.reason).toBe("full_campaign_needs_at_least_seven_calendar_days");
    expect(tight.earliestFeasibleIso).toBeTruthy();

    // Exactly 7 calendar days -> admit with limits (tight buffer)
    const fridaySevenDays = "2026-08-26T17:00:00.000Z";
    expect(calendarDaysBetween(NOW, fridaySevenDays)).toBe(
      FULL_CAMPAIGN_MIN_CALENDAR_DAYS,
    );
    const atMin = evaluateCampaignDeadlineAdmission({
      requestedDeliveryIso: fridaySevenDays,
      nowIso: NOW,
      includesRevisionRound: true,
      includesVideo: true,
    });
    expect(atMin.admit).toBe(true);
    expect(atMin.reason).toBe("admit_with_limits_tight_buffer");

    // More than 7 days -> admit
    const fridayNineDays = "2026-08-28T17:00:00.000Z";
    expect(calendarDaysBetween(NOW, fridayNineDays)).toBe(9);
    const roomy = evaluateCampaignDeadlineAdmission({
      requestedDeliveryIso: fridayNineDays,
      nowIso: NOW,
      includesRevisionRound: true,
      includesVideo: true,
    });
    expect(roomy.admit).toBe(true);
    expect(roomy.reason).toBe("admit_full_campaign_feasible");
  });

  it("refuses carousel as a catalog exclusion on social posts", () => {
    const result = evaluateCarouselAdmission();
    expect(result.admit).toBe(false);
    expect(result.reason).toBe("catalog_exclusion_on_social_posts");
    expect(result.customerFacingMessage).toMatch(/carousel/i);
    expect(classifyToolboxComponent("carousel", { produced: false }).label).toBe(
      "NOT ON LAUNCH MENU",
    );
  });
});