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
  DISCOVERY_FORM_TILE_IDS,
  DISCOVERY_TILE_ORDER,
  businessDiscoveryStudio,
  discoveryTileConfig,
  sceneRectToCoverPercent,
  type DiscoveryTileId,
} from "@/config/business-discovery-studio";

import DiscoverySheetCard from "./DiscoverySheetCard";

type Props = {
  debug?: boolean;
};

type SheetPhase = "expanding" | "active" | "shrinking";

export default function BusinessDiscoveryStudioScene({ debug = false }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const pendingSaveRef = useRef<string | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [activeTileId, setActiveTileId] = useState<DiscoveryTileId | null>(null);
  const [sheetPhase, setSheetPhase] = useState<SheetPhase | null>(null);
  const [answers, setAnswers] = useState<Partial<Record<DiscoveryTileId, string>>>(
    {},
  );

  const {
    src,
    alt,
    nativeSize,
    tileHits,
    tileDoneBadges,
    tileLabels,
    plateFraming,
    discoveryExpandedRect,
  } = businessDiscoveryStudio;

  const allFormComplete = DISCOVERY_FORM_TILE_IDS.every(
    (id) => Boolean(answers[id]?.trim()),
  );

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

  const doneBadgeStyles = useMemo(() => {
    const map = {} as Record<DiscoveryTileId, CSSProperties>;
    for (const id of DISCOVERY_TILE_ORDER) {
      const badge = tileDoneBadges[id];
      map[id] = sceneRectToCoverPercent(
        { x: badge.x, y: badge.y, width: badge.size, height: badge.size },
        stageSize,
        plateFraming,
      );
    }
    return map;
  }, [plateFraming, stageSize, tileDoneBadges]);

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
    const tileId = activeTileId;
    const savedValue = pendingSaveRef.current;
    pendingSaveRef.current = null;

    if (tileId && savedValue !== null) {
      setAnswers((prev) => ({ ...prev, [tileId]: savedValue }));
    }

    setActiveTileId(null);
    setSheetPhase(null);
  }, [activeTileId]);

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
    if (id === "submit-project" && !allFormComplete) return;
    pendingSaveRef.current = null;
    setActiveTileId(id);
    setSheetPhase("expanding");
  };

  const beginShrink = (saveValue: string | null) => {
    if (!activeTileId || sheetPhase === "shrinking") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pendingSaveRef.current = saveValue;

    if (reduced) {
      finishShrink();
      return;
    }

    setSheetPhase("shrinking");
  };

  const handleSave = (value: string) => {
    beginShrink(value);
  };

  const handleCancel = () => {
    beginShrink(null);
  };

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
            const isComplete = Boolean(answers[id]?.trim());
            const isSubmitLocked = id === "submit-project" && !allFormComplete;
            const sheetOpenElsewhere = activeTileId !== null && !isActive;

            return (
              <div
                key={id}
                className={[
                  "bds-tile-layer",
                  isActive ? "bds-tile-layer--active" : "",
                  isComplete ? "bds-tile-layer--complete" : "",
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

          {DISCOVERY_TILE_ORDER.map((id) => {
            const isActive = activeTileId === id;
            const isComplete = Boolean(answers[id]?.trim());
            if (isActive || !isComplete) return null;

            return (
              <span
                key={`done-${id}`}
                className={[
                  "bds-tile-done-badge",
                  id === "submit-project" ? "bds-tile-done-badge--submit" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={doneBadgeStyles[id]}
                aria-hidden="true"
              >
                ✓
              </span>
            );
          })}

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
                config={activeConfig}
                initialValue={answers[activeTileId] ?? ""}
                onSave={handleSave}
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