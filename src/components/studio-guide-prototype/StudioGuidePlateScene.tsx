"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { getStudioGuideV1Package } from "@/config/studio-guide-v1-lock";
import { paymentHref, type StudioGuidePackageId } from "@/config/studio-guide";
import {
  studioGuidePrototype,
  getSignaturePanelLayout,
  signatureFillPercentStyle,
  signaturePanelPercentStyle,
  studioGuidePrototypeRectToCoverPercent,
} from "@/config/studio-guide-prototype";

import StudioGuideBookletExpand from "./StudioGuideBookletExpand";
import StudioGuideDeskApproval from "./StudioGuideDeskApproval";

const PACKAGE_ORDER: StudioGuidePackageId[] = ["spark", "momentum", "growth"];

type Props = {
  debug?: boolean;
  enter?: boolean;
};

const BOOKLET_Z_INDEX: Record<StudioGuidePackageId, number> = {
  spark: 3,
  momentum: 4,
  growth: 5,
};

export default function StudioGuidePlateScene({ debug = false, enter = true }: Props) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [expandedId, setExpandedId] = useState<StudioGuidePackageId | null>(null);
  const [selectedId, setSelectedId] = useState<StudioGuidePackageId | null>(null);
  const [approved, setApproved] = useState(false);

  const { plate, bookletHits, copy } = studioGuidePrototype;

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
    const map = {} as Record<StudioGuidePackageId, CSSProperties>;
    for (const id of PACKAGE_ORDER) {
      map[id] = {
        ...studioGuidePrototypeRectToCoverPercent(
          bookletHits[id],
          stageSize,
          plate.nativeSize,
        ),
        zIndex: BOOKLET_Z_INDEX[id],
      };
    }
    return map;
  }, [bookletHits, plate.nativeSize, stageSize]);

  const signaturePanelStyles = useMemo(() => {
    const map = {} as Record<StudioGuidePackageId, CSSProperties>;
    for (const id of PACKAGE_ORDER) {
      map[id] = signaturePanelPercentStyle(bookletHits[id], getSignaturePanelLayout(id));
    }
    return map;
  }, [bookletHits]);

  const signatureFillStyles = useMemo(() => {
    const map = {} as Record<StudioGuidePackageId, CSSProperties>;
    for (const id of PACKAGE_ORDER) {
      map[id] = signatureFillPercentStyle(bookletHits[id], getSignaturePanelLayout(id));
    }
    return map;
  }, [bookletHits]);

  const handleBookletClick = (id: StudioGuidePackageId) => {
    if (approved) return;
    setExpandedId(id);
  };

  const handleSelect = (id: StudioGuidePackageId) => {
    setSelectedId(id);
    setApproved(true);
    setExpandedId(null);
  };

  const selectedLabel = selectedId ? getStudioGuideV1Package(selectedId)?.label : null;

  const goToPayment = () => {
    if (!selectedId) return;
    router.push(`${paymentHref(selectedId)}&from=prototype`);
  };

  return (
    <div
      className={`sg-proto${enter ? " sg-proto--enter" : ""}${expandedId ? " sg-proto--expanded" : ""}${approved ? " sg-proto--approved" : ""}`}
      aria-label="Studio Guide — Draft Room"
    >
      <p className="sg-proto-banner" role="status">
        {copy.banner}
      </p>

      <div ref={stageRef} className="sg-proto-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={plate.src}
          alt={plate.alt}
          width={plate.nativeSize.width}
          height={plate.nativeSize.height}
          className="sg-proto-art"
          draggable={false}
        />

        <div className="sg-proto-ui">
          {PACKAGE_ORDER.map((id) => {
            const pkg = getStudioGuideV1Package(id);
            const isExpanded = expandedId === id;
            const isSelected = selectedId === id;
            const isDimmed =
              (expandedId !== null && !isExpanded) || (approved && !isSelected);

            return (
              <div key={id} className="sg-proto-booklet-layer" style={hitStyles[id]}>
                <button
                  type="button"
                  className={[
                    "sg-proto-booklet-hit",
                    debug ? "sg-proto-booklet-hit--debug" : "",
                    isDimmed ? "sg-proto-booklet-hit--dimmed" : "",
                    isExpanded ? "sg-proto-booklet-hit--active" : "",
                    approved ? "sg-proto-booklet-hit--locked" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`${pkg?.label ?? id} — ${pkg?.tagline ?? "package booklet"}`}
                  aria-expanded={isExpanded}
                  onClick={() => handleBookletClick(id)}
                />

                {debug ? (
                  <div
                    className="sg-proto-signature-panel-debug"
                    style={signaturePanelStyles[id]}
                    aria-hidden
                  />
                ) : null}

                {isSelected && approved ? (
                  <StudioGuideDeskApproval
                    packageId={id}
                    style={signatureFillStyles[id]}
                    debug={debug}
                  />
                ) : null}
              </div>
            );
          })}

          {expandedId && (
            <>
              <button
                type="button"
                className="sg-proto-expand-backdrop"
                aria-label={copy.expandClose}
                onClick={() => setExpandedId(null)}
              />
              <StudioGuideBookletExpand
                packageId={expandedId}
                onClose={() => setExpandedId(null)}
                onSelect={handleSelect}
              />
            </>
          )}
        </div>
      </div>

      <footer className="sg-proto-footer">
        {approved && selectedLabel ? (
          <>
            <p className="sg-proto-footer-status">{copy.selectedStatus(selectedLabel)}</p>
            <p className="sg-proto-footer-note">{copy.paymentNote}</p>
            <button type="button" className="sg-proto-footer-pay" onClick={goToPayment}>
              {copy.paymentCta}
            </button>
          </>
        ) : (
          <p className="sg-proto-footer-hint">{copy.exploreHint}</p>
        )}
      </footer>
    </div>
  );
}
