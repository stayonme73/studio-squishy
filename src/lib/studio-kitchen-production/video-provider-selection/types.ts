/**
 * KITCHEN-VIDEO-PROVIDER-SELECTION-1 — selection types only.
 * No provider integration in this package.
 */

export type HardGateResult = "PASS" | "FAIL" | "UNVERIFIED";

export type VideoProviderId = "creatomate" | "shotstack" | "json2video";

export type ScoreDimension =
  | "owner_independence"
  | "api_render_capability"
  | "deterministic_scene_control"
  | "external_mp3_support"
  | "artifact_retrieval_binding_fit"
  | "branded_short_video_fit"
  | "correction_regeneration_fit"
  | "implementation_simplicity"
  | "cost_fit"
  | "studio_architecture_fit";

export type ProviderScore = Record<ScoreDimension, 0 | 1 | 2 | 3 | 4 | 5>;

export type HardGateRow = {
  programmaticProduction: HardGateResult;
  sceneTimelineControl: HardGateResult;
  captionsText: HardGateResult;
  externalMp3: HardGateResult;
  mp4Vertical1080x1920: HardGateResult;
  duration15to30: HardGateResult;
  artifactRetrieval: HardGateResult;
  regeneration: HardGateResult;
  commercialUsePath: HardGateResult;
  noRoutineHumanEditor: HardGateResult;
};

export type ProviderEvaluation = {
  id: VideoProviderId;
  label: string;
  hardGates: HardGateRow;
  hardGateOverall: "PASS" | "FAIL";
  scores: ProviderScore;
  scoreTotal: number;
  sources: readonly string[];
  eliminatedReason?: string;
};

export type SelectionDecision =
  | {
      decision: "SELECT";
      winner: VideoProviderId;
      winnerLabel: string;
      runnerUp: VideoProviderId;
      runnerUpLabel: string;
      runnerUpLostBecause: string;
    }
  | {
      decision: "NO_PROVIDER_PASSES";
      reason: string;
    };
