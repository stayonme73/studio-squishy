"use client";

import { useEffect, useState } from "react";

import { getCurrentTimePeriod } from "@/lib/weather/time-period";
import type { TimePeriod, WeatherPortalProps } from "@/types/weather-portal";

/**
 * Layered weather portal — cutout opening with outdoor scene, effects, and frame.
 * Follows the Squishy StudyWindowPortal pattern: environmental, not functional.
 */
export default function WeatherPortal({
  shape = "wide",
  sceneOffset = 0,
  className = "",
}: WeatherPortalProps) {
  const [period, setPeriod] = useState<TimePeriod>("morning");

  useEffect(() => {
    setPeriod(getCurrentTimePeriod());

    const interval = window.setInterval(() => {
      setPeriod(getCurrentTimePeriod());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className={`weather-portal weather-portal--${shape} weather-portal--offset-${sceneOffset} ${className}`.trim()}
      aria-hidden
    >
      <div className="weather-portal-reveal">
        <div className={`weather-portal-outdoor weather-portal-outdoor--${period}`}>
          <div className="weather-portal-layer weather-portal-sky" />
          <div className="weather-portal-layer weather-portal-clouds" />
          <div className="weather-portal-layer weather-portal-light-source" />
          <div className="weather-portal-layer weather-portal-treetops" />
          <div className="weather-portal-layer weather-portal-ground" />
        </div>

        <div className={`weather-portal-effects weather-portal-effects--${period}`}>
          <div className="weather-portal-layer weather-portal-atmosphere" />
        </div>

        <div className="weather-portal-glass" />
      </div>

      <div className="weather-portal-frame" />
      {shape === "tall" && <div className="weather-portal-ledge" />}
    </div>
  );
}
