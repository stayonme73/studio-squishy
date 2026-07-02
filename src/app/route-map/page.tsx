import RouteMapScene from "@/components/route-map/RouteMapScene";

import "../studio-utility-backdrop.css";
import "../utility-design-system.css";
import "./route-map.css";

/** Studio Route Map V1 — interactive front door (lane → road → job → payment → intake). */
export default function RouteMapPage() {
  return (
    <main className="flex min-h-[100dvh] flex-1 flex-col">
      <RouteMapScene />
    </main>
  );
}
