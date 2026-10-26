"use client";

import { useState, type ReactNode } from "react";

import styles from "@/components/studio-conversation-room/guide/conversation-activity-panel.module.css";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { studioTileClass } from "@/config/studio-customer-tile-system-v1";
import {
  getJobsForRoad,
  getRouteMapRoad,
  getSelectableRouteMapRoads,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import SamsungDeckBack from "@/components/studio-conversation-room/guide/SamsungDeckBack";
import { useSamsungActivate } from "@/lib/studio-samsung-activate";

export type ConversationRouteChooseProps = {
  /** Highlights a pending choice — does not commit the route. */
  onPreviewRoad: (roadId: RouteMapRoadId) => void;
  /** Customer confirmation — commits the pending route and continues. */
  onConfirmRoad: (roadId: RouteMapRoadId) => void;
  /** Panel variant shows Close; tablet embeds without it. */
  onClose?: () => void;
  compact?: boolean;
  /** Pending / highlighted lane (customer has not confirmed yet). */
  previewRoadId?: RouteMapRoadId | null;
  /** Keyword-matched suggested starting road from opening answers — visual mark only. */
  recommendedRoadId?: RouteMapRoadId | null;
  /** Voice On / Off — rendered at the top of the Mobile order. */
  topControls?: ReactNode;
  onDeckBack?: () => void;
  deckBackLabel?: string | null;
};

function roadTagline(roadId: RouteMapRoadId, fallback: string): string {
  if (roadId === "random-exit") {
    return conversationRoomGuideV1.routeDirectTagline;
  }
  return fallback;
}

/**
 * Choose Your Route — map + lane cards on the tablet.
 * All four routes stay in one grid; "Suggested starting point" is sage text on the card.
 * Keyword routing may suggest a start; the customer confirms before the service chooser opens.
 */
export default function ConversationRouteChoose({
  onPreviewRoad,
  onConfirmRoad,
  onClose,
  compact = false,
  previewRoadId = null,
  recommendedRoadId = null,
  topControls = null,
  onDeckBack,
  deckBackLabel = null,
}: ConversationRouteChooseProps) {
  const v = conversationRoomGuideV1;
  const roads = getSelectableRouteMapRoads();
  const pendingId = previewRoadId ?? recommendedRoadId;
  const [includesRoadId, setIncludesRoadId] = useState<RouteMapRoadId | null>(
    null,
  );
  const includesJobs = includesRoadId ? getJobsForRoad(includesRoadId) : [];
  const includesRoad = includesRoadId ? getRouteMapRoad(includesRoadId) : null;
  const pendingRoad = pendingId ? getRouteMapRoad(pendingId) : null;
  const confirmLabel = pendingRoad
    ? `${v.routeConfirmCtaPrefix} ${pendingRoad.customerLabel}`
    : v.routeConfirmCtaFallback;
  const confirmActivate = useSamsungActivate<HTMLAnchorElement>(() => {
    if (pendingId) onConfirmRoad(pendingId);
  });

  const confirmRow = (
    <div className={styles.routeConfirmRow}>
      <a
        ref={confirmActivate.ref}
        href="#studio-route-continue"
        role="button"
        tabIndex={pendingId ? 0 : -1}
        aria-disabled={!pendingId}
        className="lobby-entry-film__cta"
        data-route-continue=""
        onClick={(event) => {
          event.preventDefault();
          confirmActivate.onClick(event);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (pendingId) onConfirmRoad(pendingId);
        }}
      >
        {confirmLabel}
      </a>
    </div>
  );

  const routeNav = (
    <nav className={styles.routeList} aria-label="Choose your route">
      {roads.map((road) => {
        const active = pendingId === road.id;
        const recommended = recommendedRoadId === road.id;
        return (
          <div
            key={road.id}
            className={styles.routeLane}
            data-recommended={recommended ? "true" : "false"}
            data-road={road.id}
          >
            <div
              className={`${styles.routeExpand} ${
                active ? studioTileClass.selectedActive : studioTileClass.standardLight
              }`}
              data-expanded={active ? "true" : "false"}
              data-recommended={recommended ? "true" : "false"}
            >
              <SamsungRouteCard
                className={styles.routeCard}
                pressed={active}
                label={`${road.customerLabel}. Select this route.`}
                onActivate={() => onPreviewRoad(road.id)}
              >
                <span className={styles.routeBody}>
                  {recommended ? (
                    <span className={styles.routeRecommendedBadge}>
                      {v.routeRecommendedBadge}
                    </span>
                  ) : null}
                  <span className={styles.routeLabel}>{road.customerLabel}</span>
                  <span className={styles.routeTagline}>
                    {roadTagline(road.id, road.tagline)}
                  </span>
                </span>
                <span className={styles.routeArrow} aria-hidden>
                  →
                </span>
              </SamsungRouteCard>
              <button
                type="button"
                className={styles.routeIncludesLink}
                data-route-includes-cta="true"
                aria-expanded={includesRoadId === road.id}
                onClick={() => {
                  onPreviewRoad(road.id);
                  setIncludesRoadId((current) =>
                    current === road.id ? null : road.id,
                  );
                }}
              >
                {v.routePeekJobsHeading}
              </button>
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div
      className={styles.sheet}
      data-surface={compact ? "tablet" : "panel"}
    >
      <div data-tablet-journey-chrome="true">
        {onDeckBack && deckBackLabel ? (
          <SamsungDeckBack className={styles.backLink} onActivate={onDeckBack}>
            ← {deckBackLabel}
          </SamsungDeckBack>
        ) : null}
        {topControls}
      </div>
      <header className={styles.header}>
        <div>
          {compact ? null : (
            <p className={styles.eyebrow}>Conversation Room</p>
          )}
          <h2 className={styles.title}>{v.routePanelTitle}</h2>
          <p className={styles.intro}>{v.routePanelLead}</p>
          <p className={styles.routeChoiceNote}>{v.routePanelChoice}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close activity panel"
          >
            Close
          </button>
        ) : null}
      </header>

      <figure className={styles.mapFigure}>
        <img
          src="/route-map/studio-route-map-hero-v2.png"
          alt="Studio route chooser showing a city skyline, highway interchange, and four route options."
          className={styles.mapHeroImg}
        />
      </figure>

      {!compact ? (
        <p className={styles.helpLine}>
          <span className={styles.helpPrompt}>{v.routeHelpPrompt}</span>{" "}
          {v.routeHelpCta}
        </p>
      ) : null}

      {routeNav}

      {includesRoad ? (
        <div className={styles.routeExpandBody} data-route-includes="true">
          <h3 className={styles.routeExpandHeading}>
            {includesRoad.customerLabel}
          </h3>
          <p className={styles.routePeekHint}>{v.routePeekJobsHint}</p>
          {includesJobs.length === 0 ? (
            <p className={styles.routeExpandEmpty}>{v.routePeekEmptyJobs}</p>
          ) : (
            <ul className={styles.routeIncludesList}>
              {includesJobs.map((job) => (
                <li key={job.id}>
                  <span>{job.name}</span>
                  <span>{job.priceDisplay}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {confirmRow}
    </div>
  );
}

function SamsungRouteCard({
  className,
  pressed,
  label,
  onActivate,
  children,
}: {
  className: string;
  pressed: boolean;
  label: string;
  onActivate: () => void;
  children: ReactNode;
}) {
  const activate = useSamsungActivate<HTMLButtonElement>(onActivate);
  return (
    <button
      ref={activate.ref}
      type="button"
      className={className}
      aria-pressed={pressed}
      aria-label={label}
      onClick={activate.onClick}
    >
      {children}
    </button>
  );
}
