import { describe, expect, it } from "vitest";

import { BUSINESS_CARD_CANVAS } from "@/lib/studio-design-renderer/card-types";
import { MENU_CANVAS } from "@/lib/studio-design-renderer/menu-types";
import { PROMO_SQUARE_PLATE } from "@/lib/studio-design-renderer/promo-types";
import { SERVICE_SHEET_CANVAS } from "@/lib/studio-design-renderer/service-sheet-types";
import { SOCIAL_POSTS_SQUARE_PLATE } from "@/lib/studio-design-renderer/social-posts-types";
import { sourcePxFromPlate } from "@/lib/studio-static-creative-lane/shared-live-gates";

describe("sourcePxFromPlate", () => {
  it.each([
    ["card", BUSINESS_CARD_CANVAS],
    ["menu", MENU_CANVAS],
    ["service sheet", SERVICE_SHEET_CANVAS],
    ["social", SOCIAL_POSTS_SQUARE_PLATE],
    ["promo", PROMO_SQUARE_PLATE],
  ])("keeps %s plate pixels", (_label, plate) => {
    const source = sourcePxFromPlate(plate);
    expect(source.width).toBe(plate.widthPx);
    expect(source.height).toBe(plate.heightPx);
  });
});
