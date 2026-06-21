import { welcomeHallCopy } from "@/config/welcome-hall-copy";

/**
 * End-of-hall portal — dreamscape destination at the back of the corridor.
 */
export default function EndPortal() {
  const { endPortal } = welcomeHallCopy;

  return (
    <div className="end-portal" aria-label={endPortal.label || undefined}>
      {endPortal.viewAhead ? (
        <p className="end-portal-title">{endPortal.viewAhead}</p>
      ) : null}
      <div className="end-portal-reveal">
        <div className="end-portal-scene">
          <div className="end-portal-layer end-portal-sky" />
          <div className="end-portal-layer end-portal-sun" />
          <div className="end-portal-layer end-portal-mountains" />
          <div className="end-portal-layer end-portal-city" />
          <div className="end-portal-layer end-portal-haze" />
        </div>
        <div className="end-portal-glass" />
      </div>
      <div className="end-portal-frame" />
      <div className="end-portal-edge-light" aria-hidden />
    </div>
  );
}
