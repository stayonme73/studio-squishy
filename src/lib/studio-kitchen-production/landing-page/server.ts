/**
 * Node-only landing-page production (fs / Playwright / Netlify).
 * Do not import from Client Components.
 */

import "server-only";

export { validateLandingPageWorkPacket, sha256File } from "./validate";
export {
  buildLandingPageDefinition,
  renderLandingPageHtml,
} from "./render";
export {
  gateLandingPageQaForQaPass,
  requiresLandingPageQaGate,
  runLandingPageMachineQa,
} from "./qa";
export type { LandingPageQaEvidence, LandingPageQaPayload } from "./qa";
export { persistLandingPageArtifact, assertV1Preserved, sha256Text } from "./bind";
export {
  netlifyCredentialPresence,
  ensureNetlifySite,
  persistNetlifySiteIdToEnvLocal,
  publishLandingPageHtml,
  LANDING_PUBLISH_OWNER_SETUP,
  writePublishBlockerRecord,
} from "./publish";
export {
  runLandingPageProductionPipeline,
  landingPublishCredentialSnapshot,
} from "./pipeline";
export type { LandingPipelineResult } from "./pipeline";
export { runResponsiveViewportChecks } from "./responsive";
export { loadAuthoritativeRmJ005Contract } from "./contracts";
export {
  LANDING_FIXTURE_LABEL,
  LANDING_FIXTURE_ID,
  LANDING_CAMPAIGN_ID,
  LANDING_BOOKING_URL,
  buildCedarLaneLandingPacketV1,
  buildCedarLaneLandingPacketV2,
  buildCedarLaneLandingPacketV3,
  buildCedarLaneLandingPacketV4,
} from "./fixtures";
