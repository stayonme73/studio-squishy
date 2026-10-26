import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { customerFlyerBodyWithoutContactDump } from "@/lib/studio-design-renderer/flyer-creative-quality";
import { mapFlyerProjectTruthFromJob } from "@/lib/studio-dispatch/map-flyer-job-truth";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import { harborOakIdentityLock } from "@/lib/studio-kitchen-production/cert-design/identity-locks";
import type { CampaignMaterialItem } from "@/lib/materials/types";

const LOGO =
  "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/materials/harbor-oak-anchor-oak-oval-v1.svg";

describe("extras flyer fact mapping", () => {
  it("drops the business name from the body when the name contains an ampersand", () => {
    const body = customerFlyerBodyWithoutContactDump(
      "Harbor & Oak Home Services Spring Tune-Up + Drain Clear HVAC tune-up and drain clear for homeowners who want plain, steady service.",
      {
        businessName: "Harbor & Oak Home Services",
        headline: "Spring Tune-Up",
        offerName: "Spring Tune-Up + Drain Clear",
      },
    );
    expect(body.startsWith("HVAC tune-up")).toBe(true);
    expect(body).not.toContain("Harbor");
  });

  it("keeps the business name and the short offer on separate lines", () => {
    const business = harborOakIdentityLock.businessName;
    const offer = [
      harborOakIdentityLock.campaign.offerName,
      "HVAC tune-up and drain clear for homeowners who want plain, steady service.",
      "$189 (was $249)",
      "March 10 – April 15, 2026",
    ].join("\n");
    const phone = harborOakIdentityLock.campaign.phone;
    const cta = `Book online or call ${phone}`;
    const contact = `${phone} · harborandoak.example/book-tuneup`;
    const mustInclude = [business, offer, cta, contact].join("\n");
    const answers = {
      "v2-rtu-flyer:flyerPurpose": harborOakIdentityLock.campaign.offerName,
      "v2-rtu-flyer:mustInclude": mustInclude,
      "v2-rtu-flyer:callToAction": cta,
    };
    const campaign = {
      campaignId: "extras-flyer-map",
      campaignName: business,
      routeMapIntake: { submittedAt: "2026-10-18T16:00:00.000Z", answers },
    } as unknown as CampaignRecord;
    const logo = {
      id: "studio-extra-logo",
      category: "logo-brand",
      requirementLevel: "required",
      reviewStatus: "approved_for_use",
      contentKind: "file-metadata",
      label: "logo",
      reason: "fixture",
      relatedServiceIds: ["v2-rtu-flyer"],
      fileName: "harbor-oak-anchor-oak-oval-v1.svg",
      url: LOGO,
      uploadStatus: "stored",
      storageRef: null,
    } as CampaignMaterialItem;
    const jobId = "extras-flyer-map:studio-extra:flyer:flyer";
    const record = evaluateJobDispatch({
      campaignId: campaign.campaignId,
      jobId,
      skuId: "v2-rtu-flyer",
      routing: {
        decisionId: "rd:extras-flyer-map",
        jobId,
        campaignId: campaign.campaignId,
        skuId: "v2-rtu-flyer",
        status: "READY_FOR_DISPATCH",
        readyForDispatch: true,
        productionFamilyId: null,
        controlLane: "standard",
        capabilityReadiness: "contract_ready",
        factFingerprint: "map",
        evaluatedAt: "2026-10-18T16:00:00.000Z",
        reason: null,
        blocker: null,
        ownerActionRequired: false,
      },
    });
    const mapped = mapFlyerProjectTruthFromJob({
      repoRoot: process.cwd(),
      campaign,
      dispatchRecord: record,
      materials: [logo],
      stagedLogoRelativePath: LOGO,
      allowApprovedCustomerExampleDomain: true,
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.businessName).toBe(business);
    expect(mapped.truth.offerName).toBe(harborOakIdentityLock.campaign.offerName);
    expect(mapped.truth.priceDisplay).toBe("$189");
    expect(mapped.truth.cta).toContain("Book online or call");
  });
});
