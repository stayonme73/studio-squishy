export type SpeechWord = {
  word: string;
  start: number;
  end: number;
  punctuatedWord?: string;
};

export type SpeechIsland = {
  start: number;
  end: number;
  words: readonly SpeechWord[];
  text: string;
};

export type FootageProbe = {
  durationSeconds: number;
  width: number;
  height: number;
  hasAudio: boolean;
  meanVolumeDb?: number;
  maxVolumeDb?: number;
  rotation?: number;
};

export type FootageIntake = {
  skuId: "v2-rtu-short-form-video-edit";
  sourceRelativePath: string;
  sourceUrl?: string;
  ctaText: string;
  /** Blank on the current door means no CTA treatment. Historical one-file intake still requires words. */
  ctaTreatment?: "customer_words" | "none";
  mustKeepLine?: string;
  rightsCleared: boolean;
  language: "en";
};

export type EditDecisionClip = {
  sourceTrim: number;
  sourceLength: number;
  timelineStart: number;
  timelineLength: number;
  text: string;
  role: "hook" | "body" | "cta_hold";
};

export type TimedCaption = {
  start: number;
  end: number;
  text: string;
  role: "hook" | "speech" | "cta";
};

export type EditDecisionList = {
  ok: true;
  sourceDurationSeconds: number;
  outputDurationSeconds: number;
  clips: readonly EditDecisionClip[];
  captions: readonly TimedCaption[];
  droppedFalseStarts: number;
  droppedDeadSpaceSeconds: number;
  selection:
    | "full_usable"
    | "densest_window"
    | "sentence_index"
    | "multi_segment"
    | "performance_watch";
  selectionWinner?: "deterministic" | "sentence_index" | "performance_watch";
  coherenceScores?: {
    deterministic: number;
    sentenceIndex: number | null;
  };
};

export type EditDecisionFailure = {
  ok: false;
  code:
    | "MISSING_CTA"
    | "RIGHTS_NOT_CLEARED"
    | "NO_USABLE_SPEECH"
    | "INSUFFICIENT_USABLE_SPEECH"
    | "SOURCE_TOO_LONG"
    | "SOURCE_TOO_SHORT"
    | "NO_AUDIO"
    | "LANDSCAPE_NOT_FIRST_CERT"
    | "UNUSABLE_AUDIO"
    | "SHOTSTACK_PROMPT_FORBIDDEN";
  message: string;
};

export type FootageShotstackPayload = {
  timeline: {
    background: string;
    tracks: Array<{ clips: Array<Record<string, unknown>> }>;
  };
  output: {
    format: "mp4";
    size: { width: number; height: number };
    fps: number;
  };
};
