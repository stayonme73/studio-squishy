import { describe, expect, it } from "vitest";

import { studioClipRepurposingBuildV1 } from "@/config/studio-clip-repurposing-build-v1";
import { studioFlagshipShortFormVideoEditingMarketAlignmentV1 as stamp } from "@/config/studio-flagship-short-form-video-editing-market-alignment-v1";
import { LAUNCH_MENU_FROZEN_PRICES_CENTS } from "@/config/studio-menu-readiness-and-demand-freeze-v1";
import { studioShortFormVideoEditingBuildV1 } from "@/config/studio-short-form-video-editing-build-v1";

import { chooseFlagshipBrollTreatment, evaluateFlagshipBroll } from "./broll";
import {
  buildFlagshipMusicMixFilter,
  planFlagshipMusicGain,
  writeOriginalRightsSafePad,
} from "./music";
import { describeFlagshipRevision } from "./revision";
import { pickApprovedStudioStock } from "./studio-stock";

describe("STUDIO-FLAGSHIP-SHORT-FORM-VIDEO-EDITING-MARKET-ALIGNMENT-1", () => {
  it("does not change the public $349 price or neighbor SKUs", () => {
    expect(stamp.publicPriceCentsUnchanged).toBe(34900);
    expect(stamp.doNotChangePrice).toBe(true);
    expect(
      LAUNCH_MENU_FROZEN_PRICES_CENTS["v2-rtu-short-form-video-edit"],
    ).toBe(34900);
    expect(studioShortFormVideoEditingBuildV1.sku.priceCents).toBe(34900);
    expect(studioClipRepurposingBuildV1.sku.priceCents).toBe(54900);
    expect(stamp.doNotAlterClipRepurposing).toBe(true);
    expect(stamp.doNotAlterSocialPosts).toBe(true);
    expect(stamp.doNotRenameStillsShortVideo).toBe(true);
    expect(stamp.doNotStartClipFromThisStamp).toBe(true);
  });

  it("refuses uncleared or decorative B-roll", () => {
    const uncleared = evaluateFlagshipBroll({
      asset: {
        absolutePath: "missing.png",
        rightsCleared: false,
        customerOwnsOrHasPermission: false,
        supportsSpokenIdea: "cherries",
      },
      spokenIdea: "favorite word is cherries",
    });
    expect(uncleared.ok).toBe(false);

    const decorative = evaluateFlagshipBroll({
      asset: {
        absolutePath: __filename,
        rightsCleared: true,
        customerOwnsOrHasPermission: true,
        supportsSpokenIdea: "storefront neon",
      },
      spokenIdea: "my favorite word in English is cherries",
    });
    expect(decorative.ok).toBe(true);
    if (decorative.ok) expect(decorative.use).toBe(false);
  });

  it("picks story-matched Pexels catalog stock and skips unmatched lines", () => {
    expect(stamp.broll.studioStockLibrary).toBe("pexels_approved_catalog");
    expect(stamp.broll.followsCompleteSemanticThought).toBe(true);
    expect(stamp.broll.doNotTriggerOnlyOnKeyword).toBe(true);
    expect(stamp.broll.doNotRemoveBeforeThoughtFinishes).toBe(true);
    expect(stamp.broll.doNotLeaveIntoNextThought).toBe(true);
    const cherries = pickApprovedStudioStock(
      "My favorite word in English is cherries, which means a small fruit.",
    );
    expect(cherries?.id).toBe("pexels-1307111");
    const teach = pickApprovedStudioStock(
      "I will teach you some words and phrases in this language.",
    );
    expect(teach?.id).toBe("pexels-267669");
    expect(pickApprovedStudioStock("I'm learning English.")?.id).toBe(
      "pexels-267669",
    );
    expect(pickApprovedStudioStock("sunset boats on the water")).toBeNull();
  });

  it("keeps music audible under speech and does not amix-normalize the bed away", () => {
    expect(stamp.music.amixNormalize).toBe(false);
    const gain = planFlagshipMusicGain(-34.3);
    expect(gain).toBeGreaterThan(1);
    const filter = buildFlagshipMusicMixFilter({
      gain,
      speechEndSeconds: 16.86,
      totalDurationSeconds: 19.36,
    });
    expect(filter).toMatch(/normalize=0/);
    expect(filter).toMatch(/afade=t=out/);
    expect(filter).not.toMatch(/sidechaincompress/);
    expect(filter).not.toMatch(/volume=0\.11/);
  });

  it("chooses picture-in-picture for close-up catalog B-roll", () => {
    expect(
      chooseFlagshipBrollTreatment({
        absolutePath: "pexels-1307111.mp4",
        rightsCleared: true,
        customerOwnsOrHasPermission: false,
        studioLicensed: true,
        mediaKind: "video",
        supportsSpokenIdea: "cherry cherries fruit",
      }),
    ).toBe("picture_in_picture");
  });

  it("names a creative revision that is not an end-card-only change", () => {
    expect(describeFlagshipRevision({
      kind: "different_opening",
      note: "different hook",
    })).toMatch(/different spoken opening/i);
  });

  it("can write an original rights-safe music pad without scraping songs", async () => {
    const { mkdtempSync } = await import("fs");
    const { tmpdir } = await import("os");
    const { join } = await import("path");
    const dir = mkdtempSync(join(tmpdir(), "flagship-pad-"));
    const out = join(dir, "pad.m4a");
    const pad = writeOriginalRightsSafePad({
      outputAbsolutePath: out,
      durationSeconds: 10,
    });
    expect(pad.ok).toBe(true);
  });
});
