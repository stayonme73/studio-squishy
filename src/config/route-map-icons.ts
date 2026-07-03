import type { RouteMapIntakeType } from "@/config/route-map-v1";

/** Shared stop icons — map pins and road view tiles use the same glyphs. */
export const ROUTE_MAP_STOP_ICONS: Record<RouteMapIntakeType, string> = {
  discovery: "◎",
  "social-setup": "◉",
  promotion: "▶",
  video: "▷",
  page: "▣",
  voice: "♫",
  update: "↻",
  "rtu-flyer": "▤",
  "rtu-menu": "☰",
  "rtu-service-sheet": "▥",
  "rtu-social-posts": "▶",
  "rtu-promotion-graphics": "◆",
  "rtu-email-kit": "✉",
  "rtu-sms-kit": "☎",
  "rtu-voice": "♫",
  "rtu-short-video": "▷",
};
