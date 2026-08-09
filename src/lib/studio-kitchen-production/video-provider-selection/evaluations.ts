/**
 * KITCHEN-VIDEO-PROVIDER-SELECTION-1 — first-party-sourced evaluations.
 * Scores do not override hard-gate FAIL.
 */

import type { ProviderEvaluation } from "./types";

export const CREATOMATE_EVALUATION: ProviderEvaluation = {
  id: "creatomate",
  label: "Creatomate",
  hardGates: {
    programmaticProduction: "PASS",
    sceneTimelineControl: "PASS",
    captionsText: "PASS",
    externalMp3: "PASS",
    mp4Vertical1080x1920: "PASS",
    duration15to30: "PASS",
    artifactRetrieval: "PASS",
    regeneration: "PASS",
    commercialUsePath: "PASS",
    noRoutineHumanEditor: "PASS",
  },
  hardGateOverall: "PASS",
  scores: {
    owner_independence: 5,
    api_render_capability: 5,
    deterministic_scene_control: 5,
    external_mp3_support: 5,
    artifact_retrieval_binding_fit: 5,
    branded_short_video_fit: 5,
    correction_regeneration_fit: 5,
    implementation_simplicity: 4,
    cost_fit: 3,
    studio_architecture_fit: 5,
  },
  scoreTotal: 47,
  sources: [
    "https://creatomate.com/docs/api/reference/create-a-render",
    "https://creatomate.com/docs/api/quick-start/create-a-video-by-render-script",
    "https://creatomate.com/docs/api/quick-start/distribute-elements-over-time",
    "https://creatomate.com/docs/api/render-script/audio-element",
    "https://creatomate.com/docs/account/how-are-credits-calculated",
    "https://creatomate.com/docs/account/how-does-the-pricing-work",
    "https://creatomate.com/pricing",
    "https://creatomate.com/terms",
  ],
};

export const SHOTSTACK_EVALUATION: ProviderEvaluation = {
  id: "shotstack",
  label: "Shotstack",
  hardGates: {
    programmaticProduction: "PASS",
    sceneTimelineControl: "PASS",
    captionsText: "PASS",
    externalMp3: "PASS",
    mp4Vertical1080x1920: "PASS",
    duration15to30: "PASS",
    artifactRetrieval: "PASS",
    regeneration: "PASS",
    commercialUsePath: "PASS",
    noRoutineHumanEditor: "PASS",
  },
  hardGateOverall: "PASS",
  scores: {
    owner_independence: 5,
    api_render_capability: 5,
    deterministic_scene_control: 5,
    external_mp3_support: 5,
    artifact_retrieval_binding_fit: 5,
    branded_short_video_fit: 4,
    correction_regeneration_fit: 5,
    implementation_simplicity: 5,
    cost_fit: 5,
    studio_architecture_fit: 4,
  },
  scoreTotal: 48,
  sources: [
    "https://shotstack.io/docs/api/",
    "https://shotstack.io/docs/guide/getting-started/core-concepts/",
    "https://shotstack.io/docs/guide/llms-full.txt",
    "https://shotstack.io/learn/crop-resize-videos/",
    "https://shotstack.io/pricing",
    "https://shotstack.io/legal/terms-of-service/",
  ],
};

export const JSON2VIDEO_EVALUATION: ProviderEvaluation = {
  id: "json2video",
  label: "JSON2Video",
  hardGates: {
    programmaticProduction: "PASS",
    sceneTimelineControl: "PASS",
    captionsText: "PASS",
    externalMp3: "PASS",
    mp4Vertical1080x1920: "PASS",
    duration15to30: "PASS",
    artifactRetrieval: "PASS",
    regeneration: "PASS",
    commercialUsePath: "PASS",
    noRoutineHumanEditor: "PASS",
  },
  hardGateOverall: "PASS",
  scores: {
    owner_independence: 5,
    api_render_capability: 5,
    deterministic_scene_control: 5,
    external_mp3_support: 5,
    artifact_retrieval_binding_fit: 5,
    branded_short_video_fit: 4,
    correction_regeneration_fit: 5,
    implementation_simplicity: 4,
    cost_fit: 3,
    studio_architecture_fit: 4,
  },
  scoreTotal: 45,
  sources: [
    "https://json2video.com/docs/v2/api-reference/api-endpoints/movies",
    "https://json2video.com/docs/v2/reference/json-syntax/movie",
    "https://json2video.com/docs/v2/api-reference/json-syntax/element/audio",
    "https://json2video.com/docs/v2/guides/no-code/generic-http",
    "https://json2video.com/docs/v2/reference/credits/plans",
    "https://json2video.com/docs/v2/reference/credits/credit-consumption",
    "https://json2video.com/docs/v2/reference/content-ownership",
  ],
};

export const PROVIDER_EVALUATIONS: readonly ProviderEvaluation[] = [
  CREATOMATE_EVALUATION,
  SHOTSTACK_EVALUATION,
  JSON2VIDEO_EVALUATION,
];
