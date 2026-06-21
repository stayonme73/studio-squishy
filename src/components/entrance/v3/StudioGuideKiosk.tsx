"use client";

import { welcomeHallV3 } from "@/config/welcome-hall-v3-direction";

type Props = {
  onTap: () => void;
  active: boolean;
};

export default function StudioGuideKiosk({ onTap, active }: Props) {
  return (
    <div className="showroom-kiosk" aria-label="Studio Guide kiosk">
      <div className="showroom-kiosk-body" aria-hidden />
      <button
        type="button"
        className="showroom-kiosk-screen"
        onClick={onTap}
        aria-label={welcomeHallV3.kiosk.screenLabel}
      >
        <span className="showroom-kiosk-screen-icon" aria-hidden>
          👆
        </span>
        <span className="showroom-kiosk-screen-label">{welcomeHallV3.kiosk.screenLabel}</span>
      </button>
      <p className="showroom-kiosk-panel-label" aria-hidden>
        {welcomeHallV3.kiosk.panelLabel}
      </p>
      {!active && (
        <span className="showroom-kiosk-screen-hint" aria-hidden>
          Explore the tower first
        </span>
      )}
    </div>
  );
}
