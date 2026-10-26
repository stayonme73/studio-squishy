import type { RouteMapJob } from "@/config/route-map-v1";

const DRAWER_PURPOSE_BY_JOB_ID: Partial<Record<string, string>> = {
  "v2-rtu-business-card":
    "One double-sided digital business card for one person — 1536×1024 both sides. Front and back PNG plus a PDF you can print yourself. This is not a certified 3.5×2 or 300 DPI print file.",
  "v2-rtu-flyer":
    "One single-sided digital flyer for one clear message, offer, or event — one agreed size. Share it online or print it yourself. This is not a certified 300 DPI print file.",
  "v2-rtu-service-sheet":
    "One portrait digital service list — up to ten services you provide. Share it or print it yourself. This is not a certified 300 DPI print file.",
  "v2-rtu-menu":
    "One single-page digital menu — up to 5 sections and 30 items. You supply and verify items, prices, and allergen wording. Share it or print it yourself. This is not a certified 300 DPI print file.",
  "v2-rtu-promotion-graphics":
    "Two coordinated digital campaign graphics for one theme — one square and one portrait. You post or share them. This is not a certified 300 DPI print file.",
  "v2-rtu-social-posts":
    "Four coordinated square static posts (1024×1024) for one theme and one platform, plus one caption per post and a suggested posting order. You post them. Not a carousel, Stories, Reels, portrait, extra sizes, or Studio posting.",
  "v2-rtu-voice":
    "One short announcement from your approved script and facts — using customer-provided audio or an approved in-house or licensed Studio voice method. No outside voice talent.",
  "v2-rtu-short-video":
    "One 15–30 second vertical video (1080×1920) assembled from your still photos with on-screen captions and a CTA. You post it. Not footage editing, voice, music, extra sizes, or Studio posting.",
  "rm-j002":
    "A complete setup kit for one Facebook, Instagram, or TikTok profile — bio/about copy, contact/URL field map, profile and cover assets where applicable, and exact setup instructions you apply. No posting, login-based mutation, or account management.",
  "rm-j005":
    "One functioning responsive page for one sale, event, opening, service, or offer, built with an approved Studio structure and one clear call to action. This is not a full website, online store, or custom application.",
  "rm-j007":
    "Reference-guided update of one existing promotional item: supply the reference plus exact changes; The Studio recreates one updated final with bounded edits — not a redesign and not a pixel-perfect source-file edit.",
  "rm-j008":
    "An update kit for one existing Facebook, Instagram, or TikTok profile — revised copy, updated profile imagery, before→after change sheet, and field-replacement instructions you apply. Not done-for-you login-based profile management.",
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
      return "Up to two marketing emails you paste into your own email platform.";
    case "rtu-sms-kit":
      return "Up to four text messages you paste into your own texting platform.";
    case "rtu-business-card":
      return "Businesses that want a professional way to share contact details.";
    case "page":
      return "One focused responsive page with a single call to action.";
    case "social-setup":
      if (job.id === "rm-j008") {
        return "One existing Facebook, Instagram, or TikTok profile that needs a clear update kit — revised words, imagery, and field-by-field instructions you apply.";
      }
      return "One platform that needs a complete profile setup kit — copy, assets, and instructions you apply yourself.";
    case "update":
      return "One existing promotional item that needs a reference-guided update — exact dates, prices, contact, wording, or one image refreshed.";
    default:
      return "When this service matches the goal you're trying to accomplish.";
  }
}
