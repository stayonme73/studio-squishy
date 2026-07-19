"use client";

import styles from "@/components/studio-conversation-room/guide/conversation-activity-panel.module.css";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import {
  getRouteMapRoad,
  getSelectableRouteMapRoads,
  type RouteMapRoadId,
} from "@/config/route-map-v1";

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
  /** Voice recommendation from opening answers — visual mark only. */
  recommendedRoadId?: RouteMapRoadId | null;
};

function roadTagline(roadId: RouteMapRoadId, fallback: string): string {
  if (roadId === "random-exit") {
    return conversationRoomGuideV1.routeDirectTagline;
  }
  return fallback;
}

/**
 * Choose Your Route — map + lane cards on the tablet.
 * Voice may recommend a route; the customer confirms before Build Your Project opens.
 */
export default function ConversationRouteChoose({
  onPreviewRoad,
  onConfirmRoad,
  onClose,
  compact = false,
  previewRoadId = null,
  recommendedRoadId = null,
}: ConversationRouteChooseProps) {
  const v = conversationRoomGuideV1;
  const roads = getSelectableRouteMapRoads();
  const pendingId = previewRoadId ?? recommendedRoadId;
  const pendingRoad = pendingId ? getRouteMapRoad(pendingId) : null;
  const confirmLabel = pendingRoad
    ? `${v.routeConfirmCtaPrefix} ${pendingRoad.customerLabel}`
    : v.routeConfirmCtaFallback;

  return (
    <div
      className={styles.sheet}
      data-surface={compact ? "tablet" : "panel"}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Studio Guide</p>
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
          alt="Studio Route Map showing a city skyline, highway interchange, and four Studio route options."
          className={styles.mapHeroImg}
        />
      </figure>

      <p className={styles.helpLine}>
        <span className={styles.helpPrompt}>{v.routeHelpPrompt}</span>{" "}
        {v.routeHelpCta}
      </p>

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
              <button
                type="button"
                className={styles.routeCard}
                aria-pressed={active}
                onClick={() => onPreviewRoad(road.id)}
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
              </button>
            </div>
          );
        })}
      </nav>

      <div className={styles.routeConfirmRow}>
        <button
          type="button"
          className={styles.primary}
          disabled={!pendingId}
          onClick={() => {
            if (pendingId) onConfirmRoad(pendingId);
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
