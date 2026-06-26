"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type TransitionEvent,
} from "react";
import { useRouter } from "next/navigation";

import {
  DISCOVERY_FORM_TILE_IDS,
  DISCOVERY_REQUIRED_TILE_IDS,
  DISCOVERY_TILE_ORDER,
  businessDiscoveryStudio,
  discoveryTileConfig,
  plateRectToOverlayPercent,
  type DiscoveryTileId,
} from "@/config/business-discovery-studio";
import { isDiscoveryTileAnswerComplete } from "@/lib/business-discovery-completion";
import {
  readDiscoveryAnswers,
  saveDiscoveryAnswers,
  type DiscoveryAnswers,
} from "@/lib/business-discovery-session";
import { submitDiscoveryCampaign } from "@/lib/studio-board-campaign";
import { studioBoard } from "@/config/studio-board";
import { customerJourneyStepName } from "@/config/customer-journey-v1";

import DiscoverySheetCard from "./DiscoverySheetCard";
import DiscoveryTileDoneBadge from "./DiscoveryTileDoneBadge";
import DiscoveryTileStatusCover from "./DiscoveryTileStatusCover";

type Props = {
  debug?: boolean;
};

type SheetPhase = "expanding" | "active" | "shrinking";

export default function BusinessDiscoveryStudioScene({ debug = false }: Props) {
  const router = useRouter();
  const openSnapshotRef = useRef<string>("");
  const [activeTileId, setActiveTileId] = useState<DiscoveryTileId | null>(null);
  const [sheetPhase, setSheetPhase] = useState<SheetPhase | null>(null);
  const [answers, setAnswers] = useState<DiscoveryAnswers>({});
  const [showDiscoveryReceived, setShowDiscoveryReceived] = useState(false);

  const {
    src,
    alt,
    nativeSize,
    tileHits,
    tileLabels,
    discoveryExpandedRect,
  } = businessDiscoveryStudio;

  const reloadAnswers = useCallback(() => {
    setAnswers(readDiscoveryAnswers());
    setActiveTileId(null);
    setSheetPhase(null);
    openSnapshotRef.current = "";
  }, []);

  useLayoutEffect(() => {
    reloadAnswers();
  }, [reloadAnswers]);

  useLayoutEffect(() => {
    const onCampaignUpdated = () => reloadAnswers();
    window.addEventListener("studio-squishy:campaign-updated", onCampaignUpdated);
    return () =>
      window.removeEventListener("studio-squishy:campaign-updated", onCampaignUpdated);
  }, [reloadAnswers]);

  const isTileComplete = (id: DiscoveryTileId) =>
    isDiscoveryTileAnswerComplete(id, answers[id]);

  const allRequiredComplete = DISCOVERY_REQUIRED_TILE_IDS.every((id) =>
    isTileComplete(id),
  );

  const showDoneBadge = (id: DiscoveryTileId) =>
    DISCOVERY_FORM_TILE_IDS.includes(id as (typeof DISCOVERY_FORM_TILE_IDS)[number]) &&
    isTileComplete(id) &&
    activeTileId !== id;

  const hitStyles = useMemo(() => {
    const map = {} as Record<DiscoveryTileId, CSSProperties>;
    for (const id of DISCOVERY_TILE_ORDER) {
      map[id] = plateRectToOverlayPercent(tileHits[id]);
    }
    return map;
  }, [tileHits]);

  const expandedStyle = useMemo(
    () => plateRectToOverlayPercent(discoveryExpandedRect),
    [discoveryExpandedRect],
  );

  useLayoutEffect(() => {
    if (sheetPhase !== "expanding") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setSheetPhase("active");
      return;
    }

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setSheetPhase("active"));
    });
    return () => cancelAnimationFrame(frame);
  }, [sheetPhase]);

  const finishShrink = useCallback(() => {
    setActiveTileId(null);
    setSheetPhase(null);
    openSnapshotRef.current = "";
  }, []);

  const handleSheetTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (sheetPhase !== "shrinking") return;
      if (event.propertyName !== "width") return;
      finishShrink();
    },
    [finishShrink, sheetPhase],
  );

  const handleTileClick = (id: DiscoveryTileId) => {
    if (activeTileId) return;
    if (id === "submit-project" && !allRequiredComplete) return;
    openSnapshotRef.current = answers[id] ?? "";
    setActiveTileId(id);
    setSheetPhase("expanding");
  };

  const beginShrink = () => {
    if (!activeTileId || sheetPhase === "shrinking") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      finishShrink();
      return;
    }

    setSheetPhase("shrinking");
  };

  const handleAnswerChange = useCallback(
    (value: string) => {
      if (!activeTileId) return;
      setAnswers((prev) => {
        const next = { ...prev, [activeTileId]: value };
        saveDiscoveryAnswers(next);
        return next;
      });
    },
    [activeTileId],
  );

  const handleDone = () => {
    if (activeTileId === "submit-project") {
      const finalAnswers = { ...answers, "submit-project": "submitted" };
      setAnswers(finalAnswers);
      saveDiscoveryAnswers(finalAnswers);
      submitDiscoveryCampaign(finalAnswers);
      beginShrink();
      setShowDiscoveryReceived(true);
      return;
    }
    beginShrink();
  };

  const continueToProjectSummary = useCallback(() => {
    setShowDiscoveryReceived(false);
    router.push(studioBoard.routes.projectSummary);
  }, [router]);

  const handleCancel = useCallback(() => {
    if (!activeTileId) return;
    const tileId = activeTileId;
    const snapshot = openSnapshotRef.current;
    setAnswers((prev) => {
      const next = { ...prev, [tileId]: snapshot };
      saveDiscoveryAnswers(next);
      return next;
    });
    beginShrink();
  }, [activeTileId]);

  const activeConfig = activeTileId ? discoveryTileConfig[activeTileId] : null;
  const sheetExpanded = sheetPhase === "active";
  const sheetLayerStyle =
    activeTileId && sheetExpanded
      ? expandedStyle
      : activeTileId
        ? hitStyles[activeTileId]
        : undefined;

  return (
    <div className="bds-scene" aria-label={customerJourneyStepName("project-discovery")}>
      <div
        className={[
          "bds-plate",
          activeTileId ? "bds-plate--sheet-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="bds-plate-canvas">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            width={nativeSize.width}
            height={nativeSize.height}
            className="bds-plate-art"
            draggable={false}
          />

          <div className="bds-ui">
            {DISCOVERY_TILE_ORDER.map((id) => {
              const isActive = activeTileId === id;
              const isSubmitLocked = id === "submit-project" && !allRequiredComplete;
              const sheetOpenElsewhere = activeTileId !== null && !isActive;

              return (
                <div
                  key={id}
                  className={[
                    "bds-tile-layer",
                    isActive ? "bds-tile-layer--active" : "",
                    isSubmitLocked ? "bds-tile-layer--locked" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={hitStyles[id]}
                >
                  {isActive && <div className="bds-tile-fade" aria-hidden="true" />}

                  <button
                    type="button"
                    className={[
                      "bds-tile-hit",
                      debug ? "bds-tile-hit--debug" : "",
                      isActive ? "bds-tile-hit--hidden" : "",
                      sheetOpenElsewhere ? "bds-tile-hit--blocked" : "",
                      isSubmitLocked ? "bds-tile-hit--locked" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label={tileLabels[id]}
                    aria-disabled={isSubmitLocked || sheetOpenElsewhere}
                    disabled={isSubmitLocked || sheetOpenElsewhere}
                    onClick={() => handleTileClick(id)}
                  />
                </div>
              );
            })}

            {/* Plate overlays — hide baked status circles, then one ✓ per completed tile */}
            <div className="bds-done-badges" aria-hidden="true">
              {DISCOVERY_TILE_ORDER.filter(showDoneBadge).map((id) => (
                <DiscoveryTileStatusCover key={`cover-${id}`} tileId={id} />
              ))}
              {DISCOVERY_TILE_ORDER.filter(showDoneBadge).map((id) => (
                <DiscoveryTileDoneBadge key={`badge-${id}`} tileId={id} />
              ))}
            </div>

            {activeTileId && activeConfig && sheetLayerStyle && (
              <div
                className={[
                  "bds-sheet-layer",
                  sheetExpanded ? "bds-sheet-layer--expanded" : "",
                  sheetPhase === "shrinking" ? "bds-sheet-layer--shrinking" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={sheetLayerStyle}
                onTransitionEnd={handleSheetTransitionEnd}
              >
                <DiscoverySheetCard
                  key={activeTileId}
                  tileId={activeTileId}
                  config={activeConfig}
                  initialValue={answers[activeTileId] ?? ""}
                  onChange={handleAnswerChange}
                  onDone={handleDone}
                  onCancel={handleCancel}
                  expanded={sheetExpanded}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {showDiscoveryReceived ? (
        <div className="bds-discovery-received" role="dialog" aria-modal="true" aria-labelledby="bds-discovery-received-title">
          <div className="bds-discovery-received__panel">
            <h2 id="bds-discovery-received-title" className="bds-discovery-received__title">
              Discovery Received
            </h2>
            <p className="bds-discovery-received__body">
              Thank you — we&apos;ve saved your answers. Review your Project Summary next.
            </p>
            <button
              type="button"
              className="bds-sheet__btn bds-sheet__btn--primary"
              onClick={continueToProjectSummary}
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
