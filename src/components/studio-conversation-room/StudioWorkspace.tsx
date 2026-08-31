"use client";

import { type CSSProperties, type ReactNode } from "react";

import { studioConversationRoomV1 } from "@/config/studio-conversation-room-v1";
import styles from "@/components/studio-conversation-room/studio-workspace.module.css";
import voiceFilm from "@/components/studio-conversation-room/voice-choice-film.module.css";

export type StudioWorkspaceProps = {
  /** Runtime content only — never baked into hardware. */
  children?: ReactNode;
  className?: string;
  /** Presence reflected light when Studio is speaking. */
  presenceBias?: "neutral" | "studio" | "customer" | "thinking" | "dim";
  /** Conversational baton strength on this surface. */
  haloStrength?: "primary" | "soft" | "dim" | "neutral";
  floor?: "studio" | "customer" | "neutral";
  /** Brief pulse when an answer is captured. */
  capturedPulse?: boolean;
  /** First-entry Voice choice — Welcome glass over Lounge, not a dark tablet cave. */
  voiceChoice?: boolean;
  /**
   * Opening-question family (Before We Begin through Materials) shares the
   * same light Lounge glass as Voice choice. Do not leave this off after the gate.
   */
  loungeLight?: boolean;
  /**
   * Opening-question family reuses Voice Choice `.panel`.
   * Do not invent a second glass. Hides tablet/device chrome.
   */
  nameQuestion?: boolean;
};

/**
 * Conversation tablet — portrait hardware shell.
 * One interactive surface: speak / type; halo marks whose turn.
 */
export default function StudioWorkspace({
  children,
  className,
  presenceBias = "neutral",
  haloStrength = "neutral",
  floor = "neutral",
  capturedPulse = false,
  voiceChoice = false,
  loungeLight = false,
  nameQuestion = false,
}: StudioWorkspaceProps) {
  const { workspaceViewport, workspaceBezelOutsideMin } =
    studioConversationRoomV1;
  const bezelPad = workspaceBezelOutsideMin + 2;
  const outerWidth = workspaceViewport.width + bezelPad * 2;
  const outerHeight = workspaceViewport.height + bezelPad * 2;
  const outerRatio = outerWidth / outerHeight;

  return (
    <div
      className={[styles.stage, className ?? ""].filter(Boolean).join(" ")}
    >
      <div className={styles.deviceColumn}>
        <div
          className={styles.frame}
          data-presence-bias={presenceBias}
          data-halo={haloStrength}
          data-presence-floor={floor}
          data-captured-pulse={capturedPulse ? "true" : undefined}
          data-voice-choice={voiceChoice ? "true" : undefined}
          data-lounge-light={loungeLight || voiceChoice ? "true" : undefined}
          data-name-question={nameQuestion ? "true" : undefined}
          style={
            {
              ["--ws-frame-w" as string]: `${outerWidth}px`,
              ["--ws-outer-ratio" as string]: `${outerRatio}`,
              ["--ws-bezel-pad" as string]: `${bezelPad}px`,
            } as CSSProperties
          }
        >
          {nameQuestion ? (
            <div
              className={`${voiceFilm.panel} ${styles.nameQuestionPanel}`}
              role="region"
              aria-label="Studio conversation question"
              data-name-question-panel="true"
            >
              <div
                className={styles.nameQuestionFrost}
                aria-hidden="true"
                data-name-question-frost="true"
              />
              <div className={styles.hostSurface}>{children}</div>
            </div>
          ) : (
            <>
          <div className={styles.aluminumEdge} aria-hidden />
          <div className={styles.notch} aria-hidden />
          <div className={styles.glassChrome} aria-hidden />
          <div
            className={styles.screen}
            role="region"
            aria-label="Studio conversation tablet"
          >
            <div className={styles.hostSurface}>{children}</div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
