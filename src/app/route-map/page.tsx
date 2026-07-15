import { Suspense } from "react";

import RouteMapScene from "@/components/route-map/RouteMapScene";

import "../mobile-route-fixes.css";
import "./route-map.css";

/** Studio Route Map V1 — full-viewport immersive front door (no utility header chrome). */
export default function RouteMapPage() {
  return (
    <main className="route-map-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={<div className="route-map-scene--loading" aria-busy="true" />}
      >
        <RouteMapScene />
      </Suspense>
    </main>
  );
}
