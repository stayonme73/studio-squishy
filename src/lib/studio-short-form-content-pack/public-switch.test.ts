import { describe, expect, it } from "vitest";

import { studio349ShortFormContentPackPublicSwitchV1 as nextPkg } from "@/config/studio-349-short-form-content-pack-public-switch-v1";
import {
  CLIP_REPURPOSING_BOUNDARY_SENTENCE,
  publishedPackSurfaceText,
  studioShortFormContentPackPublicSwitchV1 as pub,
} from "@/config/studio-short-form-content-pack-public-switch-v1";
import { shortFormContentPackContractV1 } from "@/config/studio-short-form-content-pack-v1";
import { SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT } from "@/catalog/v2/short-form-video-edit-publish";

describe("STUDIO-349-SHORT-FORM-CONTENT-PACK-PUBLIC-SWITCH-1", () => {
  it("is Owner-authorized and live as Short-Form Content Pack at 349", () => {
    expect(nextPkg.prepared).toBe(true);
    expect(nextPkg.authorizedToFlip).toBe(true);
    expect(nextPkg.publicCatalogSwitched).toBe(true);
    expect(nextPkg.doNotSwitchPublicSurfacesYet).toBe(false);
    expect(nextPkg.publicPriceCentsUnchanged).toBe(34900);
    expect(nextPkg.doNotBuildClip).toBe(true);
    expect(nextPkg.doNotPublishClipPrice).toBe(true);
    expect(nextPkg.doNotPublishUnresolvedClipIo).toBe(true);
    expect(pub.authorizedToFlip).toBe(true);
    expect(SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT.clientFacingName).toBe(
      "Short-Form Content Pack",
    );
    expect(SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT.priceCents).toBe(34900);
    expect(SHORT_FORM_VIDEO_EDIT_PUBLISH_DRAFT.includedDeliverables[0]?.quantity).toBe(1);
  });

  it("keeps the customer-points vs Studio-finds boundary on all three prepared surfaces", () => {
    const learn = pub.surfaces.productCardOrLearnMore;
    const checkout = pub.surfaces.checkoutIntake;
    const help = pub.surfaces.helpCenterFull;
    const published = publishedPackSurfaceText();
    expect(nextPkg.boundary.pack349).toMatch(/4 minutes total surrounding/i);
    expect(nextPkg.boundary.clipBoundary).toBe(CLIP_REPURPOSING_BOUNDARY_SENTENCE);
    expect(nextPkg.boundary.customerMarkedSegmentMaxSeconds).toBe(45);
    expect(nextPkg.boundary.surroundingReviewMaxSeconds).toBe(240);
    expect(nextPkg.boundary.surroundingReviewMeansTotalWindow).toBe(true);
    expect(shortFormContentPackContractV1.youProvide.join(" ")).toMatch(
      /45 seconds or less/i,
    );
    expect(shortFormContentPackContractV1.important).toMatch(/45 seconds or less/i);
    expect(shortFormContentPackContractV1.important).toMatch(
      /4 minutes total surrounding/i,
    );
    expect(learn.purpose).toMatch(/45 seconds or less/i);
    expect(learn.purpose).toMatch(/4 minutes total surrounding/i);
    expect(learn.purpose).toContain(CLIP_REPURPOSING_BOUNDARY_SENTENCE);
    expect(checkout.heading).toBe("Here is what you will need");
    expect(checkout.lead).toMatch(/4 minutes total surrounding/i);
    expect(checkout.lead).toContain(CLIP_REPURPOSING_BOUNDARY_SENTENCE);
    expect(checkout.confirmSegmentCap).toMatch(/45 seconds or less/i);
    expect(help.differenceQuestion).toBe(
      "What is the difference between the Short-Form Content Pack and Clip Repurposing?",
    );
    expect(help.differenceAnswer).toMatch(/4 minutes total surrounding/i);
    expect(help.differenceAnswer).toContain(CLIP_REPURPOSING_BOUNDARY_SENTENCE);
    expect(help.fourMinuteAnswer).toMatch(/capped at 45 seconds/i);
    expect(help.fourMinuteAnswer).toMatch(/4 minutes total surrounding/i);
    expect(published).not.toMatch(/\$549/);
    expect(published).not.toMatch(/up to 5/i);
    expect(published).not.toMatch(/Maya/i);
    expect(published).toMatch(
      /Three finished videos are not guaranteed if the marked material cannot produce three clean, complete standalone shorts/,
    );
    expect(published).toMatch(
      /Custom illustration, custom photography, or a new photoshoot for cover graphics/,
    );
    expect(published).not.toMatch(/\$349 Short-Form Content Pack and \$549/);
    for (const match of published.matchAll(/4 minutes[^.]*\./gi)) {
      expect(match[0]).toMatch(/total surrounding/i);
    }
    expect(shortFormContentPackContractV1.whatsNotIncluded.join(" ")).toMatch(
      /long recording/i,
    );
    expect(shortFormContentPackContractV1.important).toMatch(/Clip Repurposing/i);
  });
});
