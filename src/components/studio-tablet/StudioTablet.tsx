"use client";

import { type CSSProperties, type ReactNode } from "react";

import {
  studioTabletV1,
  type StudioTabletStage,
} from "@/config/studio-tablet-v1";
import styles from "@/components/studio-tablet/studio-tablet.module.css";

export type StudioTabletProps = {
  children?: ReactNode;
  /** Optional charging dock below the device. Not used in the Lobby shell cert. */
  dock?: boolean;
  /** Fit parent width — for workspace layouts beside the glass screen. */
  compact?: boolean;
  stage?: StudioTabletStage;
  stageTitle?: string;
  className?: string;
};

/**
 * Studio Tablet shell: code-composed physical tablet with a real React surface.
 * Transparent exterior. No raster UI, no permanent screen chrome.
 */
export default function StudioTablet({
  children,
  dock = false,
  compact = false,
  stage = "route-map",
  stageTitle,
  className,
}: StudioTabletProps) {
  const { viewportPreferred, inset, stageLabels } = studioTabletV1;
  const title = stageTitle ?? stageLabels[stage];
  const bezelPad = studioTabletV1.bezelOutsideMin + 2;
  const outerWidth = viewportPreferred.width + bezelPad * 2;
  const outerHeight = viewportPreferred.height + bezelPad * 2;
  const outerRatio = outerWidth / outerHeight;

  return (
    <div
      className={[
        styles.stage,
        compact ? styles.stageCompact : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.deviceColumn}>
        <div
          className={styles.frame}
          style={
            {
              ["--tablet-screen-w" as string]: `${viewportPreferred.width}px`,
              ["--tablet-screen-h" as string]: `${viewportPreferred.height}px`,
              ["--tablet-inset-top" as string]: `${inset.top}px`,
              ["--tablet-inset-bottom" as string]: `${inset.bottom}px`,
              ["--tablet-inset-x" as string]: `${inset.x}px`,
              ["--tablet-bezel-pad" as string]: `${bezelPad}px`,
              ["--tablet-outer-ratio" as string]: `${outerRatio}`,
              ["--tablet-frame-w" as string]: `${outerWidth}px`,
              ["--tablet-frame-h" as string]: `${outerHeight}px`,
            } as CSSProperties
          }
        >
          <div className={styles.aluminumEdge} aria-hidden />
          <div className={styles.notch} aria-hidden />
          <div className={styles.glass} aria-hidden />

          <div
            className={styles.screen}
            role="region"
            aria-label={`Studio Tablet - ${title}`}
          >
            <div className={styles.hostSurface}>{children}</div>
          </div>
        </div>

        {dock ? <div className={styles.dock} aria-hidden /> : null}
      </div>
    </div>
  );
}
