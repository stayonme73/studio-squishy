/** Studio policies & FAQ — single source for Help Center (and contextual links elsewhere). */

import { studioBoard } from "@/config/studio-board";
import { studioExtrasExplainer } from "@/config/studio-extras-v1";
import { threePackageRevisionCustomerAnswer } from "@/config/studio-three-package-revision-truth-v1";

export type PolicyContentBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; intro?: string; items: readonly string[] };

export type FaqItem = {
  id: string;
  question: string;
  blocks: readonly PolicyContentBlock[];
};

export type PolicyItem = {
  id: string;
  title: string;
  blocks: readonly PolicyContentBlock[];
};

export const studioPolicies = {
  aboutTheStudio: {
    title: "About The Studio",
    blocks: [
      {
        kind: "p",
        text: "The Studio creates ready-to-use marketing materials for businesses, organizations, professionals, and entrepreneurs. Choose only the services you need, complete Build Your Project, and we'll build the deliverables you selected.",
      },
      {
        kind: "p",
        text: "Your path through The Studio: Home → Package Detail → Build Your Project → Review & Pay → Project Intake → My Studio → Final Delivery.",
      },
      {
        kind: "ul",
        intro: "The Studio is for people who want professional marketing deliverables without building everything from scratch.",
        items: [
          "Launching a promotion, product, event, or new offer",
          "Refreshing an existing promotion or profile",
          "Getting a defined deliverable with a clear scope",
        ] as const,
      },
      {
        kind: "ul",
        intro: "What you receive:",
        items: [
          "Deliverables scoped to the services you selected",
          "Status updates in My Studio and on your Project Record",
          "Review Room when work is ready for your feedback",
          "Approved files through Final Delivery",
        ] as const,
      },
      {
        kind: "p",
        text: "The Studio is not an agency that runs your business. We create the marketing materials you request — we do not buy ads, manage your accounts, send campaigns on your behalf, or guarantee sales or business growth.",
      },
    ] as const,
  },
  faq: {
    title: "Frequently Asked Questions",
    philosophy: {
      title: "WHAT DOES THE STUDIO DO?",
      blocks: [
        {
          kind: "p",
          text: "We believe business owners should stay in control of their ideas.",
        },
        {
          kind: "p",
          text: "The Studio creates professional marketing deliverables. You approve every major step. Your files remain yours.",
        },
        {
          kind: "p",
          text: "We don't become your marketing department. We build the work you requested.",
        },
        {
          kind: "p",
          text: "From the Home page, The Studio shows the packages it can start now. You choose the package to purchase.",
        },
        { kind: "p", text: "You choose what to purchase, complete Project Intake, and review finished work in Review Room." },
        { kind: "p", text: "The Studio recommends." },
        { kind: "p", text: "You decide." },
      ] as const,
    },
    items: [
      {
        id: "monthly-subscription",
        question: "DO I NEED A MONTHLY SUBSCRIPTION?",
        blocks: [{ kind: "p", text: "No. Purchase only the services you need." }] as const,
      },
      {
        id: "multiple-services",
        question: "CAN I ORDER MORE THAN ONE PACKAGE?",
        blocks: [
          {
            kind: "p",
            text: "You choose one package. On Build Your Project you can add up to two Studio Extras, or skip them. Studio Extras do not replace the package.",
          },
        ] as const,
      },
      {
        id: "how-studio-creates-project",
        question: "HOW DOES THE STUDIO CREATE MY PROJECT?",
        blocks: [
          {
            kind: "p",
            text: "The Studio combines experienced creative direction with AI-assisted production tools to produce marketing deliverables efficiently.",
          },
          {
            kind: "p",
            text: "Every project is reviewed for quality before delivery.",
          },
        ] as const,
      },
      {
        id: "after-payment",
        question: "WHAT HAPPENS AFTER I PAY?",
        blocks: [
          {
            kind: "p",
            text: "Card entry happens on Stripe. The Studio page does not collect your card. Payment is complete only after Stripe confirms it. You then complete Project Intake. If you need an account, you sign in or create one. You add the actual files in My Studio. Adding a file does not start production.",
          },
          {
            kind: "p",
            text: "Production begins only when payment is confirmed, Project Intake is complete, the required materials have been reviewed and accepted, and the work has been moved into production.",
          },
          {
            kind: "p",
            text: "The Studio checks the file type and the file size. It does not automatically check length, audio clarity, or how many people are speaking.",
          },
          {
            kind: "p",
            text: "Your path through The Studio: Home → Package Detail → Build Your Project → Review & Pay → Project Intake → My Studio → Final Delivery.",
          },
          {
            kind: "p",
            text: "Follow progress in My Studio and on your Project Record. Status updates appear as your project moves forward.",
          },
        ] as const,
      },
      {
        id: "campaign-timeline",
        question: "HOW LONG DOES MY PROJECT TAKE?",
        blocks: [
          {
            kind: "p",
            text: "The Studio does not promise a delivery date.",
          },
          {
            kind: "p",
            text: "How long the work takes depends on the package, the materials The Studio still needs, and your responses during review.",
          },
          {
            kind: "p",
            text: "If The Studio still needs materials or a review response, that part of the project waits.",
          },
        ] as const,
      },
      {
        id: "email-notifications",
        question: "WILL I RECEIVE EMAIL UPDATES?",
        blocks: [
          {
            kind: "p",
            text: "Project progress is shown in My Studio. Email notices are a courtesy when they are sent. My Studio is the source of truth.",
          },
          {
            kind: "p",
            text: "After payment and Project Intake, return to My Studio for status updates, open Review Room when work is ready, and collect approved files in Final Delivery when your project is complete.",
          },
          {
            kind: "p",
            text: "If you received an email or a link, use it only as a reminder to sign in. Your official next step is always shown in My Studio.",
          },
        ] as const,
      },
      {
        id: "payments-refund-eligibility",
        question: "WHEN CAN I REQUEST A REFUND?",
        blocks: [
          {
            kind: "p",
            text: "Payment is required before work can proceed, but paying alone does not start production on any service.",
          },
          {
            kind: "p",
            text: "Refund eligibility is determined per service. If production has not started on that service and the requirements of the Refund Policy are met, a refund may be approved.",
          },
          {
            kind: "p",
            text: "Once production has started on a service, payment for that service becomes non-refundable.",
          },
          {
            kind: "p",
            text: "See the Refund Policy below.",
          },
        ] as const,
      },
      {
        id: "change-mind-after-intake",
        question: "WHAT IF I CHANGE MY MIND AFTER SUBMITTING PROJECT DETAILS?",
        blocks: [
          {
            kind: "p",
            text: "Your project uses the information you provide in Project Intake and any required materials.",
          },
          {
            kind: "p",
            text: "You may submit clarification and use your included revision rounds where available.",
          },
          {
            kind: "p",
            text: "Major direction changes may require a new order or additional work.",
          },
        ] as const,
      },
      {
        id: "revision-definition",
        question: "WHAT COUNTS AS A REVISION?",
        blocks: [
          {
            kind: "p",
            text: "A revision is an adjustment to materials that have already been created for your selected service.",
          },
          {
            kind: "ul",
            intro: "Examples include:",
            items: [
              "wording changes",
              "design adjustments",
              "content refinements",
              "visual updates within the approved scope",
            ] as const,
          },
          {
            kind: "ul",
            intro: "A revision is not:",
            items: [
              "a completely new deliverable",
              "a new audience",
              "a new offer",
              "a new business direction",
              "work outside the scope of your selected service",
            ] as const,
          },
          { kind: "p", text: "Work outside scope may require a new order." },
        ] as const,
      },
      {
        id: "revision-count",
        question: "HOW MANY REVISIONS DO I GET?",
        blocks: [
          {
            kind: "p",
            text: threePackageRevisionCustomerAnswer,
          },
          {
            kind: "p",
            text: "My Studio shows how many revision rounds are included and how many remain.",
          },
        ] as const,
      },
      {
        id: "creative-room-ideas",
        question: "CAN I KEEP ADDING FEEDBACK IN REVIEW ROOM?",
        blocks: [
          {
            kind: "p",
            text: "Review Room is where you review finished work, share feedback, and approve deliverables within scope.",
          },
          {
            kind: "p",
            text: "Open Review Room to see the work, leave feedback, approve, or request a revision.",
          },
          {
            kind: "p",
            text: "New requests that substantially change the approved scope may require a new order or additional work.",
          },
        ] as const,
      },
      {
        id: "deliverable-ownership",
        question: "WHO OWNS THE FINISHED WORK?",
        blocks: [
          {
            kind: "p",
            text: "After final payment and delivery, the approved client-facing deliverables are yours.",
          },
        ] as const,
      },
      {
        id: "current-packages",
        question: "WHAT ARE THE CURRENT PACKAGES?",
        blocks: [
          {
            kind: "p",
            text: "Clip Repurposing is $373.75. Short-Form Video Editing is $186.25. Social & Promo Graphics is $199. Campaign Launch Kit is $349. Each package includes three revision rounds. The 20% Studio Thank-You is applied at payment.",
          },
          {
            kind: "p",
            text: "Clip uses one qualifying recording. Short-Form uses up to 3 selected English clips or marked moments. Social & Promo Graphics uses your business facts, a logo if you have one, photos if you have them, prices or disclosures, and a call to action if you have one. There is no video requirement for Social & Promo Graphics. Campaign Launch Kit is a fixed set: one promotional flyer with a print-yourself PDF, one paste-ready email, two paste-ready text messages, and one square plus one portrait graphic. You send and post them. A short usage guide is included and is not a fifth piece. Actual files are added in My Studio after checkout.",
          },
          {
            kind: "p",
            text: studioExtrasExplainer().whatYouCanAdd,
          },
          {
            kind: "p",
            text: studioExtrasExplainer().promise,
          },
          {
            kind: "p",
            text: studioExtrasExplainer().revisions,
          },
        ] as const,
      },
      {
        id: "passwords",
        question: "DO I NEED TO GIVE YOU MY PASSWORDS?",
        blocks: [
          {
            kind: "p",
            text: "No. The Studio does not take passwords and does not log into your social, ads, email, review, or Google Business accounts. The Studio creates the work and delivers the files. You decide where and when to publish them.",
          },
        ] as const,
      },
      {
        id: "short-form-content-pack-difference",
        question: "What is the difference between Short-Form Video Editing and Clip Repurposing?",
        blocks: [
          {
            kind: "p",
            text: "Short-Form Video Editing polishes up to 3 English clips or marked moments you already chose. Each one should be 45 seconds or less. The Studio may look slightly before or after a marked moment so the opening, ending, or thought is complete. It does not search a long recording for moments.",
          },
          {
            kind: "p",
            text: "Clip Repurposing is where The Studio searches one recording. That recording should be 15–60 minutes, filmed vertically, in English, with one primary speaker, and clear enough to follow.",
          },
        ] as const,
      },
      {
        id: "short-form-content-pack-four-minute",
        question: "How long can each Short-Form clip be?",
        blocks: [
          {
            kind: "p",
            text: "Each source clip or marked moment should be in English and 45 seconds or less. The Studio does not measure that length for you. You confirm that the clip fits. If you want The Studio to search a longer recording and choose the moments, that is Clip Repurposing.",
          },
        ] as const,
      },
      {
        id: "short-form-content-pack-contract",
        question: "What does Short-Form Video Editing include?",
        blocks: [
          {
            kind: "p",
            text: "You provide up to 3 English source clips or marked moments, each up to 45 seconds, plus any facts and call-to-action wording the videos need. You add the actual files in My Studio after checkout.",
          },
          {
            kind: "p",
            text: "The Studio delivers up to 3 polished short-form videos, matching captions, cover and title graphics, and a simple guide for posting or using the finished videos. Pacing and audio may be improved where appropriate. Three revision rounds are included.",
          },
          {
            kind: "p",
            text: "Three finished videos are not guaranteed if the material you marked cannot produce three clean, complete shorts. The Studio will not add weak filler just to reach a number.",
          },
        ] as const,
      },
      {
        id: "results-expectations",
        question: "WHAT RESULTS SHOULD I EXPECT?",
        blocks: [
          {
            kind: "p",
            text: "The Studio creates marketing materials based on your direction and the services you selected.",
          },
          {
            kind: "p",
            text: "Marketing can help increase visibility, awareness, engagement, and opportunities.",
          },
          { kind: "p", text: "The Studio cannot guarantee:" },
          {
            kind: "ul",
            items: [
              "sales",
              "revenue",
              "leads",
              "followers",
              "bookings",
              "website traffic",
              "rankings",
              "business growth",
            ] as const,
          },
          {
            kind: "p",
            text: "Business results depend on many factors beyond marketing materials alone.",
          },
        ] as const,
      },
    ] as const satisfies readonly FaqItem[],
  },

  policies: {
    title: "Studio Policies",
    items: [
      {
        id: "payment-policy",
        title: "PAYMENT POLICY",
        blocks: [
          { kind: "p", text: "Payment is required before work can proceed." },
          {
            kind: "p",
            text: "Production is tracked per service. Paying on Review & Pay reserves your selected package but does not, by itself, start creative production.",
          },
          {
            kind: "p",
            text: "Completing Project Intake does not begin production.",
          },
        ] as const,
      },
      {
        id: "production-policy",
        title: "PRODUCTION POLICY",
        blocks: [
          {
            kind: "p",
            text: "Production is tracked per service — not per customer account. Other services in your project can continue independently while one service is paused.",
          },
          {
            kind: "p",
            text: "Production begins on a service only when all four conditions are true for that service:",
          },
          {
            kind: "ul",
            items: [
              "Payment has been received.",
              "Project Intake is complete.",
              "Required materials for that service have been reviewed and accepted.",
              "The service has been moved into production.",
            ] as const,
          },
          {
            kind: "p",
            text: "Only then does payment for that service become non-refundable.",
          },
          {
            kind: "p",
            text: "Missing required information or materials pauses production on that service only.",
          },
          {
            kind: "p",
            text: "The Studio does not promise a delivery date. Timing depends on required materials being reviewed and accepted, and on your responses in Review Room.",
          },
        ] as const,
      },
      {
        id: "missing-materials-policy",
        title: "MISSING MATERIALS POLICY",
        blocks: [
          {
            kind: "p",
            text: "Some services require materials before production can begin. My Studio shows what is required and what is still missing.",
          },
          {
            kind: "p",
            text: "If required materials are still missing, that part of the project waits. Other work in the same project can continue.",
          },
          {
            kind: "p",
            text: "When the required materials are received, that part of the project can continue.",
          },
        ] as const,
      },
      {
        id: "waiting-on-client-policy",
        title: "WAITING ON CLIENT POLICY",
        blocks: [
          {
            kind: "p",
            text: "The Studio cannot continue a service without the required information, materials, or approvals from you.",
          },
          {
            kind: "p",
            text: "When a service is Waiting on Client, that service waits until you provide what is needed.",
          },
          {
            kind: "p",
            text: "Providing the required information or materials allows that service to continue.",
          },
        ] as const,
      },
      {
        id: "timeline-policy",
        title: "TIMELINE POLICY",
        blocks: [
          {
            kind: "p",
            text: "The Studio does not promise a delivery date.",
          },
          {
            kind: "p",
            text: "How long the work takes depends on the package, the materials The Studio still needs, and your responses during review.",
          },
          {
            kind: "p",
            text: "The work can take longer when required materials, feedback, or approvals are delayed.",
          },
          {
            kind: "p",
            text: "A service in Waiting on Client does not advance until the required response is received.",
          },
        ] as const,
      },
      {
        id: "revision-policy",
        title: "REVISION POLICY",
        blocks: [
          {
            kind: "p",
            text: threePackageRevisionCustomerAnswer,
          },
          {
            kind: "p",
            text: "My Studio shows how many revision rounds remain.",
          },
          {
            kind: "p",
            text: "Additional revisions, new deliverables, or work outside scope may require a new order or additional fee.",
          },
        ] as const,
      },
      {
        id: "refund-policy",
        title: "REFUND POLICY",
        blocks: [
          { kind: "p", text: "Payment is required before work can proceed." },
          {
            kind: "p",
            text: "Refund eligibility is determined per service.",
          },
          {
            kind: "p",
            text: "If production has not started on that service and the requirements of this policy are met, a refund may be approved.",
          },
          {
            kind: "p",
            text: "Once production has started on a service, payment for that service becomes non-refundable.",
          },
          {
            kind: "p",
            text: "Paying or completing Project Intake alone does not start production and does not remove refund eligibility by itself.",
          },
        ] as const,
      },
      {
        id: "final-delivery-policy",
        title: "FINAL DELIVERY POLICY",
        blocks: [
          {
            kind: "p",
            text: "Final Delivery contains the approved files for the services you purchased, ready to download.",
          },
          {
            kind: "p",
            text: "Internal production systems and working files remain private to The Studio.",
          },
          {
            kind: "p",
            text: "You receive the approved client-facing deliverables for each completed service.",
          },
        ] as const,
      },
      {
        id: "vision-responsibility-policy",
        title: "PROJECT RESPONSIBILITY POLICY",
        blocks: [
          {
            kind: "p",
            text: "Deliverables are created using the information you submit in Project Intake, required materials, and approved feedback in Review Room.",
          },
          {
            kind: "p",
            text: "You are responsible for providing accurate direction, preferences, goals, and supporting information.",
          },
        ] as const,
      },
      {
        id: "results-disclaimer",
        title: "RESULTS DISCLAIMER",
        blocks: [
          { kind: "p", text: "The Studio cannot guarantee:" },
          {
            kind: "ul",
            items: [
              "sales",
              "revenue",
              "leads",
              "followers",
              "bookings",
              "website traffic",
              "rankings",
              "business growth",
            ] as const,
          },
          {
            kind: "p",
            text: "The Studio creates marketing materials based on client direction.",
          },
          {
            kind: "p",
            text: "Business results depend on factors beyond marketing materials alone.",
          },
        ] as const,
      },
      {
        id: "creative-room-policy",
        title: "REVIEW ROOM POLICY",
        blocks: [
          {
            kind: "p",
            text: "Review Room is where you review finished work, share feedback, and approve deliverables within scope.",
          },
          {
            kind: "p",
            text: "Open Review Room to see the work, leave feedback, approve, or request a revision.",
          },
          {
            kind: "p",
            text: "Requests that substantially change the approved scope may require a new order or additional work.",
          },
        ] as const,
      },
    ] as const satisfies readonly PolicyItem[],
  },

  routes: {
    creativeRoom: "/review-room",
    campaignHistory: studioBoard.routes.campaignDetails,
  },
} as const;
