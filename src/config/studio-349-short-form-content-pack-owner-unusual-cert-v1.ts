/**
 * Owner unusual certification for the $349 Short-Form Content Pack.
 * Does not public-switch. Does not start Clip. Does not wire Creative Direction.
 */

export const STUDIO_349_SHORT_FORM_CONTENT_PACK_OWNER_UNUSUAL_CERT_PACKAGE_ID =
  "STUDIO-349-SHORT-FORM-CONTENT-PACK-OWNER-UNUSUAL-CERT-1" as const;

export const studio349ShortFormContentPackOwnerUnusualCertV1 = {
  packageId: STUDIO_349_SHORT_FORM_CONTENT_PACK_OWNER_UNUSUAL_CERT_PACKAGE_ID,
  authorizedAt: "2026-09-28" as const,
  ownerClosedAt: "2026-09-28" as const,
  ownerResult: "PASS" as const,
  classification: "OWNER_CERTIFIED_WITH_EXPLICIT_LIMITS" as const,
  sectionClosed: true as const,
  protectedFactoryState: "FACTORY_READY_WITH_EXPLICIT_LIMITS" as const,
  doNotAlterFactoryUnlessRegression: true as const,
  ownerIsNotFirstLineQa: true as const,
  scoutIsNotRoutineEditor: true as const,
  doNotReopenRoutineCherriesQa: true as const,
  doNotBuildClip: true as const,
  doNotWireCreativeDirectionContract: true as const,
  doNotChangeCatalog: true as const,
  doNotChangePrices: true as const,
  publicCatalogSwitched: false as const,
  nextPackagePrepared:
    "STUDIO-349-SHORT-FORM-CONTENT-PACK-PUBLIC-SWITCH-1" as const,
  nextPackageAuthorizedToStart: false as const,
  publicPriceCentsUnchanged: 34900 as const,
  qualityInspectsRenderedMp4: true as const,
  maxInternalCorrectionLoops: 2 as const,
  doNotManufactureDefects: true as const,
  doNotHandEditAsScout: true as const,
  doNotClassifySellNow: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  stampDir:
    "docs/launch/studio-349-short-form-content-pack-owner-unusual-cert-1" as const,
  ownerHandoffDir:
    "docs/launch/studio-349-short-form-content-pack-owner-unusual-cert-1/owner-handoff" as const,
} as const;
