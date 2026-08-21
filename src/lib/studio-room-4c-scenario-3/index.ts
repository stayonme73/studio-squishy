export {
  canonicalScenario3BriefJson,
  hashScenario3Brief,
  SCENARIO_3_BRIEF_SHA256,
} from "./brief";
export {
  evaluateScenario3Acceptance,
  SCENARIO_3_LAUNCH_NOW_SERVICES,
} from "./acceptance";
export {
  assertExactCanonicalLaunchFacts,
  assertScenario3ProductionRoutingAllowed,
  scenario3CanonicalCustomerFacts,
  scenario3ProductionRoutingInput,
  SCENARIO_3_APPROVED_CUSTOMER_FACT_RECORD,
  SCENARIO_3_STALE_LOCATION,
  SCENARIO_3_STALE_PHONE,
  SCENARIO_3_STALE_URL,
} from "./fact-integrity";
export {
  assertScenario3CustomerFactSourceGate,
  collectScenario3CustomerFactSources,
  evaluateScenario3CustomerFactSourceGate,
  scenario3RequiredFactLockText,
  SCENARIO_3_PRE_PRODUCTION_REQUIRED_FACTS,
} from "./customer-fact-sources";
export { evaluateScenario3PhotoPackIngest } from "./photo-pack-ingest";
export type { Scenario3PhotoPackIngestResult } from "./photo-pack-ingest";
export {
  briefClaimsCustomerPhotoOwnership,
  briefPhotoAuthority,
  evaluateScenario3PhotoAuthorityAgreement,
  photoAuthorityContradictsFixturePack,
} from "./photo-authority-agreement";
export {
  assertScenario3FactsStamped,
  assertScenario3ProductionAuthorized,
  assertScenario3ProductionBlockedUntilAuthorized,
  scenario3ProductionMayStart,
} from "./production-gate";
export {
  SCENARIO_3_PRODUCTION_AUTHORIZATION,
  scenario3ProductionAuthorizedByOwner,
} from "./production-authorization";
export {
  buildScenario3Caption,
  buildScenario3CampaignDirection,
  buildScenario3Email,
  buildScenario3NarrationScript,
  formatScenario3EmailPasteReady,
  SCENARIO_3_APPROVED_NARRATION,
  SCENARIO_3_NARRATION_SENTENCES,
  scenario3CopyQualityBrief,
  scenario3EmailCopyQualityBrief,
  scenario3VisitorClaimSentence,
} from "./copy";
export {
  scenario3VideoPlateCopy,
  scenario3VideoCtaPlateCopy,
  SCENARIO_3_MUSIC_LED_WINDOWS,
} from "./video-plates";
export type { Scenario3VideoPlateCopy } from "./video-plates";
export {
  SCENARIO_3_MIN_CTA_HOLD_SECONDS,
  SCENARIO_3_VIDEO_MAX_SECONDS,
  SCENARIO_3_VIDEO_MIN_SECONDS,
  buildSemanticBeatWindows,
  buildSemanticTimingTable,
  evaluateSemanticVideoFlow,
  hashScenarioDeliverables,
  mapSentencesToAlignment,
  sha256File,
  synthesizeAlignmentFromDuration,
} from "./video-flow";
export { routeScenario3Services, scenario3RoutingUsesSharedFacts } from "./routing";
export type { Scenario3Route } from "./routing";
export { buildScenario3DeliveryManifest } from "./delivery-manifest";
export type {
  Scenario3DeliveryFile,
  Scenario3DeliveryManifest,
} from "./delivery-manifest";
export { buildScenario3Provenance } from "./provenance";
export {
  assertScenario3ClaimAuthority,
  assertScenario3VisitorClaimPresent,
  evaluateScenario3ClaimCopyGate,
  findProhibitedClaimHits,
  scenario3ApprovedClaims,
  scenario3ForbiddenInventions,
  stripScenario3ClaimBoundaryLanguage,
} from "./claim-authority";
