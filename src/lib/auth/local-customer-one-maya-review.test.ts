import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { canReadCampaign } from "@/lib/campaign-store/access";
import {
  LOCAL_CUSTOMER_ONE_MAYA_REVIEW_PATH,
  MAYA_PAID_CAMPAIGN_ID,
  MAYA_PAID_JOB_ID,
  mayaPaidReviewPhoneHref,
} from "@/lib/auth/local-customer-one-maya-review";
import { LOCAL_CUSTOMER_ONE_FIXTURE_ID } from "@/lib/auth/local-customer-one-fixture-copy";

const mayaEnvelope = {
  campaignId: MAYA_PAID_CAMPAIGN_ID,
  clientUserId: LOCAL_CUSTOMER_ONE_FIXTURE_ID,
  record: { campaignId: MAYA_PAID_CAMPAIGN_ID },
} as never;

describe("MJ-D25 — paid Maya access doorway", () => {
  it("denies THE STUDIO session and allows the Customer-One fixture", () => {
    const theStudioUser = {
      id: "1ae91f0a-0d15-4a11-8db7-1de627f74ea7",
      email: "studio@local.dev",
      displayName: "the Studio",
      roles: ["client"] as const,
      currentCampaignId: "9c6c25f2-2562-4192-97a5-44536e45cd18",
      clientCampaignIds: ["9c6c25f2-2562-4192-97a5-44536e45cd18"],
    };
    const mayaUser = {
      id: LOCAL_CUSTOMER_ONE_FIXTURE_ID,
      email: "customer-one@local.dev",
      displayName: "Maya",
      roles: ["client"] as const,
      currentCampaignId: MAYA_PAID_CAMPAIGN_ID,
      clientCampaignIds: [MAYA_PAID_CAMPAIGN_ID],
    };

    expect(canReadCampaign(theStudioUser, MAYA_PAID_CAMPAIGN_ID, mayaEnvelope)).toBe(
      false,
    );
    expect(canReadCampaign(mayaUser, MAYA_PAID_CAMPAIGN_ID, mayaEnvelope)).toBe(true);
  });

  it("names the Maya job and keeps THE STUDIO out of the Review href", () => {
    const href = mayaPaidReviewPhoneHref();
    expect(href).toContain("/feedback-studio");
    expect(href).toContain(encodeURIComponent(MAYA_PAID_JOB_ID));
    expect(href).toContain("studioPaymentSandbox=1");
    expect(href).not.toContain("9c6c25f2");
  });

  it("local doorway is fixture-gated, posts Customer-One, then opens Maya Review", () => {
    const page = readFileSync(
      join(process.cwd(), "src/app/local-customer-one-maya-review/page.tsx"),
      "utf8",
    );
    const scene = readFileSync(
      join(
        process.cwd(),
        "src/components/auth/LocalCustomerOneMayaReviewScene.tsx",
      ),
      "utf8",
    );
    expect(page).toContain("isLocalAuthFixtureAvailable()");
    expect(page).toContain("notFound()");
    expect(scene).toContain('"/api/auth/local-customer-one"');
    expect(scene).toContain("mayaPaidReviewPhoneHref()");
    expect(LOCAL_CUSTOMER_ONE_MAYA_REVIEW_PATH).toBe(
      "/local-customer-one-maya-review",
    );
  });
});
