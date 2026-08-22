/**
 * Gate X — versioned customer per-file rights attestation copy.
 * Bump `version` when customer-facing certification language changes.
 */

export const studioCustomerContentRightsAttestationV1 = {
  version: "gate-x-rights-attestation-v1-2026-08-22-honest-hold" as const,
  disclaimer:
    "These confirmations record your representations for this file. They do not guarantee legal ownership. The Studio uses them to control production use for your project." as const,
  uploadAuthority:
    "I own this file, or I have permission to provide it for this project." as const,
  commercialUse:
    "The Studio may use this file in commercial work for this project." as const,
  cropAdapt:
    "The Studio may crop, resize, or adapt this file for this project." as const,
  recognizablePeopleQuestion: "Does this file show recognizable people?" as const,
  likenessConsent:
    "Everyone shown has given appropriate consent for commercial use in this project." as const,
  likenessConsentUnresolvedHold:
    "If you cannot confirm this, you may still send the file. The Studio will hold it out of production until likeness consent is confirmed." as const,
  thirdPartyMaterialQuestion:
    "Does this file include third-party logos, artwork, trademarks, photography, or other protected material?" as const,
  thirdPartyRights:
    "I have authority for commercial use of that third-party material in this project." as const,
  thirdPartyRightsUnresolvedHold:
    "If you cannot confirm this, you may still send the file. The Studio will hold it out of production until authority is confirmed." as const,
  validation: {
    uploadAuthorityRequired:
      "Please confirm you own this file or have permission to provide it before sending." as const,
    commercialUseRequired:
      "Please confirm whether The Studio may use this file in commercial work for this project." as const,
    commercialUseDenied:
      "Commercial use was not authorized. This file cannot be cleared for production as submitted." as const,
    cropAdaptRequired:
      "Please confirm whether The Studio may crop, resize, or adapt this file." as const,
    recognizablePeopleRequired:
      "Please answer whether recognizable people appear in this file." as const,
    likenessConsentRequired:
      "Please confirm likeness consent when recognizable people appear in this file." as const,
    thirdPartyMaterialRequired:
      "Please answer whether third-party protected material appears in this file." as const,
    thirdPartyRightsRequired:
      "Please confirm third-party commercial-use authority when protected material appears in this file." as const,
  },
} as const;
