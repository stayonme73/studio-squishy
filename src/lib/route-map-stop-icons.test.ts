import { describe, expect, it } from "vitest";

import type { RouteMapIntakeTemplateId } from "@/catalog/intake/types";
import { ROUTE_MAP_STOP_ICONS } from "@/config/route-map-icons";

/** Keep in sync with `RouteMapIntakeTemplateId` — guards against icon-map lag. */
const ALL_INTAKE_TEMPLATE_IDS = [
  "discovery",
  "social-setup",
  "promotion",
  "video",
  "page",
  "voice",
  "update",
  "rtu-flyer",
  "rtu-menu",
  "rtu-service-sheet",
  "rtu-social-posts",
  "rtu-promotion-graphics",
  "rtu-email-kit",
  "rtu-sms-kit",
  "rtu-voice",
  "rtu-short-video",
  "rtu-business-card",
] as const satisfies readonly RouteMapIntakeTemplateId[];

describe("ROUTE_MAP_STOP_ICONS", () => {
  it("covers every Route Map intake template with a non-empty glyph", () => {
    for (const id of ALL_INTAKE_TEMPLATE_IDS) {
      const glyph = ROUTE_MAP_STOP_ICONS[id];
      expect(glyph, `missing icon for ${id}`).toBeTruthy();
      expect(glyph.length).toBeGreaterThan(0);
    }
  });

  it("BH-RM-1: includes rtu-business-card without using PB emoji cues", () => {
    expect(ROUTE_MAP_STOP_ICONS["rtu-business-card"]).toBe("▭");
    expect(ROUTE_MAP_STOP_ICONS["rtu-business-card"]).not.toBe("💼");
  });
});
