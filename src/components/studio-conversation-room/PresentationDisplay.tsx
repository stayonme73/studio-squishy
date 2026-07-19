"use client";

import { type CSSProperties, type ReactNode } from "react";

import { studioConversationRoomV1 } from "@/config/studio-conversation-room-v1";
import styles from "@/components/studio-conversation-room/presentation-display.module.css";

export type PresentationDisplayProps = {
  /** Runtime content intentionally shared with the customer. */
  children?: ReactNode;
  className?: string;
  /**
   * Presence glow bias — bottom-edge / screen illumination.
   * Ambient only; not a status caption.
   */
  presenceBias?: "neutral" | "studio" | "customer" | "thinking" | "dim";
  /** Conversational baton strength on this surface. */
  haloStrength?: "primary" | "soft" | "dim" | "neutral";
  floor?: "studio" | "customer" | "neutral";
  /** Brief pulse when an answer is captured. */
  capturedPulse?: boolean;
};

/**
 * Presentation Display — customer landscape glass (hardware shell).
 * Supports conversation. Never a dashboard. Content = children only.
 */
export default function PresentationDisplay({
  children,
  className,
  presenceBias = "neutral",
  haloStrength = "neutral",
  floor = "neutral",
  capturedPulse = false,
}: PresentationDisplayProps) {
  const { presentationViewport, presentationBezelOutsideMin } =
    studioConversationRoomV1;
  const bezelPad = presentationBezelOutsideMin + 2;
  const outerWidth = presentationViewport.width + bezelPad * 2;
  const outerHeight = presentationViewport.height + bezelPad * 2;
  const outerRatio = outerWidth / outerHeight;

  return (
    <div
      className={[styles.frame, className ?? ""].filter(Boolean).join(" ")}
      data-presence-bias={presenceBias}
      data-halo={haloStrength}
      data-presence-floor={floor}
      data-captured-pulse={capturedPulse ? "true" : undefined}
      style={
        {
          ["--pd-frame-w" as string]: `${outerWidth}px`,
          ["--pd-outer-ratio" as string]: `${outerRatio}`,
          ["--pd-bezel-pad" as string]: `${bezelPad}px`,
        } as CSSProperties
      }
    >
      <div className={styles.aluminumEdge} aria-hidden />
      <div className={styles.glassChrome} aria-hidden />
      <div className={styles.bottomGlow} aria-hidden />
      <div
        className={styles.screen}
        role="region"
        aria-label="Presentation Display"
      >
        <div className={styles.surface}>{children}</div>
      </div>
    </div>
  );
}
