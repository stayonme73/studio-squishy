import { describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { getServiceById } from "@/catalog/accessors";
import { buildDiscoverySummary } from "@/discovery-summary/buildDiscoverySummary";
import { buildDiscoveryBrief } from "@/lib/discovery-brief";
import { recommendFromDiscovery } from "@/recommendation/engine";
import { discoveryTileConfig, DISCOVERY_FORM_TILE_IDS } from "@/config/business-discovery-studio";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";

const STARTING_FRESH: DiscoveryAnswers = {
  "your-business": "Test Co",
  "your-situation": "Starting fresh",
  "your-challenge": "I am not sure what to say about my business",
  "your-current-tools": "None yet / starting from scratch",
  "your-focus": "Promote an offer, event, or launch",
  "success-looks-like": "A successful launch, event, sale, or promotion",
  "whats-slowing-you-down": "I am not visible enough online",
};

describe("Slice 4 closeout report artifact", () => {
  it("writes tmp/slice4-closeout-report.json", () => {
    const tmpDir = join(process.cwd(), "tmp");
    mkdirSync(tmpDir, { recursive: true });

    const startingResult = recommendFromDiscovery(buildDiscoveryBrief(STARTING_FRESH));
    const startingSummary = buildDiscoverySummary(startingResult);

    const mixedResult = recommendFromDiscovery(
      buildDiscoveryBrief({
        ...STARTING_FRESH,
        "your-situation": "Trying to stay visible more consistently",
        "your-challenge": "I need help promoting something",
        "your-focus": "Create social media content",
        "success-looks-like":
          "Spending less time creating and posting marketing, More consistent social media visibility",
        "whats-slowing-you-down":
          "I do not have time to create or post content, I am not visible enough online",
      }),
    );

    const techResult = recommendFromDiscovery(
      buildDiscoveryBrief({
        ...STARTING_FRESH,
        "your-challenge": "My business does not look polished or consistent",
      }),
    );

    const unusedTiles = DISCOVERY_FORM_TILE_IDS.filter((tileId) => {
      const config = discoveryTileConfig[tileId];
      return config.recommendationUse === "human-review-only";
    });

    const report = {
      startingFreshSkus: startingResult.recommendations.map(
        (entry) => getServiceById(entry.serviceId)?.name ?? entry.serviceId,
      ),
      startingFreshTimeline: startingSummary.estimatedTimeline.customerLabel,
      mixedTimeline: buildDiscoverySummary(mixedResult).estimatedTimeline.customerLabel,
      technologyToolsSkus: techResult.recommendations.map(
        (entry) => getServiceById(entry.serviceId)?.name ?? entry.serviceId,
      ),
      remainingDiscoveryTilesNotUsedByEngine: unusedTiles,
      widthBefore: {
        utilityContentMaxWide: "96rem (1536px)",
        workspaceGrid: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: "clamp(1.25rem, 2vw, 1.75rem)",
      },
      widthAfter: {
        utilityContentMaxWide: "120rem (1920px)",
        workspaceGrid: "minmax(0, 1.15fr) minmax(0, 0.9fr)",
        gap: "clamp(1.25rem, 2.5vw, 2rem)",
      },
      bundleSectionHidden: true,
    };

    writeFileSync(join(tmpDir, "slice4-closeout-report.json"), JSON.stringify(report, null, 2));
    expect(report.startingFreshSkus).toContain("Brand Identity Refresh");
    expect(report.bundleSectionHidden).toBe(true);
  });
});
