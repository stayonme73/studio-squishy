/** Final Delivery V1 — copy, assets, and mock deliverable templates. */

export const deliverables = {
  pageTitle: "Final Delivery",
  eyebrow: "Your Campaign",
  pageSubtitle: "Your marketing campaign is complete and ready for you to use.",
  backLabel: "Back to Studio Board",
  userName: "Tagia",

  assets: {
    sidebarArt: "/deliverables/deliverables-sidebar-v1.png?v=1",
  },

  routes: {
    studioBoard: "/studio-board",
    campaignDetails: "/studio-board?record=open",
    reviewRoom: "/review-room",
    deliverables: "/deliverables",
    draftRoom: "/draft-room?package=momentum",
  },

  sidebar: {
    brandThe: "the",
    brandName: "STUDIO",
    brandBy: "BY SPARK",
    nav: {
      studioBoard: "Studio Board",
      campaignDetails: "Campaign Details",
      reviewCampaigns: "Review Campaigns",
      finalDelivery: "Final Delivery",
    },
    quote: "Good marketing isn't luck. It's strategy.",
    quoteAttribution: "— THE STUDIO",
  },

  summary: {
    badge: "Campaign Complete",
    labels: {
      campaignName: "Campaign Name",
      selectedOption: "Selected Option",
      completionDate: "Completion Date",
      status: "Campaign Status",
    },
    statusDelivered: "DELIVERED",
    thankYou:
      "Thank you for trusting The Studio with your marketing. We can't wait to see your business grow!",
  },

  hero: {
    badge: "Campaign Complete",
    title: "Your marketing package is ready.",
    lead: "Everything has been prepared and organized for you.",
    footnote: "The Studio is standing by when you're ready for your next campaign.",
  },

  /** Margin walls — left writes downward; right is a static Studio letter. */
  marginNotes: {
    encouragement: [
      { id: "enc-1", text: "Great work!", doodle: "star", inset: true },
      { id: "enc-2", text: "You made it to the finish line.", doodle: "bulb", inset: false },
      { id: "enc-3", text: "Your package is ready to go.", doodle: "arrow", inset: true },
      { id: "enc-4", text: "Go tell your story.", doodle: "spark", inset: false },
      { id: "enc-5", text: "One post at a time.", doodle: "star", inset: true },
      { id: "enc-6", text: "Big ideas start small.", doodle: "trend", inset: false },
      { id: "enc-7", text: "We believe in this campaign.", doodle: "bulb", inset: true },
      { id: "enc-8", text: "The hard part is done.", doodle: "rocket", inset: false },
      { id: "enc-9", text: "Come back anytime.", doodle: "arrow", inset: true },
    ] as const,
    studioLetter: {
      paragraphs: [
        { id: "letter-1", text: "Thank you for trusting us.", ink: "black" },
        {
          id: "letter-2",
          text: "We appreciate the opportunity to work on your campaign.",
          ink: "black",
        },
        { id: "letter-3", text: "Your package is ready to launch.", ink: "denim" },
        { id: "letter-4", text: "We'd love to hear how it performs.", ink: "black" },
        {
          id: "letter-5",
          text: "When you're ready, come back and build the next one.",
          ink: "denim",
        },
        { id: "letter-6", text: "The Studio is standing by.", ink: "black" },
      ] as const,
      signoff: "— The Studio Team",
    },
  },

  sections: {
    heading: "Your Deliverables",
    subheading: "Everything you need to market your campaign with confidence.",
    copyLabel: "Copy",
    copySuccess: "Copied!",
    downloadLabel: "Download .txt",
    downloadAllLabel: "Download All",
  },

  categories: {
    social: {
      title: "Social Media Content",
      downloadTitle: "All Social Posts (Text Only)",
      filename: "social-posts.txt",
    },
    email: {
      title: "Email Campaign",
      downloadTitle: "All Email Copy (Text Only)",
      filename: "email-campaign.txt",
    },
    sms: {
      title: "SMS Campaign",
      downloadTitle: "All SMS Copy (Text Only)",
      filename: "sms-campaign.txt",
    },
    video: {
      title: "Video Scripts",
      downloadTitle: "All Video Scripts (Text Only)",
      filename: "video-scripts.txt",
    },
    calendar: {
      title: "Marketing Calendar",
      downloadTitle: "Marketing Calendar",
      filename: "marketing-calendar.txt",
    },
  },

  footer: {
    message: "You did the vision. We built the strategy. Now go make it happen.",
    startNewCampaign: "START NEW CAMPAIGN",
    returnToBoard: "RETURN TO STUDIO BOARD",
  },

  empty: {
    preparing: "The Studio team is preparing your final deliverables.",
    preparingHint: "Check back soon — you'll be notified when your package is ready.",
    noCampaign: "Start a campaign to receive deliverables from The Studio.",
    cta: "Go to Studio Board",
  },
} as const;

export type DeliverableSocialPost = { id: string; label: string; caption: string };

export type DeliverableEmail = {
  id: string;
  label: string;
  subject: string;
  preview: string;
};

export type DeliverableSms = { id: string; label: string; message: string };

export type DeliverableVideoScript = {
  id: string;
  label: string;
  hook: string;
  cta: string;
};

export type DeliverableCalendarWeek = {
  id: string;
  label: string;
  items: readonly string[];
};

export type CampaignDeliverablesPackage = {
  socialPosts: DeliverableSocialPost[];
  emails: DeliverableEmail[];
  smsMessages: DeliverableSms[];
  videoScripts: DeliverableVideoScript[];
  calendar: DeliverableCalendarWeek[];
};

/** Phase 1 mock package — captions/subjects/scripts only (no image prompts). */
export function buildDeliverablesPackage(campaignName: string): CampaignDeliverablesPackage {
  const name = campaignName.trim() || "your campaign";

  return {
    socialPosts: [
      {
        id: "post-1",
        label: "POST 1",
        caption: `Something special is here!\n\nOur ${name} is now live and ready for customers.\n\nTap the link in bio to learn more.`,
      },
      {
        id: "post-2",
        label: "POST 2",
        caption: `Ready for something new? ${name} brings fresh energy to your feed. Share with someone who needs to see this! 💛`,
      },
      {
        id: "post-3",
        label: "POST 3",
        caption: `Don't miss out — ${name} won't last forever. Visit us today and see what everyone's talking about! 🎉`,
      },
    ],
    emails: [
      {
        id: "email-1",
        label: "EMAIL 1",
        subject: `Introducing ${name} ✨`,
        preview: `We're thrilled to share ${name} with you. Inside you'll find everything you need to get started...`,
      },
      {
        id: "email-2",
        label: "EMAIL 2",
        subject: "Don't miss this — limited time offer inside",
        preview: `Your exclusive access to ${name} is waiting. Click below to claim your spot before it's gone.`,
      },
      {
        id: "email-3",
        label: "EMAIL 3",
        subject: "Last chance — we're wrapping up soon",
        preview: `This is your final reminder about ${name}. We'd love to see you before we close the doors on this offer.`,
      },
    ],
    smsMessages: [
      {
        id: "sms-1",
        label: "SMS 1",
        message: `✨ ${name} is here! Tap to explore: [Your Link]`,
      },
      {
        id: "sms-2",
        label: "SMS 2",
        message: `Don't miss out — limited spots for ${name}. [Your Link]`,
      },
      {
        id: "sms-3",
        label: "SMS 3",
        message: `Last call! ${name} ends soon. Grab yours: [Your Link]`,
      },
    ],
    videoScripts: [
      {
        id: "video-1",
        label: "VIDEO SCRIPT 1",
        hook: `"What if I told you ${name} could change everything?"`,
        cta: `"Visit us today — link in bio."`,
      },
      {
        id: "video-2",
        label: "VIDEO SCRIPT 2",
        hook: `"Everyone's talking about ${name} — here's why."`,
        cta: `"Tap the link and see for yourself."`,
      },
    ],
    calendar: [
      {
        id: "week-1",
        label: "WEEK 1",
        items: ["2 Social Posts", "1 Email", "1 SMS"],
      },
      {
        id: "week-2",
        label: "WEEK 2",
        items: ["1 Social Post", "1 Email", "1 SMS", "1 Video"],
      },
      {
        id: "week-3",
        label: "WEEK 3",
        items: ["1 Social Post", "1 Email", "1 SMS"],
      },
      {
        id: "ongoing",
        label: "ONGOING",
        items: ["Monitor engagement", "Adjust as needed", "Celebrate wins! 🎉"],
      },
    ],
  };
}
