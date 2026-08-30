"use client";

import type { ReactNode } from "react";

import styles from "@/components/studio-conversation-room/guide/conversation-activity-panel.module.css";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import {
  getRouteMapRoad,
  getSelectableRouteMapRoads,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
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
};

function roadTagline(roadId: RouteMapRoadId, fallback: string): string {
  if (roadId === "random-exit") {
    return conversationRoomGuideV1.routeDirectTagline;
  }
  return fallback;
}

/**
 * Choose Your Route — map + lane cards on the tablet.
 * All four routes stay in one grid; "Suggested starting point" is a badge on the card.
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
}: ConversationRouteChooseProps) {
  const v = conversationRoomGuideV1;
  const roads = getSelectableRouteMapRoads();
  const pendingId = previewRoadId ?? recommendedRoadId;
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
        role="button"
        tabIndex={pendingId ? 0 : -1}
        aria-disabled={!pendingId}
        className="lobby-entry-film__cta"
        data-route-continue=""
        onClick={(event) => {
          event.preventDefault();
          if (pendingId) onConfirmRoad(pendingId);
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
            className={styles.routeExpand}
            data-expanded={active ? "true" : "false"}
            data-recommended={recommended ? "true" : "false"}
            data-road={road.id}
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
      {topControls}
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Conversation Room</p>
          <h2 className={styles.title}>{v.routePanelTitle}</h2>
          <p className={styles.intro}>{v.routePanelLead}</p>
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
