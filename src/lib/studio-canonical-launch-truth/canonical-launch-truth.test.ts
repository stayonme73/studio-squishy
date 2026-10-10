import { existsSync } from "fs";
import { describe, expect, it } from "vitest";

import { studioCanonicalLaunchTruthV1 } from "@/config/studio-canonical-launch-truth-v1";
import { STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1 } from "@/config/studio-three-package-revision-truth-v1";
import { STUDIO_THANK_YOU_DISCOUNT_V1, studioThankYouAmount } from "@/config/studio-thank-you-discount-v1";

describe("canonical launch truth", () => {
  const truth = studioCanonicalLaunchTruthV1;

  it("is the three-package door only, unpublished, with nothing deployed", () => {
    expect(truth.canonicalCustomerFacingMenu).toBe("three_package_door");
    expect(truth.packages).toHaveLength(truth.customerFacingLaunchPackageCount);
    expect(truth.deployedPublicly).toBe(false);
    expect(truth.publicationAuthorized).toBe(false);
    for (const pkg of truth.packages) expect(pkg.launchPublishState).toBe("UNPUBLISHED");
    expect(truth.legacyElevenServiceShelf.customerFacingLaunchAuthority).toBe(false);
  });

  it("does not contradict the owner price lock or the Thank-You amount", () => {
    expect(truth.thankYouDiscountPercent).toBe(STUDIO_THANK_YOU_DISCOUNT_V1.percent);
    for (const pkg of truth.packages) {
      const locked =
        STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.packages[pkg.packageId as keyof typeof STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1.packages];
      expect(pkg.customerFacingName).toBe(locked.name);
      expect(pkg.listPriceCents).toBe(locked.priceCents);
      expect(pkg.priceDisplay).toBe(locked.priceDisplay);
      expect(pkg.revisionRounds).toBe(locked.revisionRounds);
      expect(pkg.amountDueAfterThankYouCents).toBe(studioThankYouAmount(pkg.listPriceCents).amountDueCents);
    }
  });

  it("points only at records that exist", () => {
    const paths = [
      truth.record,
      truth.shortFormEvidenceQuarantine,
      ...truth.packages.map((p) => p.record),
      ...truth.supersededHistoricalRecords,
    ];
    for (const p of paths) expect(existsSync(p), p).toBe(true);
  });
});
