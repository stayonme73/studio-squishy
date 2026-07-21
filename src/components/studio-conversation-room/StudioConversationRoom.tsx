"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

import HelpCenterPanel from "@/components/studio-conversation-room/HelpCenterPanel";
import StudioPresenceRail from "@/components/studio-conversation-room/StudioPresenceRail";
import StudioWorkspace from "@/components/studio-conversation-room/StudioWorkspace";
import styles from "@/components/studio-conversation-room/studio-conversation-room.module.css";
import {
  isActivitySlidePanel,
  type ActivityPanelId,
} from "@/config/conversation-room-stage-v1";
import { studioConversationRoomV1 } from "@/config/studio-conversation-room-v1";
import type { StudioCommunicationLightState } from "@/config/studio-conversation-room-v1";
import {
  presenceFloor,
  presenceGlowBias,
  resolveStudioPresence,
  tabletHaloStrength,
  type StudioPresenceSnapshot,
} from "@/lib/studio-conversation-framework";

export type StudioConversationRoomProps = {
  /** Guide content inside the tablet. */
  workspace?: ReactNode;
  /** Permanent modern speak / type panel — top of the left rail. */
  communication?: ReactNode;
  /** Studio controls — under speak/type in the same left rail. */
  navigation?: ReactNode;
  /** Right Activity Panel content (slide shell). */
  slideOut?: ReactNode;
  /**
   * Single Activity Panel controller.
   * `help` uses distinct Help chrome; other non-`none` values use the slide shell.
   */
  activePanel?: ActivityPanelId;
  onCloseActivityPanel?: () => void;
  /**
   * Element that opened the panel — focus returns here on close.
   */
  activityPanelReturnFocusRef?: RefObject<HTMLElement | null>;
  /**
   * @deprecated Dual-surface removed — one tablet only.
   */
  presentation?: ReactNode;
  /**
   * @deprecated Prefer `presence`.
   */
  lightState?: StudioCommunicationLightState;
  presence?: StudioPresenceSnapshot;
  /**
   * @deprecated Dual-surface inspection retired.
   */
  inspectHardware?: boolean;
  /** Mic privacy — under the stage, never inside the tablet. */
  micPrivacyNote?: string;
  className?: string;
};

function presenceFromLight(
  lightState: StudioCommunicationLightState,
): StudioPresenceSnapshot {
  const intent =
    lightState === "listening"
      ? "listening"
      : lightState === "speaking"
        ? "speaking"
        : lightState === "thinking"
          ? "thinking"
          : lightState === "unavailable"
            ? "unavailable"
            : "idle";
  return resolveStudioPresence({ intent });
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (element) =>
      element.offsetParent !== null || element === document.activeElement,
  );
}

/**
 * Conversation Room — speak/type + Studio controls left · tablet center.
 * One Activity Panel controller on the right (slide or Help chrome).
 */
export default function StudioConversationRoom({
  workspace,
  communication,
  navigation,
  slideOut,
  activePanel = "none",
  onCloseActivityPanel,
  activityPanelReturnFocusRef,
  lightState = "idle",
  presence,
  micPrivacyNote,
  className,
}: StudioConversationRoomProps) {
  const resolvedPresence = presence ?? presenceFromLight(lightState);
  const floor =
    resolvedPresence.floor ?? presenceFloor(resolvedPresence.activity);
  const bias = presenceGlowBias(resolvedPresence.activity);
  const tabletHalo = tabletHaloStrength(floor);
  const { surfaceCaptions } = studioConversationRoomV1;
  const hasSideRail = Boolean(communication || navigation);

  const slideOpen = isActivitySlidePanel(activePanel);
  const helpOpen = activePanel === "help";
  const panelOpen = slideOpen || helpOpen;

  const titleId = useId();
  const slideRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseActivityPanelRef = useRef(onCloseActivityPanel);
  onCloseActivityPanelRef.current = onCloseActivityPanel;

  /* Auto-focus once when a panel opens — never again on parent re-renders
     (Intake typing was losing the caret every status/autosave update). */
  useEffect(() => {
    if (!panelOpen) return;

    previouslyFocused.current =
      activityPanelReturnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);

    const helpRoot = helpOpen
      ? document.querySelector<HTMLElement>('[data-conversation-help="open"]')
      : null;
    const root = slideOpen ? slideRef.current : helpRoot;
    const focusTarget =
      root?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? root;

    const focusTimer = window.setTimeout(() => {
      focusTarget?.focus();
    }, 0);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseActivityPanelRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !slideOpen || !slideRef.current) return;

      const focusable = getFocusableElements(slideRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activePanel, panelOpen, slideOpen, helpOpen, activityPanelReturnFocusRef]);

  useEffect(() => {
    if (panelOpen) return;
    const restore =
      activityPanelReturnFocusRef?.current ?? previouslyFocused.current;
    restore?.focus?.();
  }, [panelOpen, activityPanelReturnFocusRef]);

  const roomClassName = [styles.room, className ?? ""].filter(Boolean).join(" ");
  const panelLabel =
    activePanel === "route"
      ? "Choose your route"
      : activePanel === "builder"
        ? "Build your project"
        : activePanel === "learnMore"
          ? "Learn more"
          : activePanel === "plan"
            ? "Studio Plan"
            : "Activity panel";

  return (
    <div
      className={roomClassName}
      aria-label="Studio Conversation Room"
      data-presence-activity={resolvedPresence.activity}
      data-presence-bias={bias}
      data-presence-floor={floor}
      data-layout="one-tablet"
      data-active-panel={activePanel}
      data-slide-open={slideOpen ? "true" : "false"}
    >
      <div className={styles.roomStage}>
        <div className={styles.workRow}>
          {hasSideRail ? (
            <div className={styles.sideRail} data-studio-surface="side-rail">
              <div className={styles.sideRailBody}>
                {communication ? (
                  <div
                    className={styles.sideSpeak}
                    data-studio-surface="communication"
                  >
                    {communication}
                  </div>
                ) : null}
                {navigation ? (
                  <div
                    className={styles.sideNav}
                    data-studio-surface="navigation"
                  >
                    {navigation}
                  </div>
                ) : null}
              </div>
              <p className={styles.sideCaption}>Speak, type, and navigate</p>
            </div>
          ) : null}

          <div
            className={styles.surfaceStack}
            data-studio-surface="tablet"
            data-halo={tabletHalo}
          >
            <StudioWorkspace
              presenceBias={bias}
              haloStrength={tabletHalo}
              floor={floor}
              capturedPulse={resolvedPresence.activity === "captured"}
            >
              {workspace}
            </StudioWorkspace>
            <p className={styles.surfaceCaption} data-caption="tablet">
              {surfaceCaptions.tablet}
            </p>
            {micPrivacyNote ? (
              <p className={styles.micPrivacyBelow}>{micPrivacyNote}</p>
            ) : null}
          </div>
        </div>

        <div
          className={styles.presenceBelow}
          data-studio-surface="presence-rail"
          aria-label="Studio presence — who is speaking"
        >
          <StudioPresenceRail presence={resolvedPresence} />
        </div>
      </div>

      {slideOpen ? (
        <button
          type="button"
          className={styles.slideScrim}
          aria-label="Close activity panel"
          onClick={onCloseActivityPanel}
        />
      ) : null}
      <aside
        ref={slideRef}
        className={styles.slideHost}
        data-studio-surface="activity-panel"
        data-open={slideOpen ? "true" : "false"}
        data-panel={activePanel}
        role={slideOpen ? "dialog" : undefined}
        aria-modal={slideOpen ? true : undefined}
        aria-labelledby={slideOpen ? titleId : undefined}
        aria-label={slideOpen ? panelLabel : undefined}
        aria-hidden={slideOpen ? undefined : true}
        tabIndex={slideOpen ? -1 : undefined}
      >
        {slideOpen ? (
          <span id={titleId} className={styles.srOnly}>
            {panelLabel}
          </span>
        ) : null}
        {slideOut}
      </aside>

      <HelpCenterPanel open={helpOpen} onClose={onCloseActivityPanel} />
    </div>
  );
}
