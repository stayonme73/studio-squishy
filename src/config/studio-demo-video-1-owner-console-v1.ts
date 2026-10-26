/**
 * Video 1 Owner Console retrieval — existing desk, not a rebuild.
 * Production Team → Quality → Machine → Owner Console → Owner decision.
 * Scout integrates only after Owner APPROVE.
 */

export const STUDIO_DEMO_VIDEO_1_OWNER_CONSOLE_RECORD_ID =
  "studio-demo-video-1-clip-repurposing" as const;

export const STUDIO_DEMO_VIDEO_1_OWNER_CONSOLE_MATTER_ID =
  "studio-demo-video-1-clip-repurposing" as const;

export const studioDemoVideo1OwnerConsoleV1 = {
  packageId: "STUDIO-DEMO-VIDEO-1-CLIP-REPURPOSING",
  judgmentKind: "studio_demo_owner_acceptance" as const,
  recordId: STUDIO_DEMO_VIDEO_1_OWNER_CONSOLE_RECORD_ID,
  matterId: STUDIO_DEMO_VIDEO_1_OWNER_CONSOLE_MATTER_ID,
  matter: "Video 1: Clip Repurposing",
  company: "The Studio Company",
  notACustomerDeliverable: true,
  doNotOpenCustomerCampaign: true,
  doNotRebuildOwnerConsole: true,
  telemetryConsoleStaysParked: true,
  genuineOwnerJudgmentBelongsOnExistingDesk: true,
  raiseOnlyAfterQualityPass: true,
  qualityClassificationsThatRaise: ["A", "B"] as const,
  blockedClassification: "C" as const,
  playableAssetUrl: "/owner-judgment-asset/studio-demo-video-1",
  returnInboxRelative:
    "docs/launch/studio-demo-video-1-clip-repurposing-1/OWNER-CONSOLE-RETURN/clip-repurposing-studio-demo.mp4",
  ownerDecisionRelative:
    "docs/launch/studio-demo-video-1-clip-repurposing-1/OWNER-DECISION.json",
  homepageSlot: "#studio-demo",
  homepageIntegrationTarget: "public/studio-demo/clip-repurposing-studio-demo.mp4",
  whyYouAreGettingThis:
    "Quality passed this customer-facing homepage demo. Final acceptance is Owner judgment. Scout cannot put it on Page 1 without you.",
  whatINeedFromYou:
    "Watch the finished MP4. Read the QA result and any explicit limits. Approve, Reject, or Send Back.",
  ownerSteps: [
    "Watch the playable final MP4.",
    "Read the QA result and any explicit limits.",
    "Approve for Page 1, reject it, or send it back to Production.",
  ],
  actions: ["approve", "reject", "send_back"] as const,
  afterApprove:
    "Scout replaces the existing Page 1 demo asset only. No homepage redesign. No publish / no merge / no push.",
  afterReject: "The cut stays off Page 1. Scout does not integrate it.",
  afterSendBack:
    "Production Team corrects the cut. The homepage slot stays unapproved.",
} as const;
