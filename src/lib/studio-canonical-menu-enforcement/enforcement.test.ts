import { describe, expect, it } from "vitest";

import { studioCanonicalLaunchTruthV1 as truth } from "@/config/studio-canonical-launch-truth-v1";

import {
  canonicalLaunchMenuSentence,
  CANONICAL_LAUNCH_DOOR_HREF,
  formatCanonicalUsd,
  isCanonicalCheckoutPurchaseKind,
  listCanonicalLaunchPackages,
  shouldLeaveSupersededRoomStage,
  SUPERSEDED_OFFER_CHECKOUT_RESPONSE,
} from "./enforcement";

const OLD_PRICES = /\$549|\$599|\$69\b|\$79\b|\$89\b|\$99\b/;

describe("canonical menu enforcement gates", () => {
  it("serves the four current packages at the locked prices", () => {
    const packages = listCanonicalLaunchPackages();
    expect(packages).toHaveLength(4);
    expect(truth.customerFacingLaunchPackageCount).toBe(4);
    expect(
      packages.map((pkg) => [pkg.customerFacingName, pkg.priceDisplay, formatCanonicalUsd(pkg.amountDueAfterThankYouCents)]),
    ).toEqual([
      ["Clip Repurposing", "$373.75", "$299"],
      ["Short-Form Video Editing", "$186.25", "$149"],
      ["Social & Promo Graphics", "$199", "$159.20"],
      ["Campaign Launch Kit", "$349", "$279.20"],
    ]);
    expect(truth.deployedPublicly).toBe(false);
    expect(truth.publicationAuthorized).toBe(false);
  });

  it("names the current menu without any superseded price", () => {
    const sentence = canonicalLaunchMenuSentence();
    expect(sentence).toBe(
      "The Studio currently offers 4 packages: Clip Repurposing at $373.75, Short-Form Video Editing at $186.25, Social & Promo Graphics at $199, and Campaign Launch Kit at $349.",
    );
    expect(sentence).not.toMatch(/\$549|\$599|\$69\b|\$79\b|\$89\b|\$99\b/);
    expect(sentence).toMatch(/Short-Form Video Editing at \$186\.25/);
    expect(sentence).toMatch(/Campaign Launch Kit at \$349/);
  });

  it("lets only the three-package purchase kind start a new checkout", () => {
    expect(isCanonicalCheckoutPurchaseKind("condensed_offer")).toBe(true);
    for (const kind of ["studio_plan", "paid_cycle", undefined, null, "", "CONDENSED_OFFER"]) {
      expect(isCanonicalCheckoutPurchaseKind(kind), String(kind)).toBe(false);
    }
    expect(SUPERSEDED_OFFER_CHECKOUT_RESPONSE.ok).toBe(false);
    expect(SUPERSEDED_OFFER_CHECKOUT_RESPONSE.error).toBe("superseded_offer");
    expect(SUPERSEDED_OFFER_CHECKOUT_RESPONSE.message).toContain(canonicalLaunchMenuSentence());
    expect(SUPERSEDED_OFFER_CHECKOUT_RESPONSE.message).not.toMatch(OLD_PRICES);
  });

  it("sends old-shelf Conversation Room steps to the three-package door", () => {
    expect(CANONICAL_LAUNCH_DOOR_HREF).toBe("/");
    for (const stage of ["route", "services", "plan", "checkout"]) {
      expect(shouldLeaveSupersededRoomStage(stage, ""), stage).toBe(true);
      expect(shouldLeaveSupersededRoomStage(stage, "?stage=checkout&payment=cancel"), stage).toBe(true);
    }
    for (const stage of ["opening", "intake", "complete"]) {
      expect(shouldLeaveSupersededRoomStage(stage, ""), stage).toBe(false);
    }
  });

  it("lets an existing Stripe session finish returning", () => {
    expect(
      shouldLeaveSupersededRoomStage("checkout", "?stage=checkout&payment=return&session_id=cs_test_1"),
    ).toBe(false);
    expect(shouldLeaveSupersededRoomStage("checkout", "?stage=checkout&payment=return")).toBe(true);
  });
});
