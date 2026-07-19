/**
 * Studio Presence V1 — visual direction.
 * @see docs/studio-presence-visual-direction-v1.md
 * @see docs/illustration/references/studio-presence-design-guide-v3.png
 *
 * Primary goal: illusion of an invisible Studio representative.
 * Frame silhouette is locked — evolve via eyes, lids, depth, motion, expression.
 */

export type PresenceVisualState =
  | "hidden"
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "guiding";

export type PresenceIdentityFocus = "glassesMark" | "glassesFace";

export const studioPresenceV1 = {
  /** Off while Lobby invisible-friend outfit is under visual review. */
  enabled: false,
  lobbyOnly: true,
  /**
   * Glasses + face — recessed soft-almond eyes behind locked frames.
   */
  identityFocus: "glassesFace" as PresenceIdentityFocus,
  /**
   * Mouth still gated; breath + idle gaze unlocked so Presence can feel at work.
   */
  stillVisualCert: false,

  /**
   * Lobby Presence width — ~7% under prior 336 so proportions sit at 100% zoom.
   */
  sizePx: 312,

  stageZIndex: 40,
  /** Nudge right of podium so Presence sits in open space. */
  dockOffsetPx: { x: 200, y: -52 },

  colors: {
    /** Matte mushroom green — muted, slightly greener. */
    glasses: "#5f9a66",
    glassesRim: "#457a4d",
    glassesDeep: "#34623c",
    glassesHighlight: "#7db585",
    /** Soft defined glass — readable as lenses, not opaque. */
    glassesGlass: "rgba(210, 228, 218, 0.16)",
    /** Quiet bridge mark — support, not the first read. */
    sMark: "rgba(214, 232, 216, 0.42)",
    sMarkGlow: "rgba(236, 246, 238, 0.22)",
    sclera: "#f8fcfa",
    /** Squishy Eye teal — match plush character. */
    irisOuter: "#0a6a78",
    irisMid: "#0ea8b8",
    irisInner: "#5ad4e0",
    pupil: "#0a1214",
    eyelid: "#c4d0cc",
    brow: "#1a1a1a",
    mouth: "#3a4248",
  },

  motion: {
    floatAmplitudePx: 2.5,
    floatDurationMs: 5600,
    /** Less frequent — natural pause between blinks. */
    blinkMinMs: 5500,
    blinkMaxMs: 12000,
    /** Slower lid close + brief hold. */
    blinkCloseMs: 300,
    lookLerp: 0.1,
    pupilMaxOffsetPx: 3.4,
    prototypeSpeakPulse: false,
    speakPulseEveryMs: 9000,
    speakPulseDurationMs: 1800,
    mouthSwapMs: 160,
  },
} as const;

export const PRESENCE_ANCHOR_LOBBY_PODIUM = "lobby-podium" as const;
