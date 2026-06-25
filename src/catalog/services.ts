/**
 * Studio Service Catalog — authoritative service definitions.
 * Source: studio-guide-v1-lock (packages), studio-services (add-ons / needs mapping).
 * Do not duplicate this data in UI components or page configs.
 */

import type { ServiceCatalogEntry } from "@/catalog/types";
import { validateServiceCatalog } from "@/catalog/validate";

export const SERVICE_CATALOG: readonly ServiceCatalogEntry[] = [
  {
    id: "spark",
    name: "SPARK",
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
    dependencies: [],
    discoveryMapping: [
      { signal: "need", value: "get-more-customers", weight: 2 },
      { signal: "situation", value: "Starting fresh", weight: 2 },
      { signal: "challenge", value: "Lack of clarity or direction", weight: 1 },
      { signal: "focus-keyword", value: "test", tileId: "your-focus", weight: 2 },
      { signal: "focus-keyword", value: "first campaign", tileId: "your-focus", weight: 2 },
    ],
    productionNotes: "1 revision round included. Full refund before work begins.",
    status: "active",
  },
  {
    id: "momentum",
    name: "MOMENTUM",
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
    dependencies: [],
    discoveryMapping: [
      { signal: "need", value: "create-content", weight: 2 },
      { signal: "need", value: "improve-communication", weight: 1 },
      { signal: "situation", value: "Growing an existing business", weight: 2 },
      { signal: "challenge", value: "Marketing and visibility", weight: 2 },
      { signal: "focus-keyword", value: "consistent", tileId: "your-focus", weight: 2 },
      { signal: "focus-keyword", value: "monthly", tileId: "your-focus", weight: 2 },
    ],
    productionNotes: "1 revision round per monthly cycle. Refund before monthly work begins.",
    status: "active",
  },
  {
    id: "growth",
    name: "GROWTH",
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
    dependencies: [],
    discoveryMapping: [
      { signal: "need", value: "better-business-systems", weight: 2 },
      { signal: "need", value: "workflow-improvements", weight: 2 },
      { signal: "situation", value: "Scaling operations", weight: 2 },
      { signal: "challenge", value: "Operations and efficiency", weight: 1 },
      { signal: "challenge", value: "Team and hiring", weight: 1 },
      { signal: "focus-keyword", value: "scale", tileId: "your-focus", weight: 2 },
      { signal: "focus-keyword", value: "system", tileId: "your-focus", weight: 2 },
    ],
    productionNotes: "3 revision rounds included. Quarterly strategy session scheduled by ops.",
    status: "active",
  },
  {
    id: "email-marketing",
    name: "Email Marketing",
    customerDescription: "Expanded email campaign copy beyond your base package.",
    internalDescription: "Add-on — promotes email-campaign deliverable when customer opts in.",
    deliverables: [{ id: "email-campaign", label: "Email Campaign", quantity: 1 }],
    pricing: { display: "Quoted at checkout", amountUsd: 0, billing: "one-time" },
    estimatedProductionTime: {
      customerLabel: "Added to base package timeline",
      businessDays: 2,
    },
    productionEffort: { tier: "low", hoursEstimate: 3 },
    dependencies: ["spark"],
    discoveryMapping: [
      { signal: "need", value: "improve-communication", weight: 2 },
      { signal: "need", value: "better-customer-experience", weight: 1 },
      { signal: "challenge", value: "Marketing and visibility", weight: 1 },
    ],
    productionNotes: "Price TBD — placeholder until payment integration reads catalog.",
    status: "inactive",
  },
  {
    id: "sms-campaign",
    name: "SMS Campaign",
    customerDescription: "SMS messaging copy to reach customers on mobile.",
    internalDescription: "Add-on — promotes sms-messaging deliverable when customer opts in.",
    deliverables: [{ id: "sms-messaging", label: "SMS Messaging", quantity: 1 }],
    pricing: { display: "Quoted at checkout", amountUsd: 0, billing: "one-time" },
    estimatedProductionTime: {
      customerLabel: "Added to base package timeline",
      businessDays: 1,
    },
    productionEffort: { tier: "low", hoursEstimate: 2 },
    dependencies: ["spark"],
    discoveryMapping: [
      { signal: "need", value: "improve-communication", weight: 2 },
      { signal: "need", value: "better-customer-experience", weight: 2 },
    ],
    status: "inactive",
  },
  {
    id: "business-workflow",
    name: "Business Workflow",
    customerDescription: "Campaign planning and workflow documentation for your team.",
    internalDescription: "Add-on — promotes campaign-planning deliverable.",
    deliverables: [{ id: "campaign-planning", label: "Campaign Planning", quantity: 1 }],
    pricing: { display: "Quoted at checkout", amountUsd: 0, billing: "one-time" },
    estimatedProductionTime: {
      customerLabel: "Added to base package timeline",
      businessDays: 3,
    },
    productionEffort: { tier: "medium", hoursEstimate: 5 },
    dependencies: ["momentum"],
    discoveryMapping: [
      { signal: "need", value: "better-business-systems", weight: 2 },
      { signal: "need", value: "workflow-improvements", weight: 3 },
      { signal: "challenge", value: "Operations and efficiency", weight: 2 },
    ],
    status: "inactive",
  },
  {
    id: "customer-follow-up",
    name: "Customer Follow-Up",
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
    dependencies: ["spark"],
    discoveryMapping: [
      { signal: "need", value: "better-customer-experience", weight: 3 },
      { signal: "challenge", value: "Marketing and visibility", weight: 1 },
    ],
    status: "inactive",
  },
  {
    id: "monthly-support",
    name: "Monthly Support",
    customerDescription: "Ongoing Studio support beyond a one-time campaign.",
    internalDescription: "Bridge add-on — signals upgrade path toward MOMENTUM.",
    deliverables: [{ id: "marketing-calendar", label: "Marketing Calendar", quantity: 1 }],
    pricing: { display: "Quoted at checkout", amountUsd: 0, billing: "monthly" },
    estimatedProductionTime: {
      customerLabel: "Ongoing — aligned with monthly cycle",
      businessDays: 7,
    },
    productionEffort: { tier: "medium", hoursEstimate: 8 },
    dependencies: ["spark"],
    discoveryMapping: [
      { signal: "situation", value: "Growing an existing business", weight: 2 },
      { signal: "focus-keyword", value: "ongoing", tileId: "your-focus", weight: 2 },
      { signal: "focus-keyword", value: "support", tileId: "your-focus", weight: 1 },
    ],
    status: "inactive",
  },
] as const;

validateServiceCatalog(SERVICE_CATALOG);
