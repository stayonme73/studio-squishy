import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  mapSocialPromoOfferLedSocialTruth,
} from "./map-social-promo-offer-led-truth";
import {
  mergeCustomerFactsText,
  readSocialPromoIntakeSignals,
} from "./social-promo-intake-truth";
import { reasonSocialPostsSetDeterministic } from "@/lib/studio-design-renderer/social-posts-reason";
import { validateSocialPostsSetSpec } from "@/lib/studio-design-renderer/social-posts-validate";

const CERT6_FACTS =
  "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.";

describe("social-promo intake facts merge", () => {
  it("dedupes identical intake and materials facts (Cert-6 E2E shape)", () => {
    expect(mergeCustomerFactsText(CERT6_FACTS, CERT6_FACTS)).toBe(CERT6_FACTS);
    expect(mergeCustomerFactsText(CERT6_FACTS, "")).toBe(CERT6_FACTS);
    expect(mergeCustomerFactsText("", CERT6_FACTS)).toBe(CERT6_FACTS);
  });

  it("preserves distinct supplemental material facts", () => {
    const merged = mergeCustomerFactsText("Line one.", "Line two.");
    expect(merged).toBe("Line one.\nLine two.");
  });

  it("maps social post-3 body once when materials mirror intake", () => {
    const repoRoot = process.cwd();
    const campaign = {
      campaignId: "cert6-dedupe-shape",
      campaignName: "Spruce Line Studio",
      routeMapIntake: {
        submittedAt: "2026-10-25T00:28:19.907Z",
        answers: {
          "shared:businessName": "Spruce Line Studio",
          "shared:phone": "(555) 010-8820",
          "shared:webOrSocial": "spruceline.example/open-house",
          "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
          "social_and_promo_graphics:facts": CERT6_FACTS,
          "social_and_promo_graphics:cta": "Reserve your spot",
          "social_and_promo_graphics:rights": "ok",
        },
      },
    } as unknown as CampaignRecord;
    const materials = [
      {
        id: "condensed-social-facts",
        category: "factual-confirmation",
        reviewStatus: "approved_for_use",
        text: CERT6_FACTS,
      },
    ] as never;

    const signals = readSocialPromoIntakeSignals({
      repoRoot,
      campaign,
      materials,
      skuId: "v2-rtu-social-posts",
    });
    expect(signals.facts).toBe(CERT6_FACTS);
    expect(signals.disclosureBody).toBe(CERT6_FACTS);

    const mapped = mapSocialPromoOfferLedSocialTruth({
      repoRoot,
      campaign,
      materials,
      dispatchRecord: {
        dispatchId: "dd:cert6:social",
        jobId: "cert6:social",
        skuId: "v2-rtu-social-posts",
        executionIdentityReady: true,
        status: "EXECUTION_IDENTITY_READY",
      },
    });
    if (!mapped.ok) throw new Error(mapped.message);
    expect(mapped.truth.body).toBe(CERT6_FACTS);

    const spec = reasonSocialPostsSetDeterministic(mapped.truth);
    expect(validateSocialPostsSetSpec(repoRoot, spec, mapped.truth)).toEqual({ ok: true });
    const post3 = spec.assets.find((a) => a.assetId === "social-post-3")!;
    const body = post3.layers.find((l) => l.type === "text" && l.role === "body");
    expect(body?.type).toBe("text");
    if (body?.type === "text") {
      expect(body.content).toBe(CERT6_FACTS);
      expect(body.content).not.toMatch(new RegExp(`${CERT6_FACTS.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*${CERT6_FACTS.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    }
  });
});
