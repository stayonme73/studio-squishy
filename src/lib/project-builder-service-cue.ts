import type { RouteMapIntakeType } from "@/config/route-map-v1";

/** Presentation-only scan cue — tiny identity for each service card. */
const PROJECT_BUILDER_SERVICE_CUES: Partial<Record<RouteMapIntakeType, string>> = {
  "rtu-flyer": "📄",
  "rtu-menu": "🍽",
  "rtu-service-sheet": "📋",
  "rtu-social-posts": "📣",
  "rtu-promotion-graphics": "🎨",
  "rtu-email-kit": "✉",
  "rtu-sms-kit": "💬",
  "rtu-voice": "🎤",
  "rtu-short-video": "🎬",
  "rtu-business-card": "💼",
  page: "🌐",
  "social-setup": "📱",
  promotion: "🎯",
  video: "🎬",
  voice: "🎤",
  update: "↻",
  discovery: "◎",
};

export function resolveProjectBuilderServiceCue(intakeType: RouteMapIntakeType): string {
  return PROJECT_BUILDER_SERVICE_CUES[intakeType] ?? "✦";
}
