/** Minimal production-intent intake answers per homepage package (matches desk reconciliation tests). */

export function intakeAnswersForPackage(packageId) {
  switch (packageId) {
    case "clip_repurposing":
      return {
        "shared:businessName": "HPT Clip Cert Co",
        "clip_repurposing:purpose": "Turn our founder Q&A into short clips for Instagram and TikTok.",
        "clip_repurposing:context": "One 18-minute talking-head recording; clear audio.",
        "clip_repurposing:cta": "Book a consult",
        "clip_repurposing:mustKeep": "Founder name and studio brand",
        "clip_repurposing:qualifyingSource":
          "I confirm the source is my own talking-head footage with usable audio.",
        "clip_repurposing:intelligible":
          "I confirm speech is intelligible without heavy cleanup beyond normal studio standards.",
        "clip_repurposing:rights":
          "I have permission to use the materials I am supplying for this project.",
      };
    case "short_form_video_editing":
      return {
        "shared:businessName": "HPT SFV Cert Co",
        "short_form_video_editing:purpose": "Polished short-form edit from our supplied footage.",
        "short_form_video_editing:context": "Under 5 minutes raw; vertical delivery.",
        "short_form_video_editing:cta": "Visit our site",
        "short_form_video_editing:mustKeep": "Logo end card",
        "short_form_video_editing:rights":
          "I have permission to use the materials I am supplying for this project.",
      };
    case "social_and_promo_graphics":
      return {
        "shared:businessName": "Spruce Line Studio",
        "shared:phone": "(555) 010-8820",
        "shared:webOrSocial": "spruceline.example/open-house",
        "social_and_promo_graphics:purpose": "Spring open-house weekend for the studio lounge",
        "social_and_promo_graphics:facts":
          "Open house November 8 – December 15, 2026. Book a $49 mini-consultation slot and receive one complimentary beverage. No purchase required to tour the lounge.",
        "social_and_promo_graphics:cta": "Reserve your spot",
        "social_and_promo_graphics:mustKeep": "Warm, welcoming, not loud or salesy",
        "social_and_promo_graphics:rights":
          "I have permission to use the materials I am supplying for this hosted certification project.",
      };
    case "campaign_launch_kit":
      return {
        "shared:businessName": "HPT Kit Cert Co",
        "campaign_launch_kit:purpose": "Spring tune-up campaign for our local studio.",
        "campaign_launch_kit:facts": "Open house, email list, and social push in one coordinated kit.",
        "campaign_launch_kit:mustKeep": "Studio name and warm tone",
        "campaign_launch_kit:rights":
          "I have permission to use the materials I am supplying for this project.",
      };
    default:
      return {};
  }
}

export function condensedCheckoutBody({ packageId, campaignId, previewOrigin, email }) {
  return {
    campaignId,
    returnOrigin: previewOrigin,
    customerEmail: email,
    purchaseKind: "condensed_offer",
    facts: {
      draftRevision: 1,
      routeId: null,
      selectedServiceIds: [packageId],
      projectNeed: `Hosted HPT cert ${packageId}`,
      businessName: "HPT Cert Co",
      requestedDeadline: "",
      deadlineStatus: "not_requested",
      existingMaterialsNote: "",
    },
    condensedOffer: {
      packageId,
      customerName: "Scout HPT Cert",
      company: "HPT Cert Co",
      projectNeed: `Hosted HPT cert ${packageId}`,
      materialsNote: "",
      support: {},
    },
  };
}
