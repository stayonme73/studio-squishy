/**
 * Customer Journey V1 — locked customer-facing names and routes.
 * Internal module/folder names (e.g. business-discovery-studio) may differ.
 * @see docs/customer-journey-v1-locked.md
 */

export type CustomerJourneyStep = {
  order: number;
  id: string;
  name: string;
  formerName?: string;
  route: string;
  routeAliases?: readonly string[];
};

export const customerJourneyV1 = {
  steps: [
    {
      order: 1,
      id: "studio-lobby",
      name: "Studio Lobby",
      formerName: "Welcome Hall",
      route: "/",
      routeAliases: ["/studio-lobby", "/welcome-hall"] as const,
    },
    {
      order: 2,
      id: "studio-guide",
      name: "Studio Guide",
      route: "/studio-guide-prototype",
    },
    {
      order: 3,
      id: "secure-checkout",
      name: "Secure Checkout",
      formerName: "Payment",
      route: "/payment",
    },
    {
      order: 4,
      id: "project-discovery",
      name: "Project Discovery",
      formerName: "Discovery Room",
      route: "/business-discovery-studio",
      routeAliases: ["/project-discovery", "/business_discovery_studio"] as const,
    },
    {
      order: 5,
      id: "studio-board",
      name: "Studio Board",
      route: "/studio-board",
    },
    {
      order: 6,
      id: "project-record",
      name: "Project Record",
      formerName: "Campaign Record",
      route: "/studio-board?record=open",
    },
    {
      order: 7,
      id: "review-room",
      name: "Review Room",
      route: "/review-room",
    },
    {
      order: 8,
      id: "final-delivery",
      name: "Final Delivery",
      route: "/deliverables",
    },
    {
      order: 9,
      id: "help-center",
      name: "Help Center",
      route: "/help-center",
    },
  ] satisfies readonly CustomerJourneyStep[],

  /** Removed from active flow — preserved under src/archive/ */
  archivedFlows: [
    {
      id: "complete-your-order",
      name: "Complete Your Order",
      note: "Three-column payment page — customer-facing name is now Secure Checkout",
    },
    {
      id: "tell-us-whats-on-your-mind",
      name: "Tell us what's on your mind",
      note: "Standalone intake opening — opening copy lives in Project Discovery",
    },
    {
      id: "draft-room-begin",
      name: "Draft Room begin page",
      note: "Standalone intake at /draft-room?begin=1 — archived; opening in Project Discovery",
    },
  ] as const,

  /** Dev-only — hidden when NODE_ENV !== development (@see OwnerQaRoot) */
  devOnlyTools: [{ id: "studio-review", name: "Studio Review", component: "OwnerQaPanel" }] as const,
} as const;

export type CustomerJourneyStepId = (typeof customerJourneyV1.steps)[number]["id"];

const stepNameById = Object.fromEntries(
  customerJourneyV1.steps.map((step) => [step.id, step.name]),
) as Record<CustomerJourneyStepId, string>;

/** Locked customer-facing label for a journey step. */
export function customerJourneyStepName(id: CustomerJourneyStepId): string {
  return stepNameById[id];
}

/** Route for a locked journey step. */
export function customerJourneyStepRoute(id: CustomerJourneyStepId): string {
  const step = customerJourneyV1.steps.find((item) => item.id === id);
  return step?.route ?? "/";
}

const PACKAGE_IDS = ["spark", "momentum", "growth"] as const;

/** Project Discovery href — optional package query preserved for journey handoff. */
export function projectDiscoveryHref(packageId?: string): string {
  const base = customerJourneyStepRoute("project-discovery");
  if (!packageId || !PACKAGE_IDS.includes(packageId as (typeof PACKAGE_IDS)[number])) {
    return base;
  }
  return `${base}?package=${packageId}`;
}
