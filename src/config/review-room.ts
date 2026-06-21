/** Review Room V1 — mock concept options for customer selection. */

export const reviewRoom = {
  pageTitle: "Review Campaigns",
  eyebrow: "Review Room",
  backLabel: "Back to Studio Board",
  intro:
    "Your Studio team prepared three campaign directions. Review each option and choose the one that fits best.",
  selectCta: "Choose this direction",
  selectedBadge: "Selected direction",
  notReady: {
    title: "Not ready for review yet",
    body: "Your campaign concepts will appear here when the Studio finishes building them.",
  },
  noCampaign: {
    title: "No campaign yet",
    body: "Start a campaign from the Draft Room to review concepts here.",
    cta: "Go to Studio Board",
  },
  options: [
    {
      id: "A",
      title: "Campaign Concept A",
      tagline: "Warm & welcoming",
      description:
        "A friendly, community-focused approach that highlights your story and invites customers in with heart.",
    },
    {
      id: "B",
      title: "Campaign Concept B",
      tagline: "Bold & bright",
      description:
        "High-energy visuals and clear calls to action designed to grab attention and drive immediate response.",
    },
    {
      id: "C",
      title: "Campaign Concept C",
      tagline: "Clean & premium",
      description:
        "A refined, polished look that positions your brand as elevated and trustworthy.",
    },
  ],
} as const;

export type ReviewRoomOptionId = (typeof reviewRoom.options)[number]["id"];
