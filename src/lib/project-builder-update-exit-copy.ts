import { getServiceById } from "@/catalog/accessors";
import type { RouteMapJob, RouteMapRoadId } from "@/config/route-map-v1";
import type { RouteMapLaunchServiceId, RouteMapV2ShelfServiceId, ServiceId } from "@/catalog/types";

/** RTU SKUs that show update-specific language on the Update Exit only. */
export const UPDATE_EXIT_RTU_SERVICE_IDS = [
  "v2-rtu-flyer",
  "v2-rtu-menu",
  "v2-rtu-service-sheet",
  "v2-rtu-social-posts",
  "v2-rtu-promotion-graphics",
] as const satisfies readonly RouteMapV2ShelfServiceId[];

export type UpdateExitRtuServiceId = (typeof UPDATE_EXIT_RTU_SERVICE_IDS)[number];

/** Every service on the Update Exit that receives route-specific update doctrine copy. */
export const UPDATE_EXIT_PRESENTATION_SERVICE_IDS = [
  ...UPDATE_EXIT_RTU_SERVICE_IDS,
  "rm-j007",
  "rm-j008",
] as const satisfies readonly (RouteMapV2ShelfServiceId | RouteMapLaunchServiceId)[];

export type UpdateExitPresentationServiceId = (typeof UPDATE_EXIT_PRESENTATION_SERVICE_IDS)[number];

const UPDATE_EXIT_RTU_SET = new Set<string>(UPDATE_EXIT_RTU_SERVICE_IDS);
const UPDATE_EXIT_PRESENTATION_SET = new Set<string>(UPDATE_EXIT_PRESENTATION_SERVICE_IDS);

type UpdateExitCopy = {
  name: string;
  cardPurpose: string;
  tagline: string;
  drawerPurpose: string;
  deliverables: readonly string[];
  exclusions: readonly string[];
  clientResponsibilities: readonly string[];
};

const UPDATE_EXIT_COPY: Record<UpdateExitPresentationServiceId, UpdateExitCopy> = {
  "v2-rtu-flyer": {
    name: "Update My Flyer",
    cardPurpose:
      "Update one existing single-sided flyer using customer-supplied replacement wording, pricing, dates, contact information, logos, or approved images.",
    tagline:
      "Businesses with an existing flyer that needs current information, branding, or promotional details refreshed.",
    drawerPurpose:
      "Update one existing single-sided flyer using customer-supplied replacement wording, pricing, dates, contact information, logos, or approved images while preserving the existing design direction.",
    deliverables: [
      "Update one existing single-sided flyer",
      "Replace customer-supplied wording, pricing, dates, contact information, logo, or approved images",
      "Minor layout adjustments needed to maintain a clean design",
      "One agreed size",
      "Print-ready PDF",
      "Digital PNG or JPG for sharing",
      "Studio quality-control review before delivery",
    ],
    exclusions: [
      "New flyer concept",
      "Complete redesign",
      "Double-sided conversion",
      "Additional flyer versions",
      "Multiple sizes",
      "New custom illustrations",
      "Original photography",
      "Editable source files",
      "Printing or shipping",
      "Distribution or posting",
      "More than one revision round",
    ],
    clientResponsibilities: [
      "The existing flyer or editable source file if available",
      "Replacement wording, pricing, dates, or contact information",
      "Any new logo or approved images",
      "Final approval before delivery",
    ],
  },
  "v2-rtu-menu": {
    name: "Update My Menu",
    cardPurpose:
      "Update one existing single-page menu using customer-supplied item, price, wording, logo, or approved image changes within the current structure.",
    tagline:
      "Businesses with an existing single-page menu that needs current items, prices, or promotional details refreshed.",
    drawerPurpose:
      "Update one existing single-page menu using customer-supplied item, price, wording, logo, or approved image changes while preserving the existing menu structure and design direction.",
    deliverables: [
      "Update one existing single-page menu",
      "Replace customer-supplied items, prices, wording, logo, or approved images within the current structure",
      "Minor layout adjustments needed to maintain a clean design",
      "One agreed size",
      "Print-ready PDF",
      "Digital PNG or JPG for sharing",
      "Studio quality-control review before delivery",
    ],
    exclusions: [
      "New menu concept",
      "Complete redesign or structural rebuild",
      "Additional menu pages or versions",
      "Multiple sizes",
      "Expanding beyond the current item limit",
      "New custom illustrations",
      "Original photography",
      "Editable source files",
      "Printing or shipping",
      "Distribution or posting",
      "More than one revision round",
    ],
    clientResponsibilities: [
      "The existing menu or editable source file if available",
      "Replacement items, prices, wording, or contact information",
      "Any new logo or approved images",
      "Final approval before delivery",
    ],
  },
  "v2-rtu-service-sheet": {
    name: "Update My Service Sheet",
    cardPurpose:
      "Update one existing service sheet using customer-supplied service, price, wording, contact, logo, or approved image changes within the current structure.",
    tagline:
      "Businesses with an existing service sheet that needs current services, prices, or contact details refreshed.",
    drawerPurpose:
      "Update one existing service sheet using customer-supplied service, price, wording, contact, logo, or approved image changes while preserving the existing structure and design direction.",
    deliverables: [
      "Update one existing single-page service sheet",
      "Replace customer-supplied services, prices, wording, contact information, logo, or approved images within the current structure",
      "Minor layout adjustments needed to maintain a clean design",
      "One agreed size",
      "Print-ready PDF",
      "Digital PNG or JPG for sharing",
      "Studio quality-control review before delivery",
    ],
    exclusions: [
      "New service sheet concept",
      "Complete redesign or structural rebuild",
      "Additional pages or versions",
      "Multiple sizes",
      "Expanding beyond the current service limit",
      "New custom illustrations",
      "Original photography",
      "Editable source files",
      "Printing or shipping",
      "Distribution or posting",
      "More than one revision round",
    ],
    clientResponsibilities: [
      "The existing service sheet or editable source file if available",
      "Replacement services, prices, wording, or contact information",
      "Any new logo or approved images",
      "Final approval before delivery",
    ],
  },
  "v2-rtu-social-posts": {
    name: "Update My Social Media Posts",
    cardPurpose:
      "Update up to four existing coordinated static posts for one platform using customer-supplied replacement wording or approved assets.",
    tagline:
      "Businesses with up to four existing social post graphics on one platform that need current wording or visuals refreshed.",
    drawerPurpose:
      "Update up to four existing coordinated static posts for one platform using customer-supplied replacement wording or approved assets while preserving the existing post design direction.",
    deliverables: [
      "Update up to four existing coordinated static posts for one platform",
      "Replace customer-supplied wording or approved assets within the current post set",
      "Minor layout adjustments needed to maintain a clean design",
      "Export updated files ready for you to upload",
      "Studio quality-control review before delivery",
    ],
    exclusions: [
      "New post concept or campaign direction",
      "Creating new posts from scratch",
      "Additional posts beyond the existing set",
      "Multiple platforms",
      "Substantial new copywriting",
      "New custom illustrations or original photography",
      "Editable source files",
      "Scheduling, posting, or account management",
      "More than one revision round",
    ],
    clientResponsibilities: [
      "The existing post graphics or editable source files if available",
      "Replacement wording or approved assets for each post being updated",
      "The platform these posts belong to",
      "Final approval before delivery",
    ],
  },
  "v2-rtu-promotion-graphics": {
    name: "Update My Campaign Graphics",
    cardPurpose:
      "Update two existing coordinated campaign graphics using customer-supplied replacement wording, dates, prices, or approved assets.",
    tagline:
      "Businesses with two existing coordinated campaign graphics that need current promotional details refreshed.",
    drawerPurpose:
      "Update two existing coordinated campaign graphics using customer-supplied replacement wording, dates, prices, or approved assets while preserving the existing design direction.",
    deliverables: [
      "Update two existing coordinated campaign graphics for one campaign theme",
      "Replace customer-supplied wording, dates, prices, or approved assets within the current graphics",
      "Minor layout adjustments needed to maintain a clean design",
      "One agreed format per graphic",
      "Export updated files ready to print or share",
      "Studio quality-control review before delivery",
    ],
    exclusions: [
      "New campaign concept or design direction",
      "Complete redesign or rebuilding from scratch",
      "Additional graphics beyond the existing pair",
      "Multiple sizes or versions",
      "New custom illustrations or original photography",
      "Editable source files",
      "Printing, shipping, or distribution",
      "More than one revision round",
    ],
    clientResponsibilities: [
      "The existing campaign graphics or editable source files if available",
      "Replacement wording, dates, prices, or approved assets",
      "Final approval before delivery",
    ],
  },
  "rm-j007": {
    name: "Update My Existing Promotion",
    cardPurpose:
      "Update one existing promotional item using customer-supplied replacement dates, prices, contact information, wording, or one approved image.",
    tagline:
      "Businesses with one existing promotional item — a flyer, post, graphic, or page — that needs current details refreshed.",
    drawerPurpose:
      "Update one existing promotional item using customer-supplied replacement dates, prices, contact information, wording, or one approved image while preserving the existing design direction.",
    deliverables: [
      "Update one named existing promotional item",
      "Replace customer-supplied dates, prices, contact information, wording, or one approved image",
      "Minor layout adjustments needed to maintain a clean design",
      "Export the corrected final file",
      "Studio quality-control review before delivery",
    ],
    exclusions: [
      "New concept or campaign direction",
      "Complete redesign or structural rebuild",
      "Changing the type of promotional item",
      "Additional deliverables or versions",
      "Substantial new copywriting",
      "New custom artwork or original photography",
      "Platform management, posting, or ongoing account work",
      "Multiple items in one job",
      "More than one revision round",
    ],
    clientResponsibilities: [
      "Link or file for the existing promotional item",
      "Exact replacement dates, prices, contact information, wording, or one image you supply",
      "Platform access only if republishing is required for the named item",
      "Final approval before any republish",
    ],
  },
  "rm-j008": {
    name: "Update My Facebook, Instagram, or TikTok",
    cardPurpose:
      "Refresh one existing social or business profile with current bio information, links, and customer-supplied brand visuals.",
    tagline:
      "Businesses with an existing Facebook, Instagram, or TikTok profile that needs current business information and supplied brand visuals refreshed.",
    drawerPurpose:
      "Refresh one existing social or business profile with current bio information, links, and customer-supplied brand visuals while preserving the existing profile structure.",
    deliverables: [
      "Update one existing profile on one platform",
      "Refresh bio, business information, and profile links with customer-supplied details",
      "Place, crop, or resize customer-supplied profile and banner images",
      "Align the profile with the customer's current offer or branding",
      "Studio quality-control review before delivery",
    ],
    exclusions: [
      "New account setup",
      "Account recovery or login troubleshooting",
      "Original social media content creation",
      "Custom logo, banner, or profile-image design",
      "Posting or scheduling content",
      "Ongoing profile or community management",
      "More than one platform",
      "Advertising setup or campaign management",
      "More than one revision round",
    ],
    clientResponsibilities: [
      "Platform login access for the existing profile you control",
      "Updated business information and customer-supplied profile and banner images",
      "Final approval before changes go live",
    ],
  },
};

export function isUpdateExitRtuService(serviceId: string): serviceId is UpdateExitRtuServiceId {
  return UPDATE_EXIT_RTU_SET.has(serviceId);
}

export function isUpdateExitPresentationService(
  serviceId: string,
): serviceId is UpdateExitPresentationServiceId {
  return UPDATE_EXIT_PRESENTATION_SET.has(serviceId);
}

export function appliesUpdateExitPresentation(
  roadId: RouteMapRoadId | undefined,
  serviceId: string,
): boolean {
  return roadId === "update" && isUpdateExitPresentationService(serviceId);
}

export function resolveUpdateExitServiceName(serviceId: ServiceId): string | undefined {
  if (!isUpdateExitPresentationService(serviceId)) return undefined;
  return UPDATE_EXIT_COPY[serviceId].name;
}

export function resolveRouteMapServiceDisplayName(
  serviceId: ServiceId,
  roadId?: RouteMapRoadId,
): string {
  const updateName = roadId === "update" ? resolveUpdateExitServiceName(serviceId) : undefined;
  if (updateName) return updateName;
  const service = getServiceById(serviceId);
  return service?.name ?? serviceId;
}

export type ProjectBuilderJobPresentation = {
  name: string;
  purpose: string;
  tagline: string;
  drawerPurpose: string;
  deliverables: readonly string[];
  exclusions: readonly string[];
  clientResponsibilities: readonly string[];
};

function resolveUpdateExitCopy(serviceId: UpdateExitPresentationServiceId): UpdateExitCopy {
  return UPDATE_EXIT_COPY[serviceId];
}

export function resolveUpdateExitScopeSnapshot(serviceId: ServiceId): {
  serviceName: string;
  deliverables: readonly string[];
  exclusions: readonly string[];
  clientResponsibilities: readonly string[];
} | null {
  if (!isUpdateExitPresentationService(serviceId)) return null;
  const copy = resolveUpdateExitCopy(serviceId);
  return {
    serviceName: copy.name,
    deliverables: copy.deliverables,
    exclusions: copy.exclusions,
    clientResponsibilities: copy.clientResponsibilities,
  };
}

export function resolveUpdateExitClientResponsibilities(serviceId: ServiceId): readonly string[] | null {
  if (!isUpdateExitPresentationService(serviceId)) return null;
  return resolveUpdateExitCopy(serviceId).clientResponsibilities;
}

export function resolveProjectBuilderJobPresentation(
  job: RouteMapJob,
  roadId: RouteMapRoadId,
): ProjectBuilderJobPresentation {
  if (!appliesUpdateExitPresentation(roadId, job.id)) {
    return {
      name: job.name,
      purpose: job.purpose,
      tagline: "",
      drawerPurpose: job.purpose,
      deliverables: job.deliverables,
      exclusions: job.exclusions,
      clientResponsibilities: job.clientResponsibilities,
    };
  }

  const copy = resolveUpdateExitCopy(job.id as UpdateExitPresentationServiceId);
  return {
    name: copy.name,
    purpose: copy.cardPurpose,
    tagline: copy.tagline,
    drawerPurpose: copy.drawerPurpose,
    deliverables: copy.deliverables,
    exclusions: copy.exclusions,
    clientResponsibilities: copy.clientResponsibilities,
  };
}
