import { describe, expect, it } from "vitest";

import { studioRoom3OwnerConsoleWholeDeskRehearsalAndCloseoutV1 as cfg } from "@/config/studio-room-3-owner-console-whole-desk-rehearsal-and-closeout-v1";
import { bundleHasRecentlyResolvedForOwnerConsole } from "@/lib/campaign-tasks/owner-console-scan-view";
import { shouldIncludeCampaignInOwnerConsoleAggregate } from "@/lib/campaign-tasks/owner-console-view";
import { shouldExceptionKindAppearOnSequentialDesk } from "@/lib/campaign-tasks/owner-console-decision-boundary";
import { classifyOwnerConsoleCampaignForLiveDesk } from "@/lib/file-room/owner-console-live-desk";
import type { OwnerConsoleCampaignBundle } from "@/lib/campaign-tasks/owner-console-view";
import type { ServerCampaignEnvelope } from "@/lib/campaign-store/types";

const now = new Date().toISOString();

function envelope(campaignId: string, campaignName: string): ServerCampaignEnvelope {
  return {
    campaignId,
    clientUserId: "client-1",
    syncVersion: 1,
    syncedAt: now,
    record: {
      campaignId,
      campaignName,
      campaignStatus: "BUILDING_CONCEPTS",
      campaignDescription: "",
      estimatedCompletion: "",
      packageId: "custom-studio-plan",
      packageLabel: "Custom Studio Plan",
      paymentReceivedAt: now,
      projectDetailsSubmittedAt: now,
      revisionRoundsUsed: 0,
      revisionRoundsIncluded: 1,
      deliverablesDelivered: {},
      createdAt: now,
      updatedAt: now,
    },
  };
}

describe("studio-room-3-whole-desk-rehearsal-and-closeout", () => {
  it("locks Section 3 package metadata", () => {
    expect(cfg.packageId).toBe(
      "STUDIO-OPERATING-ROOM-3-OWNER-CONSOLE-WHOLE-DESK-REHEARSAL-AND-CLOSEOUT-1",
    );
    expect(cfg.priorSections.section1.closeTip).toBe("76b974f");
    expect(cfg.priorSections.section2.closeTip).toBe("199e4a4");
    expect(cfg.sectionClosed).toBe(true);
    expect(cfg.closeTip).toBe("cd2a1e2");
    expect(cfg.doNotStartRoom4).toBe(false);
    expect(cfg.doNotReopenResend).toBe(true);
  });

  it("keeps routine noise off the sequential desk", () => {
    expect(shouldExceptionKindAppearOnSequentialDesk("missing_client_fact")).toBe(false);
    expect(shouldExceptionKindAppearOnSequentialDesk("routine_internal")).toBe(false);
  });

  it("keeps genuine judgment classes on the sequential desk", () => {
    for (const kind of [
      "pricing_exception",
      "scope_change",
      "revision_exhausted",
      "compliance_hold",
      "client_request",
    ] as const) {
      expect(shouldExceptionKindAppearOnSequentialDesk(kind)).toBe(true);
    }
  });

  it("hides prior walk residue but keeps live Section 3 fixtures visible", () => {
    expect(classifyOwnerConsoleCampaignForLiveDesk("room3-s2d-refund-abc")).toBe(
      "stored_historical_evidence",
    );
    expect(classifyOwnerConsoleCampaignForLiveDesk("room3-s3-refund-abc")).toBe(
      "stored_historical_evidence",
    );
    expect(classifyOwnerConsoleCampaignForLiveDesk("room3-s4-live-abc")).toBe("live_owner_work");
  });

  it("keeps recently resolved campaigns in aggregate after desk clears", () => {
    const bundle: OwnerConsoleCampaignBundle = {
      envelope: envelope("owner-live-desk-now", "Live desk"),
      tasksEnvelope: {
        campaignId: "owner-live-desk-now",
        tasks: [],
        planFingerprint: "fp",
        updatedAt: now,
        version: 1,
        syncedAt: now,
        exceptionRecords: [
          {
            id: "exc-1",
            campaignId: "owner-live-desk-now",
            kind: "pricing_exception",
            title: "Quoted flyer price exception",
            description: "",
            status: "resolved",
            createdAt: now,
            updatedAt: now,
            resolvedAt: now,
          },
        ],
        exceptionEvents: [],
      },
      materials: { campaignId: "room3-s3-price-1", items: [], updatedAt: now, version: 1 },
    };
    expect(bundleHasRecentlyResolvedForOwnerConsole(bundle)).toBe(true);
    expect(
      shouldIncludeCampaignInOwnerConsoleAggregate(bundle.envelope, false, true),
    ).toBe(true);
  });
});
