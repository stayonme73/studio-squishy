/**
 * Room 4B — Machine-native photo-led campaign production design.
 * Design + decomposition only. No vendor trial. No purchase. No merge.
 */

export const studioRoom4bMachineNativePhotoLedCampaignProductionDesignV1 = {
  packageId:
    "STUDIO-OPERATING-ROOM-4B-MACHINE-NATIVE-PHOTO-LED-CAMPAIGN-PRODUCTION-DESIGN-1" as const,
  schemaVersion: 1 as const,
  parentPackageId: "STUDIO-OPERATING-ROOM-4B-LAUNCH-TOOLBOX-CERTIFICATION-1" as const,
  room: 4 as const,
  sectionClosed: false as const,
  parkForManager: true as const,
  doNotMerge: true as const,
  doNotStartRoom5: true as const,
  doNotOpenPlacidTrial: true as const,
  doNotBuyCanvaOrAdobe: true as const,
  doNotVendorAuditionYet: true as const,
  doNotGiantRendererRewrite: true as const,

  priorParkTip: "47ba8c0" as const,
  reportDoc:
    "docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/STUDIO-OPERATING-ROOM-4B-MACHINE-NATIVE-PHOTO-LED-CAMPAIGN-PRODUCTION-DESIGN-1-REPORT.md" as const,
  contractsModule: "src/lib/studio-campaign-creative/contracts.ts" as const,

  recommendation: "A_BUILD_MACHINE_NATIVE" as const,
  smallestExternalDependencySet: [] as const,
  providerSocketsDefinedNotWired: [
    "SubjectDetectionProvider",
    "BackgroundRemovalProvider",
    "ImageExpansionProvider",
    "VisualGenerationProvider",
    "CreativeQaProvider",
  ] as const,

  testCustomer: {
    customerName: "Nia Carter",
    businessName: "Rooted & Ready Wellness Studio",
    campaignName: "Fall Reset Launch Campaign",
  } as const,

  customerFacingNames: [
    "Campaign Creative",
    "Social Graphic",
    "Print Collateral",
    "Short Promotional Video",
  ] as const,
} as const;
