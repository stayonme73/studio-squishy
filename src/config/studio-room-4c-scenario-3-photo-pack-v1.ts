/**
 * Scenario 3 certification photo pack — rights bound to exact file hashes.
 * These images are Studio-generated certification fixtures, not customer-owned
 * photographs. Do not label them CUSTOMER_PROVIDED or CUSTOMER_OWNS.
 */

export const MOSS_THREAD_PHOTO_PACK_DIR =
  "docs/launch/studio-operating-room-4c-multi-service-client-gauntlet-1/scenario-3-moss-and-thread/materials/customer-photo-pack" as const;

export const MOSS_THREAD_PHOTO_PACK_RIGHTS_BASIS =
  "STUDIO_GENERATED_CERTIFICATION_FIXTURE" as const;

export const MOSS_THREAD_CERTIFICATION_PHOTO_PACK = [
  {
    assetId: "moss-thread-product-textile-1",
    filename: "moss-thread-product-textile-1.png",
    sha256:
      "6047959b737c49e01c158bd8e5c61a7e29e5a437617189a01e347112f6dcd4a3",
    width: 1536,
    height: 1024,
    sizeBytes: 2642658,
    fileType: "image/png",
    category: "product" as const,
    intendedUse: "product-led social, video, and print",
  },
  {
    assetId: "moss-thread-product-textile-2",
    filename: "moss-thread-product-textile-2.png",
    sha256:
      "a745d1054eb0f8e6885a08acc080d20fc619a84400ec34ae185a760047f38503",
    width: 1536,
    height: 1024,
    sizeBytes: 2647343,
    fileType: "image/png",
    category: "product" as const,
    intendedUse: "secondary product scene for social, video, and print",
  },
  {
    assetId: "moss-thread-maker-at-work",
    filename: "moss-thread-maker-at-work.png",
    sha256:
      "349cc3898fc862752d1642597875d33dd75e1a8526eb2c586b305498b70f9daf",
    width: 1536,
    height: 1024,
    sizeBytes: 2599112,
    fileType: "image/png",
    category: "maker" as const,
    intendedUse: "maker/story scene for campaign and video",
    likenessType: "SYNTHETIC_FICTIONAL_PERSON_NO_REAL_LIKENESS" as const,
    realPersonConsentRequired: false as const,
    publicFigure: false as const,
  },
  {
    assetId: "moss-thread-studio-interior",
    filename: "moss-thread-studio-interior.png",
    sha256:
      "9009ab60f0850404861e085dd307533e32435bfcf8f9553284e29a5fd88b1945",
    width: 1536,
    height: 1024,
    sizeBytes: 2647451,
    fileType: "image/png",
    category: "studio" as const,
    intendedUse: "location/open-studio scene for campaign, video, and print",
  },
] as const;

export const MOSS_THREAD_PHOTO_PACK_SHARED_RIGHTS = {
  source: MOSS_THREAD_PHOTO_PACK_RIGHTS_BASIS,
  customerOwned: false,
  customerProvided: false,
  ownerApprovedForCertification: true,
  campaignUsePermitted: true,
  cropAndAdaptPermitted: true,
  externalCustomerPhotoPathProven: false,
  realExternalCustomerPhotoRightsCertified: false,
} as const;
