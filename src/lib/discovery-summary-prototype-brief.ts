import type { DiscoveryBrief } from "@/recommendation";

/**
 * Representative discovery brief for the Discovery Summary prototype route.
 * Lives at the page/data boundary — not used by presentational components.
 */
export const prototypeDiscoveryBrief: DiscoveryBrief = {
  answers: {
    "your-business": "Acme Coffee Co.",
    "your-situation": "Starting fresh",
    "your-challenge": "Lack of clarity or direction",
    "your-focus": "test our first campaign",
    "success-looks-like": "A clear launch plan and assets we can run this month.",
  },
  selectedNeeds: ["get-more-customers"],
};
