import type { RouteMapJob } from "@/config/route-map-v1";

const DRAWER_PURPOSE_BY_JOB_ID: Partial<Record<string, string>> = {
  "v2-rtu-business-card":
    "One double-sided business card design for one person or version — design only, not printing or shipping. Give customers a simple, professional way to remember and contact your business.",
  "v2-rtu-flyer":
    "One single-sided flyer for one clear message, offer, or event — one agreed size, ready to print or share online.",
  "v2-rtu-service-sheet":
    "One page listing up to ten services with brief descriptions you provide — one agreed size, ready to print or share.",
  "v2-rtu-menu":
    "One single-page menu with a defined item limit — your final items and prices, one agreed size, ready to print or share.",
  "v2-rtu-promotion-graphics":
    "Two coordinated static graphics for one campaign, offer, event, or launch — same theme, one agreed format per graphic.",
  "v2-rtu-social-posts":
    "Four coordinated static post graphics for one platform — captions included, ready for you to upload and post yourself.",
  "v2-rtu-voice":
    "One short announcement from your approved script and facts — using customer-provided audio or an approved in-house or licensed Studio voice method. No outside voice talent.",
  "v2-rtu-short-video":
    "One basic 15–30 second video for one campaign focus — built from your usable footage or approved Studio assets, with captions and a clear call to action.",
  "rm-j002":
    "Basic setup for one Facebook, Instagram, or TikTok profile you already control — profile image, bio, links, and cover where applicable. No posting, content management, or ad management.",
  "rm-j005":
    "One functioning responsive page for one sale, event, opening, service, or offer, built with an approved Studio structure and one clear call to action. This is not a full website, online store, or custom application.",
  "rm-j007":
    "Limited update to one existing promotional item using customer-supplied replacement information or assets — not a redesign, new concept, or additional deliverable.",
  "rm-j008":
    "Refresh one existing social or business profile with current bio information, links, and customer-supplied brand visuals.",
};

/** Purpose copy for the Learn More drawer — may differ from the short card line. */
export function resolveProjectBuilderDrawerPurpose(job: RouteMapJob): string {
  return DRAWER_PURPOSE_BY_JOB_ID[job.id] ?? job.purpose;
}

/** Best For sentence for the Learn More drawer header — presentation only. */
export function resolveProjectBuilderDrawerTagline(job: RouteMapJob): string {
  switch (job.intakeType) {
    case "rtu-flyer":
      return "Businesses promoting one clear message, offer, or event.";
    case "rtu-service-sheet":
      return "Businesses that need customers to quickly understand everything they offer.";
    case "rtu-menu":
      return "Businesses listing food items and prices on one easy-to-read page.";
    case "rtu-social-posts":
      return "Businesses ready for ready-to-post graphics on one platform.";
    case "rtu-promotion-graphics":
      return "One campaign or promotion that needs coordinated branded visuals.";
    case "rtu-short-video":
      return "A short 15–30 second video people can watch and share quickly.";
    case "rtu-voice":
      return "One polished voice announcement with a clear message.";
    case "rtu-email-kit":
      return "Finished emails ready for you to send.";
    case "rtu-sms-kit":
      return "Finished text messages ready for you to send.";
    case "rtu-business-card":
      return "Businesses that want a professional way to share contact details.";
    case "page":
      return "One focused responsive page with a single call to action.";
    case "social-setup":
      if (job.id === "rm-j008") {
        return "One existing Facebook, Instagram, or TikTok profile that needs its basic business information and supplied brand visuals refreshed.";
      }
      return "One platform set up with profile details and brand visuals — no ongoing management.";
    case "update":
      return "One existing promotional item that needs supplied details or one image refreshed.";
    default:
      return "When this service matches the goal you're trying to accomplish.";
  }
}
