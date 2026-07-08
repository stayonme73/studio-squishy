/** Studio policies & FAQ — single source for Help Center (and contextual links elsewhere). */

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
        text: "The Studio creates ready-to-use marketing materials for businesses, organizations, professionals, and entrepreneurs. Choose only the services you need, complete your Project Details, and we'll build the deliverables you selected.",
      },
      {
        kind: "p",
        text: "Your path through The Studio: Route Map → Secure Checkout → Project Details → Studio Board → Review Room → Final Delivery.",
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
          "Status updates on your Studio Board and Project Record",
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
        { kind: "p", text: "The Studio recommends individual services based on what you need." },
        { kind: "p", text: "You choose what to purchase, share Project Details, and review finished work in Review Room." },
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
        question: "CAN I ORDER MORE THAN ONE SERVICE?",
        blocks: [
          {
            kind: "p",
            text: "Yes. Multiple services can become one project when appropriate.",
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
            text: "After Secure Checkout, complete Project Details so The Studio knows what to create and which materials are required.",
          },
          {
            kind: "p",
            text: "Your path through The Studio: Route Map → Secure Checkout → Project Details → Studio Board → Review Room → Final Delivery.",
          },
          {
            kind: "p",
            text: "Monitor progress on your Studio Board and Project Record. Status updates appear as your project moves forward.",
          },
        ] as const,
      },
      {
        id: "campaign-timeline",
        question: "HOW LONG DOES MY PROJECT TAKE?",
        blocks: [
          {
            kind: "p",
            text: "Estimated production timelines are shown on your Project Record and Studio Board.",
          },
          {
            kind: "p",
            text: "Delivery depends on the services you selected, project complexity, and receipt of required client materials.",
          },
          {
            kind: "p",
            text: "Timelines pause while a job is Waiting on Client for required information or materials.",
          },
        ] as const,
      },
      {
        id: "email-notifications",
        question: "WILL I RECEIVE EMAIL UPDATES?",
        blocks: [
          {
            kind: "p",
            text: "In this version of The Studio, project progress is shown inside your Studio Board — not through automated email notifications.",
          },
          {
            kind: "p",
            text: "After payment and Project Details, return to your Studio Board for status updates, open Review Room when work is ready, and collect approved files in Final Delivery when your project is complete.",
          },
          {
            kind: "p",
            text: "If you received an email or link from a test or external tool, use it only as a reminder to sign in. Your official next step is always shown on the Studio Board.",
          },
        ] as const,
      },
      {
        id: "payments-refund-eligibility",
        question: "WHEN CAN I REQUEST A REFUND?",
        blocks: [
          {
            kind: "p",
            text: "Payment is required before work can proceed, but paying alone does not start production on any job.",
          },
          {
            kind: "p",
            text: "Refund eligibility is determined per job. If production has not started on that job and the requirements of the Refund Policy are met, a refund may be approved.",
          },
          {
            kind: "p",
            text: "Once production has started on a job, payment for that job becomes non-refundable.",
          },
          {
            kind: "p",
            text: "See the Refund Policy below for Waiting on Client and the 14-calendar-day rule.",
          },
        ] as const,
      },
      {
        id: "change-mind-after-intake",
        question: "WHAT IF I CHANGE MY MIND AFTER SUBMITTING PROJECT DETAILS?",
        blocks: [
          {
            kind: "p",
            text: "Your project is created using the information you provide in Project Details and any required materials.",
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
            text: "Included revisions depend on the service you purchased — not on a fixed package tier.",
          },
          {
            kind: "p",
            text: "Your Project Record shows the revision policy details for each job, including revisions included, used, and remaining where applicable.",
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
            text: "Use the Review Room to annotate, approve, or request revisions directly on your project.",
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
            text: "Production is tracked per job. Paying through Secure Checkout reserves your selected services but does not, by itself, start creative production on any job.",
          },
          {
            kind: "p",
            text: "Submitting Project Details does not begin production on any job.",
          },
        ] as const,
      },
      {
        id: "production-policy",
        title: "PRODUCTION POLICY",
        blocks: [
          {
            kind: "p",
            text: "Production is tracked per job — not per customer account. Other jobs in your project can continue independently while one job is paused.",
          },
          {
            kind: "p",
            text: "Production begins on a job only when all four conditions are true for that job:",
          },
          {
            kind: "ul",
            items: [
              "Payment has been received.",
              "Project Details for that job are complete.",
              "Required materials for that job have been reviewed and accepted.",
              "The job has been moved into production.",
            ] as const,
          },
          {
            kind: "p",
            text: "Only then does payment for that job become non-refundable.",
          },
          {
            kind: "p",
            text: "Missing required information or materials pauses production on that job only.",
          },
          {
            kind: "p",
            text: "Timeline estimates depend on required client materials being submitted, reviewed, and accepted, and on timely client responses during Review Room.",
          },
        ] as const,
      },
      {
        id: "missing-materials-policy",
        title: "MISSING MATERIALS POLICY",
        blocks: [
          {
            kind: "p",
            text: "Some services require client materials before production can begin. Your Project Record shows what is required and what is still missing.",
          },
          {
            kind: "p",
            text: "If required materials are still missing, The Studio sends a reminder after 48 hours.",
          },
          {
            kind: "p",
            text: "If required materials are still missing after 72 hours, the job moves to Waiting on Client. Only that job pauses — your other jobs can continue independently.",
          },
          {
            kind: "p",
            text: "While a job is Waiting on Client, its timeline pauses until the required information or materials are received.",
          },
        ] as const,
      },
      {
        id: "waiting-on-client-policy",
        title: "WAITING ON CLIENT POLICY",
        blocks: [
          {
            kind: "p",
            text: "The Studio cannot continue a job without the required information, materials, or approvals from you.",
          },
          {
            kind: "p",
            text: "When a job is Waiting on Client, production on that job pauses and its timeline pauses with it.",
          },
          {
            kind: "p",
            text: "Returning the required information or materials allows that job to re-enter the production queue.",
          },
          {
            kind: "p",
            text: "If there is no client response for 14 calendar days while a job is Waiting on Client and production has not started on that job, a full refund may be eligible. See the Refund Policy.",
          },
        ] as const,
      },
      {
        id: "timeline-policy",
        title: "TIMELINE POLICY",
        blocks: [
          {
            kind: "p",
            text: "Estimated production timelines are shown on your Project Record and Studio Board.",
          },
          {
            kind: "p",
            text: "Delivery depends on the services you selected, project complexity, and receipt of required client materials.",
          },
          {
            kind: "p",
            text: "Timelines may shift when required client materials, feedback, or approvals are delayed.",
          },
          {
            kind: "p",
            text: "A job in Waiting on Client does not advance until the required response is received.",
          },
        ] as const,
      },
      {
        id: "revision-policy",
        title: "REVISION POLICY",
        blocks: [
          {
            kind: "p",
            text: "Included revisions depend on the service you purchased. Your Project Record shows what is included for each job.",
          },
          {
            kind: "p",
            text: "A revision adjusts work already created within the scope of your selected service.",
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
            text: "Refund eligibility is determined per job.",
          },
          {
            kind: "p",
            text: "If production has not started on that job and the requirements of this policy are met, a refund may be approved.",
          },
          {
            kind: "p",
            text: "Once production has started on a job, payment for that job becomes non-refundable.",
          },
          {
            kind: "p",
            text: "If you become unresponsive while required information or materials are missing, the job may move to Waiting on Client. After 14 calendar days without the required response, a full refund may be eligible if production has not started on that job.",
          },
          {
            kind: "p",
            text: "Paying or submitting Project Details alone does not start production on any job and does not remove refund eligibility by itself.",
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
            text: "You receive the approved client-facing deliverables for each completed job.",
          },
        ] as const,
      },
      {
        id: "vision-responsibility-policy",
        title: "PROJECT RESPONSIBILITY POLICY",
        blocks: [
          {
            kind: "p",
            text: "Deliverables are created using the information you submit in Project Details, required materials, and approved feedback in Review Room.",
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
            text: "Use the Review Room to annotate, approve, or request revisions directly on your project.",
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
    campaignHistory: "/studio-board?record=open",
  },
} as const;
