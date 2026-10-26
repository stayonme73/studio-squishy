import { describe, expect, it } from "vitest";

import { campaignLaunchKitReviewNoticeEvent } from "@/lib/studio-customer-life/machine-campaign-launch-kit-review-bind";

const jobId = "studio-email-cert:campaign_launch_kit";

describe("campaign launch kit review notice", () => {
  it("announces the first customer review when no correction has been requested", () => {
    expect(
      campaignLaunchKitReviewNoticeEvent({ jobCorrectionUses: [] }, jobId),
    ).toBe("ready_for_review");
  });

  it("announces a revision only after the customer requested one", () => {
    expect(
      campaignLaunchKitReviewNoticeEvent(
        {
          jobCorrectionUses: [
            {
              id: "use-1",
              campaignId: "studio-email-cert",
              jobId,
              idempotencyKey: "key",
              packageId: "pkg",
              submittedAt: "2026-10-18T00:00:00.000Z",
              submissionType: "revision_requested",
              releaseActivityId: "status",
              versionLabel: "Version 1",
              actorUserId: "client",
              actorDisplayName: "Client",
              occurredAt: "2026-10-18T00:00:00.000Z",
              ordinal: 1,
              consumptionKind: "included",
              stickyNoteCount: 1,
              voiceNoteCount: 0,
              drawSectionCount: 0,
              sectionStatuses: {},
            },
          ],
        },
        jobId,
      ),
    ).toBe("revision_ready_again");
  });
});
