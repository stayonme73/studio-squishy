import { describe, expect, it } from "vitest";

import {
  ROUTE_MAP_GUIDANCE,
  SQUISHY_HELP_PROMPT,
} from "@/config/route-map-guidance-v1";
import { resolveSquishyHelpPromptVisibility } from "@/lib/use-squishy-help-prompt-visibility";

describe("Squishy Help Prompt copy", () => {
  it("uses the locked prompt and CTA copy", () => {
    expect(SQUISHY_HELP_PROMPT.prompt).toBe("Not sure where to start?");
    expect(SQUISHY_HELP_PROMPT.cta).toBe(
      "Let Squishy help you choose the right project.",
    );
  });

  it("keeps ROUTE_MAP_GUIDANCE as a byte-identical alias for existing imports", () => {
    expect(ROUTE_MAP_GUIDANCE).toBe(SQUISHY_HELP_PROMPT);
    expect(ROUTE_MAP_GUIDANCE.squishyMessage).toBe(SQUISHY_HELP_PROMPT.squishyMessage);
  });

  it("is reassurance, not commerce — no SKU, price, or route fields", () => {
    const keys = Object.keys(SQUISHY_HELP_PROMPT);
    expect(keys).not.toContain("sku");
    expect(keys).not.toContain("priceCents");
    expect(keys).not.toContain("priceDisplay");
    expect(keys).not.toContain("roadId");
  });

  it("reserves a Phase 2 hesitation nudge without wiring it", () => {
    expect(SQUISHY_HELP_PROMPT.hesitationPrompt).toBe("Need help deciding?");
  });

  it("shows the Help Prompt immediately in Phase 1 always mode", () => {
    expect(resolveSquishyHelpPromptVisibility()).toBe(true);
    expect(resolveSquishyHelpPromptVisibility({ mode: "always" })).toBe(true);
  });

  it("keeps hesitation mode off until Phase 2 wiring", () => {
    expect(resolveSquishyHelpPromptVisibility({ mode: "hesitation", hesitationMs: 4000 })).toBe(
      false,
    );
  });
});
