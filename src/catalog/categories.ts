/**
 * Studio Service Catalog — Version 1 category definitions.
 * Stable slug IDs are the canonical keys; display names are internal reference only.
 *
 * Customer-facing copy must not reference "Service Catalog" or category slugs directly.
 */

import type { ServiceCategoryId } from "@/catalog/types";

export type ServiceCategoryDefinition = {
  id: ServiceCategoryId;
  /** Internal display label — not customer-facing marketing copy. */
  name: string;
  /** Short internal description of what services in this category cover. */
  description: string;
};

export const SERVICE_CATEGORIES: readonly ServiceCategoryDefinition[] = [
  {
    id: "brand-foundation",
    name: "Brand Foundation",
    description: "Identity, positioning, and core brand assets.",
  },
  {
    id: "campaign-services",
    name: "Campaign Services",
    description: "Packaged campaign production and recurring marketing programs.",
  },
  {
    id: "social-media",
    name: "Social Media",
    description: "Social content, calendars, and channel-specific creative.",
  },
  {
    id: "email-marketing",
    name: "Email Marketing",
    description: "Email campaigns, sequences, and newsletter copy.",
  },
  {
    id: "sms-marketing",
    name: "SMS Marketing",
    description: "SMS campaigns and mobile messaging copy.",
  },
  {
    id: "content-copywriting",
    name: "Content & Copywriting",
    description: "Written content across channels and formats.",
  },
  {
    id: "design-services",
    name: "Design Services",
    description: "Visual design, layouts, and marketing graphics.",
  },
  {
    id: "video-production",
    name: "Video Production",
    description: "Video scripts, storyboards, and produced video assets.",
  },
  {
    id: "audio-production",
    name: "Audio Production",
    description:
      "Voice-over, podcast, and audio assets — includes AI Voice Overs as a delivery format.",
  },
  {
    id: "landing-pages-web-content",
    name: "Landing Pages & Web Content",
    description: "Landing pages, web copy, and on-site marketing content.",
  },
  {
    id: "planning-strategy",
    name: "Planning & Strategy",
    description: "Campaign planning, workflow documentation, and strategic sessions.",
  },
  {
    id: "review-optimization",
    name: "Review & Optimization",
    description: "Performance review, iteration, and optimization passes.",
  },
  {
    id: "marketing-optimization",
    name: "Marketing Optimization",
    description: "Marketing performance review and optimization passes.",
  },
  {
    id: "marketing-assets",
    name: "Marketing Assets",
    description: "Reusable collateral and asset libraries.",
  },
  {
    id: "add-on-services",
    name: "Add-On Services",
    description: "Optional expansions and upgrades to base packages.",
  },
] as const;

const categoryById = new Map<ServiceCategoryId, ServiceCategoryDefinition>(
  SERVICE_CATEGORIES.map((category) => [category.id, category]),
);

export function getServiceCategories(): readonly ServiceCategoryDefinition[] {
  return SERVICE_CATEGORIES;
}

export function getServiceCategoryById(
  id: ServiceCategoryId,
): ServiceCategoryDefinition | undefined {
  return categoryById.get(id);
}

export function isServiceCategoryId(value: string): value is ServiceCategoryId {
  return categoryById.has(value as ServiceCategoryId);
}
