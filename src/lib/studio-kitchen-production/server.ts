/**
 * Server-only Kitchen production surface (Node fs / child_process).
 * Do not import from Client Components.
 */

export { runCertVideoMachineQa } from "./video-cert/machine-qa";
export type { MachineQaCheck } from "./video-cert/machine-qa";

export {
  LANDING_PUBLISH_OWNER_SETUP,
  LANDING_FIXTURE_LABEL,
  LANDING_BOOKING_URL,
  buildCedarLaneLandingPacketV1,
  buildCedarLaneLandingPacketV2,
  buildCedarLaneLandingPacketV3,
  buildCedarLaneLandingPacketV4,
  loadAuthoritativeRmJ005Contract,
  runLandingPageProductionPipeline,
  validateLandingPageWorkPacket,
  renderLandingPageHtml,
  runLandingPageMachineQa,
  netlifyCredentialPresence,
  ensureNetlifySite,
} from "./landing-page/server";
export type { LandingPipelineResult } from "./landing-page/server";

export {
  CERT_VOICE_BINDING_MANIFEST_REL,
  expectedCertVoiceDefaults,
  readCertVoiceBindingManifest,
} from "./cert-voice/artifact-registry";
export type { CertVoiceBoundArtifact } from "./cert-voice/artifact-registry";
