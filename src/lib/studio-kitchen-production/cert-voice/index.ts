export {
  CERT_VOICE_APPROVED_SCRIPT,
  CERT_VOICE_ARTIFACT_ROOT,
  CERT_VOICE_CAMPAIGN_ID,
  CERT_VOICE_FIXTURE_LABEL,
  CERT_VOICE_GENERATION_SCRIPT,
  CERT_VOICE_PACKAGE_ID,
  CERT_VOICE_PRONUNCIATION_NOTES,
  CERT_VOICE_PROVIDER,
  CERT_VOICE_SCRIPT_VERSION_ID,
  CERT_VOICE_TESTED_SKUS,
  certVoiceScriptDiffSummary,
  countScriptWords,
} from "./fixtures";

export {
  CERT_VOICE_BINDING_MANIFEST_REL,
  expectedCertVoiceDefaults,
  readCertVoiceBindingManifest,
} from "./artifact-registry";
export type { CertVoiceBoundArtifact } from "./artifact-registry";

export {
  CERT_VOICE_APPROVED_ARTIFACT,
  CERT_VOICE_CUSTOMER_READY_SKUS,
  CERT_VOICE_CUSTOMER_READY_STATUS,
  CERT_VOICE_OWNER_LISTENING_APPROVAL,
  gateCertVoiceListeningApproval,
  ownerListeningPassAttestationsForCertifiedArtifact,
} from "./listening-approval";
