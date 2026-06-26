import Link from "next/link";

import WeatherPortal from "@/components/environment/WeatherPortal";
import { welcomeHallCopy } from "@/config/welcome-hall-copy";
import { siteConfig } from "@/config/site";

/**
 * Welcome Wall — left side of the entrance (IMAGE 1).
 * Display: greeting · weather · availability · spark. Kiosk: guide + CTA.
 */
export default function WelcomeWall() {
  const { welcomeWall } = welcomeHallCopy;
  const tiers = Object.values(welcomeWall.tiers);

  return (
    <aside className="welcome-wall" aria-label="Welcome Wall and Studio Guide">
      <div className="welcome-wall-display">
        <div className="welcome-wall-mural" aria-hidden />
        <div className="welcome-wall-display-inner">
          <p className="welcome-wall-eyebrow">{welcomeHallCopy.hallName}</p>
          <p className="welcome-wall-guide-label">{welcomeWall.guideLabel}</p>
          <h1 className="welcome-wall-greeting">{welcomeWall.greeting}</h1>
          <p className="welcome-wall-tagline">{welcomeWall.tagline}</p>

          <div className="welcome-wall-weather" aria-label="Weather">
            <WeatherPortal shape="wide" sceneOffset={1} className="welcome-wall-weather-portal" />
          </div>

          <div className="welcome-wall-availability">
            <p className="welcome-wall-availability-label">{welcomeWall.workspacesAvailable.label}</p>
            <p className="welcome-wall-availability-count">
              {welcomeWall.workspacesAvailable.count}
              <span className="welcome-wall-availability-sub">
                {welcomeWall.workspacesAvailable.subtext}
              </span>
            </p>
          </div>

          <blockquote className="welcome-wall-spark">
            <p className="welcome-wall-spark-label">{welcomeWall.spark.label}</p>
            <p className="welcome-wall-spark-quote">&ldquo;{welcomeWall.spark.quote}&rdquo;</p>
          </blockquote>
        </div>
        <div className="welcome-wall-display-frame" aria-hidden />
      </div>

      <div className="welcome-wall-kiosk">
        <p className="welcome-wall-kiosk-message">{welcomeWall.kioskMessage}</p>
        <p className="welcome-wall-body">{welcomeWall.whatWeDo}</p>

        <div className="welcome-wall-pricing">
          <p className="welcome-wall-pricing-label">{welcomeWall.pricingLabel}</p>
          <ul className="welcome-wall-tier-row">
            {tiers.map((tier) => (
              <li key={tier.name} className="welcome-wall-tier">
                <span className="welcome-wall-tier-name">{tier.name}</span>
                <span className="welcome-wall-tier-price">{tier.price}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="welcome-wall-board">
          <p className="welcome-wall-board-headline">{welcomeWall.board.headline}</p>
          <p className="welcome-wall-board-prompt">{welcomeWall.board.prompt}</p>
        </div>

        <Link href={siteConfig.routes.studio} className="welcome-wall-cta">
          {welcomeWall.cta}
          <span aria-hidden className="welcome-wall-cta-arrow">
            →
          </span>
        </Link>
      </div>
    </aside>
  );
}
