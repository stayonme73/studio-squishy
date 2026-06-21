import type { TimePeriod } from "@/types/weather-portal";

/**
 * Maps local hour to an atmospheric time period.
 * Environmental only — not a functional clock display.
 */
export function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "afternoon";
  if (hour >= 16 && hour < 19) return "golden";
  if (hour >= 19 && hour < 21) return "dusk";
  return "night";
}

export function getCurrentTimePeriod(): TimePeriod {
  return getTimePeriod(new Date().getHours());
}
