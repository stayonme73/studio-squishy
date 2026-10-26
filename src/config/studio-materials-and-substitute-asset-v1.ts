/**
 * Studio Materials + Substitute-Asset Rule — LOCKED 2026-09-22.
 * Shared playbook for Studio Voice, Machine, Production, and Owner escalation.
 *
 * Authority: docs/studio-materials-and-substitute-asset-v1-locked.md
 */

export const STUDIO_MATERIALS_AND_SUBSTITUTE_ASSET_LOCKED_AT = "2026-09-22" as const;

export const studioMaterialsAndSubstituteAssetV1 = {
  locked: true as const,
  lockedAt: STUDIO_MATERIALS_AND_SUBSTITUTE_ASSET_LOCKED_AT,
  owner: "Tagia",
  sharedAcross: [
    "Studio Voice",
    "Machine",
    "Production",
    "Owner Console escalation",
  ] as const,
  notAMossOnlyPatch: true as const,
  doNotSubstituteCertificationFixtures: true as const,
  doNotSubstituteTestAssets: true as const,
  doNotInventCustomerAssets: true as const,
  doNotStartFinalProductionOnTemporaryImages: true as const,
  missingPromisedMaterialsAreNotOwnerEscalation: true as const,
  fixturesRemainFixtures: true as const,
  doNotReinterpretFixturesAsCustomerAssets: true as const,
  voiceWhenWaiting:
    "Please send the photos or files you said you would provide. The Studio is waiting on those materials and has not started final production.",
  machineWhenWaiting: "waiting_on_customer_materials" as const,
  productionWhenWaiting: "do_not_proceed" as const,
  studioCreatedMustBeLabeledStudioCreated: true as const,
  ownerEscalationOnlyWhen: [
    "the customer requests an exception to the normal materials rule",
    "the customer authorizes a path that conflicts with an existing Studio rule",
    "rights/source status is genuinely ambiguous",
    "Machine cannot resolve the matter under existing rules",
  ] as const,
  authorityDoc: "docs/studio-materials-and-substitute-asset-v1-locked.md" as const,
  teachForwardRule:
    "docs/studio-owner-resolve-once-teach-forward-v1-locked.md" as const,
} as const;

export type MaterialsAssetKind =
  | "customer_supplied"
  | "studio_created"
  | "certification_fixture"
  | "test_asset"
  | "invented";

export type MaterialsRulePath =
  | "WAIT_FOR_CUSTOMER_MATERIALS"
  | "PRODUCTION_MAY_PROCEED"
  | "STUDIO_CREATED_VISUAL_PATH"
  | "REFUSE_FIXTURE_SUBSTITUTION"
  | "OWNER_ESCALATION";
