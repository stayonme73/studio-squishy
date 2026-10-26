/**
 * What We Create sample set — one coordinated homepage batch.
 * Production Team creates. Quality reviews the full set.
 * Owner Console returns one packet. Scout integrates only after APPROVE.
 */

export const STUDIO_HOMEPAGE_SAMPLE_SET_RECORD_ID =
  "studio-homepage-what-we-create-sample-set" as const;

export const STUDIO_HOMEPAGE_SAMPLE_SET_MATTER_ID =
  "studio-homepage-what-we-create-sample-set" as const;

export const homepageWhatWeCreateSampleSetV1 = {
  packageId: "STUDIO-HOMEPAGE-WHAT-WE-CREATE-SAMPLE-SET-1",
  judgmentKind: "homepage_sample_set_owner_acceptance" as const,
  recordId: STUDIO_HOMEPAGE_SAMPLE_SET_RECORD_ID,
  matterId: STUDIO_HOMEPAGE_SAMPLE_SET_MATTER_ID,
  matter: "What We Create sample set",
  company: "The Studio Company",
  notACustomerDeliverable: true,
  doNotOpenCustomerCampaign: true,
  doNotRebuildOwnerConsole: true,
  onePacketOnly: true,
  doNotIntegrateUntilFullSetApprove: true,
  noCategorySubstitutions: true,
  noAdditions: true,
  noOrderChanges: true,
  noVideo2: true,
  noVideo3: true,
  noPage2: true,
  doNotMerge: true,
  doNotPush: true,
  doNotPublish: true,
  doNotRemintMaya: true,
  format: "still_example_output_plates_for_existing_tiles" as const,
  exampleSubject: "The Studio Company — labeled SAMPLE, not a client result",
  categories: [
    {
      id: "long-to-short",
      label: "Long video to short clips",
      role: "video" as const,
      onImage: "One longer video. Multiple polished shorts.",
    },
    {
      id: "short-form",
      label: "Short-form video editing",
      role: "video" as const,
      onImage: "Your selected moments. Polished short-form videos.",
    },
    {
      id: "social-graphics",
      label: "Social graphics",
      role: "design" as const,
      onImage: "Coordinated graphics for one campaign or theme.",
    },
    {
      id: "ad-creative",
      label: "Ad creative",
      role: "design" as const,
      onImage: "Promotional creative for the campaign you asked for.",
    },
    {
      id: "email-text",
      label: "Email & text campaign materials",
      role: "design" as const,
      onImage: "Matching email and text materials.",
    },
    {
      id: "menu-price",
      label: "Menu / price list",
      role: "design" as const,
      onImage: "A clear, usable menu or price list.",
    },
    {
      id: "reviews-proof",
      label: "Reviews & customer-proof materials",
      role: "design" as const,
      onImage: "Review and proof materials you can share.",
    },
    {
      id: "flyer-card",
      label: "Flyers / business-card design",
      role: "design" as const,
      onImage: "A flyer or business card for the details you provide.",
    },
  ],
  sampleLabel: "SAMPLE",
  raiseOnlyAfterQualityPass: true,
  qualityClassificationsThatRaise: ["A", "B"] as const,
  blockedClassification: "C" as const,
  assetUrlPrefix: "/owner-judgment-asset/what-we-create-sample",
  returnInboxRelative:
    "docs/launch/studio-homepage-what-we-create-sample-set-1/OWNER-CONSOLE-RETURN",
  ownerDecisionRelative:
    "docs/launch/studio-homepage-what-we-create-sample-set-1/OWNER-DECISION.json",
  homepageSlot: "#our-work",
  whyYouAreGettingThis:
    "Quality reviewed all 8 What We Create samples as one set. Final acceptance is Owner judgment of the full family. Scout cannot put any sample on Page 1 without you.",
  whatINeedFromYou:
    "Review the 8 samples together. Approve the full set, reject it, or send it back.",
  ownerSteps: [
    "Look at all 8 samples in one packet.",
    "Check family consistency, truthfulness, and no fake client claims.",
    "Approve the full set, reject it, or send it back to Production.",
  ],
  actions: ["approve", "reject", "send_back"] as const,
  afterApprove:
    "Scout places the approved set into the existing What We Create tiles only. No Page 1 redesign. No publish / no merge / no push.",
  afterReject: "The set stays off Page 1. Scout does not integrate any card.",
  afterSendBack:
    "Production Team fixes the failed samples. Passing samples are kept. Quality reruns the complete set.",
} as const;
