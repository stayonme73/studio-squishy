/**
 * Studio Service Catalog — authoritative service definitions.
 * V1 Studio Services per locked spec; legacy packages retained as retired for reference.
 * Do not duplicate this data in UI components or page configs.
 */

import type {
  DiscoveryMappingRule,
  ServiceCategoryId,
  ServiceClass,
  ServiceId,
  StudioServiceEntry,
} from "@/catalog/types";
import { CATALOG_SCHEMA_VERSION } from "@/catalog/types";
import { validateServiceCatalog } from "@/catalog/validate";

function withDiscoverySync(
  mapping: readonly DiscoveryMappingRule[],
): Pick<StudioServiceEntry, "discoveryMapping" | "discoveryTriggers"> {
  return { discoveryMapping: mapping, discoveryTriggers: mapping };
}

type V1ServiceSeed = {
  id: ServiceId;
  name: string;
  category: ServiceCategoryId;
  serviceClass: ServiceClass;
  customerReceives?: string;
  internalProductionNotes?: string;
};

function v1Service(seed: V1ServiceSeed): StudioServiceEntry {
  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: seed.id,
    name: seed.name,
    category: seed.category,
    serviceClass: seed.serviceClass,
    customerReceives: seed.customerReceives,
    internalProductionNotes: seed.internalProductionNotes,
    dependencies: [],
    canSubstitute: true,
    addOnEligible: true,
    upgradeEligible: true,
    deliveryFormats: [],
    minimumCustomerRequirements: [],
    recommendedCustomerRequirements: [],
    serviceStatus: "active",
    status: "active",
    discoveryTriggers: [],
    discoveryMapping: [],
    deliverables: [],
  };
}

const V1_SERVICES: readonly StudioServiceEntry[] = [
  v1Service({
    id: "bf-001",
    name: "Brand Identity Refresh",
    category: "brand-foundation",
    serviceClass: "signature",
  }),
  v1Service({
    id: "bf-002",
    name: "Brand Messaging",
    category: "brand-foundation",
    serviceClass: "signature",
  }),
  v1Service({
    id: "cp-001",
    name: "Marketing Campaign",
    category: "campaign-services",
    serviceClass: "signature",
  }),
  v1Service({
    id: "sm-001",
    name: "Social Media Marketing",
    category: "social-media",
    serviceClass: "signature",
  }),
  v1Service({
    id: "em-001",
    name: "Email Marketing",
    category: "email-marketing",
    serviceClass: "core",
  }),
  v1Service({
    id: "sms-001",
    name: "SMS Marketing",
    category: "sms-marketing",
    serviceClass: "core",
  }),
  v1Service({
    id: "cc-001",
    name: "Marketing Copywriting",
    category: "content-copywriting",
    serviceClass: "signature",
  }),
  v1Service({
    id: "cc-002",
    name: "Content Writing",
    category: "content-copywriting",
    serviceClass: "core",
  }),
  v1Service({
    id: "vp-001",
    name: "Marketing Video Production",
    category: "video-production",
    serviceClass: "signature",
  }),
  v1Service({
    id: "ap-001",
    name: "AI Voice Over Production",
    category: "audio-production",
    serviceClass: "core",
  }),
  v1Service({
    id: "lp-001",
    name: "Landing Pages & Web Content",
    category: "landing-pages-web-content",
    serviceClass: "signature",
    customerReceives:
      "Landing page copy and web content for marketing campaigns — not full website development, hosting, or ongoing site management.",
    internalProductionNotes:
      "LP-001 does not include website hosting, full website development, maintenance, DNS, or platform management.",
  }),
  v1Service({
    id: "mo-001",
    name: "Marketing Optimization",
    category: "marketing-optimization",
    serviceClass: "core",
  }),
  v1Service({
    id: "ma-001",
    name: "Marketing Assets",
    category: "marketing-assets",
    serviceClass: "essential",
    customerReceives:
      "Examples include brochures, flyers, rack cards, menus, business cards, posters, presentation materials, and similar finished marketing assets.",
  }),
];

const LEGACY_RETIRED_SERVICES: readonly StudioServiceEntry[] = [
  {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: "spark",
    name: "SPARK",
    category: "campaign-services",
    customerProblemSolved:
      "One-time campaign package for testing a promotion, product, event, or offer before investing in a larger marketing system.",
    customerReceives:
      "Campaign concepts, social posts, emails, SMS messages, marketing calendar, and video scripts.",
    serviceClass: "essential",
    dependencies: [],
    includedRevisionRounds: 1,
    canSubstitute: false,
    addOnEligible: false,
    upgradeEligible: true,
    deliveryFormats: [
      "campaign-package",
      "social-posts",
      "email-sequence",
      "sms-messages",
      "marketing-calendar",
      "video-scripts",
    ],
    minimumCustomerRequirements: ["Clear offer or promotion to market"],
    recommendedCustomerRequirements: [
      "Brand basics established",
      "Approved channels for email and SMS",
    ],
    internalProductionNotes: "1 revision round included. Full refund before work begins.",
    serviceStatus: "retired",
    customerDescription:
      "One-time campaign package for testing a promotion, product, event, or offer before investing in a larger marketing system.",
    internalDescription:
      "Entry package — full campaign asset set with minimal revision scope. Primary funnel for first-time customers.",
    deliverables: [
      { id: "concepts", label: "Campaign Concepts", quantity: 3, quotaId: "concepts" },
      { id: "social", label: "Social Media Posts", quantity: 3, quotaId: "social" },
      { id: "emails", label: "Marketing Emails", quantity: 3, quotaId: "emails" },
      { id: "sms", label: "SMS Messages", quantity: 3, quotaId: "sms" },
      { id: "calendar", label: "Marketing Calendar", quantity: 1, quotaId: "calendar" },
      { id: "video", label: "Video Scripts", quantity: 1, quotaId: "video" },
    ],
    pricing: { display: "$299", amountUsd: 299, billing: "one-time" },
    estimatedProductionTime: {
      customerLabel: "First concepts delivered within 7 business days",
      businessDays: 7,
    },
    productionEffort: { tier: "medium", hoursEstimate: 12 },
    ...withDiscoverySync([
      { signal: "need", value: "get-more-customers", weight: 2 },
      { signal: "situation", value: "Starting fresh", weight: 2 },
      { signal: "challenge", value: "Lack of clarity or direction", weight: 1 },
      { signal: "focus-keyword", value: "test", tileId: "your-focus", weight: 2 },
      { signal: "focus-keyword", value: "first campaign", tileId: "your-focus", weight: 2 },
    ]),
    productionNotes: "1 revision round included. Full refund before work begins.",
    status: "inactive",
  },
  {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: "momentum",
    name: "MOMENTUM",
    category: "campaign-services",
    customerProblemSolved:
      "Monthly marketing support for businesses that want consistent visibility and regular content creation.",
    customerReceives:
      "Monthly campaign concepts, expanded social, email, and SMS quotas, calendar, and video scripts.",
    serviceClass: "core",
    dependencies: [],
    includedRevisionRounds: 1,
    canSubstitute: false,
    addOnEligible: false,
    upgradeEligible: true,
    deliveryFormats: [
      "campaign-package",
      "social-posts",
      "email-sequence",
      "sms-messages",
      "marketing-calendar",
      "video-scripts",
    ],
    minimumCustomerRequirements: ["Active marketing channels"],
    recommendedCustomerRequirements: [
      "Content approval workflow in place",
      "Monthly campaign theme or focus",
    ],
    internalProductionNotes: "1 revision round per monthly cycle. Refund before monthly work begins.",
    serviceStatus: "retired",
    customerDescription:
      "Monthly marketing support for businesses that want consistent visibility and regular content creation.",
    internalDescription:
      "Recurring revenue package — monthly deliverable quotas, same production SLA as SPARK per cycle.",
    deliverables: [
      { id: "concepts", label: "Campaign Concepts", quantity: 3, quotaId: "concepts" },
      { id: "social", label: "Social Media Posts", quantity: 6, quotaId: "social" },
      { id: "emails", label: "Marketing Emails", quantity: 6, quotaId: "emails" },
      { id: "sms", label: "SMS Messages", quantity: 6, quotaId: "sms" },
      { id: "calendar", label: "Marketing Calendar", quantity: 1, quotaId: "calendar" },
      { id: "video", label: "Video Scripts", quantity: 2, quotaId: "video" },
    ],
    pricing: { display: "$499 per month", amountUsd: 499, billing: "monthly" },
    estimatedProductionTime: {
      customerLabel: "First concepts delivered within 7 business days",
      businessDays: 7,
    },
    productionEffort: { tier: "high", hoursEstimate: 20 },
    ...withDiscoverySync([
      { signal: "need", value: "create-content", weight: 2 },
      { signal: "need", value: "improve-communication", weight: 1 },
      { signal: "situation", value: "Growing an existing business", weight: 2 },
      { signal: "challenge", value: "Marketing and visibility", weight: 2 },
      { signal: "focus-keyword", value: "consistent", tileId: "your-focus", weight: 2 },
      { signal: "focus-keyword", value: "monthly", tileId: "your-focus", weight: 2 },
    ]),
    productionNotes: "1 revision round per monthly cycle. Refund before monthly work begins.",
    status: "inactive",
  },
  {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: "growth",
    name: "GROWTH",
    category: "campaign-services",
    customerProblemSolved:
      "Done-with-you partnership for businesses ready to build a complete marketing system instead of one-off campaigns.",
    customerReceives:
      "Highest deliverable quotas, quarterly strategy session, priority production queue, and expanded revision scope.",
    serviceClass: "signature",
    dependencies: [],
    includedRevisionRounds: 3,
    canSubstitute: false,
    addOnEligible: false,
    upgradeEligible: false,
    deliveryFormats: [
      "campaign-package",
      "social-posts",
      "email-sequence",
      "sms-messages",
      "marketing-calendar",
      "video-scripts",
      "strategy-session",
    ],
    minimumCustomerRequirements: ["Established business with growth goals"],
    recommendedCustomerRequirements: [
      "Dedicated point of contact for approvals",
      "Multi-channel marketing footprint",
    ],
    internalProductionNotes:
      "3 revision rounds included. Quarterly strategy session scheduled by ops.",
    serviceStatus: "retired",
    customerDescription:
      "Done-with-you partnership for businesses ready to build a complete marketing system instead of one-off campaigns.",
    internalDescription:
      "Premium tier — highest quotas, strategy session, priority queue, 3 revision rounds.",
    deliverables: [
      { id: "concepts", label: "Campaign Concepts", quantity: 3, quotaId: "concepts" },
      { id: "social", label: "Social Media Posts", quantity: 10, quotaId: "social" },
      { id: "emails", label: "Marketing Emails", quantity: 10, quotaId: "emails" },
      { id: "sms", label: "SMS Messages", quantity: 10, quotaId: "sms" },
      { id: "calendar", label: "Marketing Calendar", quantity: 1, quotaId: "calendar" },
      { id: "video", label: "Video Scripts", quantity: 3, quotaId: "video" },
      { id: "strategy-session", label: "Quarterly Strategy Session", quantity: 1 },
      { id: "priority-queue", label: "Priority Production Queue", quantity: 1 },
    ],
    pricing: { display: "$799 per month", amountUsd: 799, billing: "monthly" },
    estimatedProductionTime: {
      customerLabel: "First concepts delivered within 7 business days",
      businessDays: 7,
    },
    productionEffort: { tier: "high", hoursEstimate: 32 },
    ...withDiscoverySync([
      { signal: "need", value: "better-business-systems", weight: 2 },
      { signal: "need", value: "workflow-improvements", weight: 2 },
      { signal: "situation", value: "Scaling operations", weight: 2 },
      { signal: "challenge", value: "Operations and efficiency", weight: 1 },
      { signal: "challenge", value: "Team and hiring", weight: 1 },
      { signal: "focus-keyword", value: "scale", tileId: "your-focus", weight: 2 },
      { signal: "focus-keyword", value: "system", tileId: "your-focus", weight: 2 },
    ]),
    productionNotes: "3 revision rounds included. Quarterly strategy session scheduled by ops.",
    status: "inactive",
  },
  {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: "email-marketing",
    name: "Email Marketing",
    category: "email-marketing",
    customerProblemSolved: "Expanded email campaign copy beyond your base package.",
    customerReceives: "Additional email campaign copy aligned to base package timeline.",
    serviceClass: "essential",
    dependencies: ["spark"],
    includedRevisionRounds: 1,
    canSubstitute: false,
    addOnEligible: true,
    upgradeEligible: false,
    deliveryFormats: ["email-sequence"],
    minimumCustomerRequirements: ["Active SPARK or compatible base package"],
    recommendedCustomerRequirements: ["Email platform access for deployment"],
    internalProductionNotes: "Price TBD — placeholder until payment integration reads catalog.",
    serviceStatus: "retired",
    customerDescription: "Expanded email campaign copy beyond your base package.",
    internalDescription: "Add-on — promotes email-campaign deliverable when customer opts in.",
    deliverables: [{ id: "email-campaign", label: "Email Campaign", quantity: 1 }],
    pricing: { display: "Quoted at checkout", amountUsd: 0, billing: "one-time" },
    estimatedProductionTime: {
      customerLabel: "Added to base package timeline",
      businessDays: 2,
    },
    productionEffort: { tier: "low", hoursEstimate: 3 },
    ...withDiscoverySync([
      { signal: "need", value: "improve-communication", weight: 2 },
      { signal: "need", value: "better-customer-experience", weight: 1 },
      { signal: "challenge", value: "Marketing and visibility", weight: 1 },
    ]),
    productionNotes: "Price TBD — placeholder until payment integration reads catalog.",
    status: "inactive",
  },
  {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: "sms-campaign",
    name: "SMS Campaign",
    category: "sms-marketing",
    customerProblemSolved: "SMS messaging copy to reach customers on mobile.",
    customerReceives: "SMS messaging copy bundle for mobile outreach.",
    serviceClass: "essential",
    dependencies: ["spark"],
    includedRevisionRounds: 1,
    canSubstitute: false,
    addOnEligible: true,
    upgradeEligible: false,
    deliveryFormats: ["sms-messages"],
    minimumCustomerRequirements: ["Active SPARK or compatible base package", "SMS opt-in compliance"],
    recommendedCustomerRequirements: ["SMS platform or provider configured"],
    serviceStatus: "retired",
    customerDescription: "SMS messaging copy to reach customers on mobile.",
    internalDescription: "Add-on — promotes sms-messaging deliverable when customer opts in.",
    deliverables: [{ id: "sms-messaging", label: "SMS Messaging", quantity: 1 }],
    pricing: { display: "Quoted at checkout", amountUsd: 0, billing: "one-time" },
    estimatedProductionTime: {
      customerLabel: "Added to base package timeline",
      businessDays: 1,
    },
    productionEffort: { tier: "low", hoursEstimate: 2 },
    ...withDiscoverySync([
      { signal: "need", value: "improve-communication", weight: 2 },
      { signal: "need", value: "better-customer-experience", weight: 2 },
    ]),
    status: "inactive",
  },
  {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: "business-workflow",
    name: "Business Workflow",
    category: "planning-strategy",
    customerProblemSolved: "Campaign planning and workflow documentation for your team.",
    customerReceives: "Campaign planning documentation and workflow guidance.",
    serviceClass: "core",
    dependencies: ["momentum"],
    includedRevisionRounds: 1,
    canSubstitute: false,
    addOnEligible: true,
    upgradeEligible: false,
    deliveryFormats: ["workflow-documentation"],
    minimumCustomerRequirements: ["Active MOMENTUM or compatible recurring package"],
    recommendedCustomerRequirements: ["Internal team roles defined for campaign execution"],
    serviceStatus: "retired",
    customerDescription: "Campaign planning and workflow documentation for your team.",
    internalDescription: "Add-on — promotes campaign-planning deliverable.",
    deliverables: [{ id: "campaign-planning", label: "Campaign Planning", quantity: 1 }],
    pricing: { display: "Quoted at checkout", amountUsd: 0, billing: "one-time" },
    estimatedProductionTime: {
      customerLabel: "Added to base package timeline",
      businessDays: 3,
    },
    productionEffort: { tier: "medium", hoursEstimate: 5 },
    ...withDiscoverySync([
      { signal: "need", value: "better-business-systems", weight: 2 },
      { signal: "need", value: "workflow-improvements", weight: 3 },
      { signal: "challenge", value: "Operations and efficiency", weight: 2 },
    ]),
    status: "inactive",
  },
  {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: "customer-follow-up",
    name: "Customer Follow-Up",
    category: "campaign-services",
    customerProblemSolved: "Follow-up messaging sequences to nurture leads and customers.",
    customerReceives: "Cross-channel follow-up email and SMS copy sequences.",
    serviceClass: "core",
    dependencies: ["spark"],
    includedRevisionRounds: 1,
    canSubstitute: false,
    addOnEligible: true,
    upgradeEligible: false,
    deliveryFormats: ["follow-up-sequence", "email-sequence", "sms-messages"],
    minimumCustomerRequirements: ["Active SPARK or compatible base package"],
    recommendedCustomerRequirements: ["Lead capture or CRM workflow in place"],
    serviceStatus: "retired",
    customerDescription: "Follow-up messaging sequences to nurture leads and customers.",
    internalDescription: "Add-on — cross-channel follow-up copy bundle.",
    deliverables: [
      { id: "email-campaign", label: "Follow-Up Emails", quantity: 3 },
      { id: "sms-messaging", label: "Follow-Up SMS", quantity: 3 },
    ],
    pricing: { display: "Quoted at checkout", amountUsd: 0, billing: "one-time" },
    estimatedProductionTime: {
      customerLabel: "Added to base package timeline",
      businessDays: 3,
    },
    productionEffort: { tier: "medium", hoursEstimate: 6 },
    ...withDiscoverySync([
      { signal: "need", value: "better-customer-experience", weight: 3 },
      { signal: "challenge", value: "Marketing and visibility", weight: 1 },
    ]),
    status: "inactive",
  },
  {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    id: "monthly-support",
    name: "Monthly Support",
    category: "add-on-services",
    customerProblemSolved: "Ongoing Studio support beyond a one-time campaign.",
    customerReceives: "Ongoing marketing calendar and monthly production alignment.",
    serviceClass: "core",
    dependencies: ["spark"],
    includedRevisionRounds: 1,
    canSubstitute: ["momentum"],
    addOnEligible: true,
    upgradeEligible: true,
    deliveryFormats: ["marketing-calendar", "campaign-package"],
    minimumCustomerRequirements: ["Completed or active SPARK campaign"],
    recommendedCustomerRequirements: ["Interest in recurring monthly marketing"],
    internalProductionNotes: "Bridge add-on — signals upgrade path toward MOMENTUM.",
    serviceStatus: "retired",
    customerDescription: "Ongoing Studio support beyond a one-time campaign.",
    internalDescription: "Bridge add-on — signals upgrade path toward MOMENTUM.",
    deliverables: [{ id: "marketing-calendar", label: "Marketing Calendar", quantity: 1 }],
    pricing: { display: "Quoted at checkout", amountUsd: 0, billing: "monthly" },
    estimatedProductionTime: {
      customerLabel: "Ongoing — aligned with monthly cycle",
      businessDays: 7,
    },
    productionEffort: { tier: "medium", hoursEstimate: 8 },
    ...withDiscoverySync([
      { signal: "situation", value: "Growing an existing business", weight: 2 },
      { signal: "focus-keyword", value: "ongoing", tileId: "your-focus", weight: 2 },
      { signal: "focus-keyword", value: "support", tileId: "your-focus", weight: 1 },
    ]),
    status: "inactive",
  },
] as const;

export const SERVICE_CATALOG: readonly StudioServiceEntry[] = [
  ...V1_SERVICES,
  ...LEGACY_RETIRED_SERVICES,
] as const;

validateServiceCatalog(SERVICE_CATALOG);
