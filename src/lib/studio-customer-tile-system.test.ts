import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { MOBILE_VISUAL_MASTER } from "@/config/mobile-customer-spine-palette-v1";
import {
  STUDIO_CUSTOMER_TILE_SYSTEM_STATUS,
  studioCustomerJourneyTileInventoryV1,
  studioCustomerTileRecipesV1,
  studioCustomerTileSamsungCheckpointsV1,
  studioCustomerTileSystemV1,
  studioTileClass,
  voiceChoiceButtonClass,
} from "@/config/studio-customer-tile-system-v1";

describe("Studio customer tile system V1", () => {
  it("is approved and reuses MOBILE_VISUAL_MASTER paint", () => {
    expect(STUDIO_CUSTOMER_TILE_SYSTEM_STATUS).toBe("APPROVED");
    expect(studioCustomerTileSystemV1.approvedAt).toBe("2026-09-05");
    expect(studioCustomerTileSystemV1.applyingSection).toBe("conversation-room");
    expect(studioCustomerTileSystemV1.doNotRedesignJourney).toBe(true);
    expect(studioCustomerTileRecipesV1.glassFilterLiteral).toBe(
      MOBILE_VISUAL_MASTER.glassFilterLiteral,
    );
    expect(studioCustomerTileRecipesV1.standardFill).toContain(
      `${MOBILE_VISUAL_MASTER.glassIvoryPct}%`,
    );
    expect(studioCustomerTileRecipesV1.standardFill).toContain(
      `${MOBILE_VISUAL_MASTER.glassOpacityPct}%`,
    );
    expect(studioTileClass.primaryAction).toBe("lobby-entry-film__cta");
    expect(voiceChoiceButtonClass(false)).toBe("lobby-entry-film__cta");
    expect(voiceChoiceButtonClass(true)).toBe("lobby-entry-film__cta");
    expect(
      studioCustomerTileSystemV1.approvedLockedSurfaces.step2ChooseYourServices
        .status,
    ).toBe("FROZEN_OWNER_ACCEPTED");
  });

  it("ships shared CSS classes and Conversation Room consumes them", () => {
    const tileCss = readFileSync(
      join(process.cwd(), "src/app/studio-customer-tile-system.css"),
      "utf8",
    );
    expect(tileCss).toContain("[data-mobile-customer-spine] .studio-tile--standard");
    expect(tileCss).toContain(".studio-tile--standard");
    expect(tileCss).toContain(".studio-tile--standard-dense");
    expect(tileCss).toContain(".studio-tile--quiet");
    expect(tileCss).toContain(".studio-action--secondary");
    expect(tileCss).toContain(MOBILE_VISUAL_MASTER.glassFilterLiteral);
    expect(tileCss).toContain("overflow: visible");
    expect(tileCss).toContain("background: transparent");
    const standardFrost = tileCss.slice(
      tileCss.lastIndexOf(
        "[data-mobile-customer-spine] .studio-tile--standard::before {",
      ),
      tileCss.lastIndexOf(
        "[data-mobile-customer-spine] .studio-tile--standard-dense::before {",
      ),
    );
    expect(standardFrost).toContain(
      "color-mix(in srgb, color-mix(in srgb, #f7f4ee 68%, #ebe2d4 32%) 46%, transparent)",
    );
    expect(standardFrost).toContain(MOBILE_VISUAL_MASTER.glassFilterLiteral);
    expect(standardFrost).not.toContain("overflow: hidden");
    expect(readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8")).toContain(
      'import "./studio-customer-tile-system.css"',
    );
    const plan = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationStudioPlanTablet.tsx",
      ),
      "utf8",
    );
    expect(plan).toContain("studioTileClass.standardLight");
    expect(plan).toContain("studioTileClass.supportingQuiet");
    expect(plan).toContain("studioTileClass.secondaryAction");
    const summary = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/StudioGuideTabletView.tsx",
      ),
      "utf8",
    );
    expect(summary).toContain("studioTileClass.standardLight");
    expect(summary).toContain("styles.summaryRow");
    const route = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/ConversationRouteChoose.tsx",
      ),
      "utf8",
    );
    expect(route).toContain("studioTileClass.standardLight");
    expect(route).toContain("studioTileClass.selectedActive");
    const voiceChoice = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/VoiceChoiceFilm.tsx",
      ),
      "utf8",
    );
    expect(voiceChoice).toContain("voiceChoiceButtonClass(selected)");
    expect(voiceChoice).toContain("lobby-entry-film__cta");
    const servicesCss = readFileSync(
      join(
        process.cwd(),
        "src/components/studio-conversation-room/guide/conversation-activity-panel.module.css",
      ),
      "utf8",
    );
    expect(servicesCss).toContain(
      "color-mix(in srgb, var(--mc-ivory, #f7f4ee) 32%, transparent)",
    );
  });

  it("inventories the customer journey and four Samsung section checkpoints", () => {
    expect(studioCustomerJourneyTileInventoryV1).toHaveLength(18);
    expect(studioCustomerJourneyTileInventoryV1[0]?.screen).toBe(
      "Lounge / Welcome",
    );
    expect(
      studioCustomerJourneyTileInventoryV1.find(
        (row) => row.screen === "Choose Your Services (Step 2)",
      )?.normalizeAfterReview,
    ).toBe(false);
    expect(
      studioCustomerJourneyTileInventoryV1.find(
        (row) => row.screen === "Review Studio Plan (Step 3)",
      )?.normalizeAfterReview,
    ).toBe(true);
    expect(
      studioCustomerJourneyTileInventoryV1.find(
        (row) => row.screen === "Review Studio Plan (Step 3)",
      )?.ownerStatus,
    ).toContain("OPEN follow-up");
    expect(
      studioCustomerJourneyTileInventoryV1.find(
        (row) => row.screen === "Review Studio Plan (Step 3)",
      )?.ownerStatus,
    ).not.toContain("OWNER_ACCEPTED");
    expect(studioCustomerTileSamsungCheckpointsV1).toHaveLength(4);
  });

  it("keeps the written contract next to the config", () => {
    const doc = join(
      process.cwd(),
      "docs/studio-customer-tile-system-v1.md",
    );
    expect(existsSync(doc)).toBe(true);
    const text = readFileSync(doc, "utf8");
    expect(text).toContain("APPROVED");
    expect(text).toContain("studio-tile--standard");
    expect(text).toContain("lobby-entry-film__cta");
    expect(text).toContain("FROZEN");
  });
});
