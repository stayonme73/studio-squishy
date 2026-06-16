import Link from "next/link";

import ArtPrism from "@/components/entrance/ArtPrism";
import CorridorWorkspace from "@/components/entrance/CorridorWorkspace";
import EndPortal from "@/components/entrance/EndPortal";
import StudioDepthWall from "@/components/entrance/StudioDepthWall";
import WelcomeWall from "@/components/entrance/WelcomeWall";
import WeatherPortal from "@/components/environment/WeatherPortal";
import { siteConfig } from "@/config/site";

const leftWorkspaces = ["copywriter", "strategy", "campaign-planning"] as const;
const rightWorkspaces = ["quality-review", "video-production", "reserved"] as const;

/**
 * Welcome Hall — IMAGE 1 composition.
 * Left: Welcome Wall · Center: corridor · Right: Studio Depth
 */
export default function WelcomeHallScene() {
  return (
    <div className="welcome-hall-scene">
      <header className="hall-ceiling" aria-hidden>
        <div className="hall-ceiling-surface" />
        <div className="hall-ceiling-strip hall-ceiling-strip--a" />
        <div className="hall-ceiling-strip hall-ceiling-strip--b" />
      </header>

      <div className="hall-main">
        <aside className="hall-wing hall-wing--left">
          <WelcomeWall />
        </aside>

        <div className="hall-corridor">
          <section className="hall-corridor-back" aria-label="End of hall">
            <div className="hall-weather-slot" aria-label="Weather Portal">
              <WeatherPortal shape="tall" sceneOffset={0} />
            </div>
            <div className="hall-end-slot">
              <EndPortal />
              <Link href={siteConfig.routes.studio} className="hall-path-forward">
                Continue into the Studio
                <span aria-hidden> →</span>
              </Link>
            </div>
            <div className="hall-weather-slot" aria-label="Weather Portal">
              <WeatherPortal shape="tall" sceneOffset={2} />
            </div>
          </section>

          <section className="hall-corridor-body" aria-label="Hallway workspaces">
            <div className="hall-corridor-side hall-corridor-side--left">
              {leftWorkspaces.map((id) => (
                <CorridorWorkspace key={id} workspaceId={id} />
              ))}
            </div>

            <div className="hall-corridor-center">
              <ArtPrism />
            </div>

            <div className="hall-corridor-side hall-corridor-side--right">
              {rightWorkspaces.map((id) => (
                <CorridorWorkspace key={id} workspaceId={id} />
              ))}
            </div>
          </section>
        </div>

        <aside className="hall-wing hall-wing--right">
          <StudioDepthWall />
        </aside>
      </div>

      <footer className="hall-floor" aria-hidden>
        <div className="hall-floor-surface" />
        <div className="hall-floor-shine" />
      </footer>
    </div>
  );
}
