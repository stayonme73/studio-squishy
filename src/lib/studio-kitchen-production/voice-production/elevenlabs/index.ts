export {
  DEFAULT_ELEVENLABS_MODEL_ID,
  DEFAULT_ELEVENLABS_VOICE_ID,
  ELEVENLABS_API_BASE,
  ELEVENLABS_MP3_OUTPUT_FORMAT,
  ELEVENLABS_WAV_OUTPUT_FORMAT,
  elevenLabsCredentialPresence,
  readElevenLabsApiKey,
  redactSecretsForEvidence,
  resolveApprovedVoiceConfiguration,
} from "./config";
export type {
  ApprovedVoiceConfiguration,
  ElevenLabsCredentialPresence,
  ElevenLabsOutputFormat,
} from "./config";

export { elevenLabsGetJson, elevenLabsTextToSpeech } from "./client";
export { discoverElevenLabsAccountCapability } from "./capability";

export type {
  ElevenLabsAccountCapability,
  ElevenLabsFailureCode,
  ElevenLabsFetch,
  ElevenLabsTtsRequest,
  ElevenLabsTtsResult,
} from "./types";
