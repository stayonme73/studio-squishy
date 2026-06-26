"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { draftRoom, draftRoomBeginHref, draftRoomRectToCoverPercent } from "@/config/draft-room";
import type { StudioGuidePackageId } from "@/config/studio-guide";

type Props = {
  packageId?: StudioGuidePackageId;
};

/** Draft Room — illustrated plate (copy baked in art) + wired Continue hotspot only. */
export default function DraftRoomScene({ packageId }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  const { intakePlateNativeSize, intakeContinueHotspot } = draftRoom.layout;
  const { intakePlate } = draftRoom.assets;

  const continueHref = draftRoomBeginHref(packageId);

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

  const continueStyle = useMemo(
    () => draftRoomRectToCoverPercent(intakeContinueHotspot, stageSize, intakePlateNativeSize),
    [intakeContinueHotspot, stageSize, intakePlateNativeSize],
  );

  return (
    <div className="dri draft-room" aria-label="Draft Room">
      <div ref={stageRef} className="dri-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={intakePlate}
          alt="Draft Room — clipboard invite to begin your project"
          width={intakePlateNativeSize.width}
          height={intakePlateNativeSize.height}
          className="dri-art"
          draggable={false}
        />

        <div className="dri-ui">
          <Link
            href={continueHref}
            className="dri-continue-hotspot"
            style={continueStyle}
            aria-label="Continue to intake questions"
          />
        </div>
      </div>
    </div>
  );
}
