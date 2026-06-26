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

import {
  DISCOVERY_REQUIRED_TILE_IDS,
  DISCOVERY_TILE_ORDER,
  businessDiscoveryStudio,
  discoveryTileConfig,
  sceneRectToCoverPercent,
  type DiscoveryTileId,
} from "@/config/business-discovery-studio";
import {
  readDiscoveryAnswers,
  saveDiscoveryAnswers,
  type DiscoveryAnswers,
} from "@/lib/business-discovery-session";

import DiscoverySheetCard from "./DiscoverySheetCard";
import DiscoveryTileDoneBadge from "./DiscoveryTileDoneBadge";

type Props = {
  debug?: boolean;
};

type SheetPhase = "expanding" | "active" | "shrinking";

export default function BusinessDiscoveryStudioScene({ debug = false }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const openSnapshotRef = useRef<string>("");
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [activeTileId, setActiveTileId] = useState<DiscoveryTileId | null>(null);
  const [sheetPhase, setSheetPhase] = useState<SheetPhase | null>(null);
  const [answers, setAnswers] = useState<DiscoveryAnswers>({});

  const {
    src,
    alt,
    nativeSize,
    tileHits,
    tileLabels,
    plateFraming,
    discoveryExpandedRect,
  } = businessDiscoveryStudio;

  useLayoutEffect(() => {
    setAnswers(readDiscoveryAnswers());
  }, []);

  const allRequiredComplete = DISCOVERY_REQUIRED_TILE_IDS.every((id) =>
    Boolean(answers[id]?.trim()),
  );

  const isTileComplete = (id: DiscoveryTileId) => Boolean(answers[id]?.trim());

  const showDoneBadge = (id: DiscoveryTileId) =>
    isTileComplete(id) && activeTileId !== id;

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const sync = () => {
      const { width, height } = stage.getBoundingClientRect();
      setStageSize({ width, height });
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(stage);
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  const hitStyles = useMemo(() => {
    const map = {} as Record<DiscoveryTileId, CSSProperties>;
    for (const id of DISCOVERY_TILE_ORDER) {
      map[id] = sceneRectToCoverPercent(
        tileHits[id],
        stageSize,
        plateFraming,
      );
    }
    return map;
  }, [plateFraming, stageSize, tileHits]);

  const expandedStyle = useMemo(
    () => sceneRectToCoverPercent(discoveryExpandedRect, stageSize, plateFraming),
    [discoveryExpandedRect, plateFraming, stageSize],
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
    beginShrink();
  };

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
    <div className="bds-scene" aria-label="Business Discovery Studio">
      <div
        ref={stageRef}
        className={[
          "bds-plate",
          activeTileId ? "bds-plate--sheet-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
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

          {/* Plate-anchored ✓ badges — one explicit render path per tile, no tile-local coords */}
          <div className="bds-done-badges" aria-hidden="true">
            {showDoneBadge("your-business") && (
              <DiscoveryTileDoneBadge tileId="your-business" stageSize={stageSize} />
            )}
            {showDoneBadge("your-situation") && (
              <DiscoveryTileDoneBadge tileId="your-situation" stageSize={stageSize} />
            )}
            {showDoneBadge("your-challenge") && (
              <DiscoveryTileDoneBadge tileId="your-challenge" stageSize={stageSize} />
            )}
            {showDoneBadge("your-current-tools") && (
              <DiscoveryTileDoneBadge tileId="your-current-tools" stageSize={stageSize} />
            )}
            {showDoneBadge("your-focus") && (
              <DiscoveryTileDoneBadge tileId="your-focus" stageSize={stageSize} />
            )}
            {showDoneBadge("success-looks-like") && (
              <DiscoveryTileDoneBadge tileId="success-looks-like" stageSize={stageSize} />
            )}
            {showDoneBadge("whats-slowing-you-down") && (
              <DiscoveryTileDoneBadge
                tileId="whats-slowing-you-down"
                stageSize={stageSize}
              />
            )}
            {showDoneBadge("anything-else") && (
              <DiscoveryTileDoneBadge tileId="anything-else" stageSize={stageSize} />
            )}
            {showDoneBadge("submit-project") && (
              <DiscoveryTileDoneBadge tileId="submit-project" stageSize={stageSize} />
            )}
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
  );
}
