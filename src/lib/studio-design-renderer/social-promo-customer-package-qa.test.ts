import { describe, expect, it } from "vitest";

import { reasonPromoGraphicAsset } from "@/lib/studio-design-renderer/promo-reason";
import { PROMO_PORTRAIT_PLATE, PROMO_SQUARE_PLATE } from "@/lib/studio-design-renderer/promo-types";
import type { PromoProjectTruth } from "@/lib/studio-design-renderer/promo-types";

import {
  evaluateSocialPromoCustomerPackage,
  evaluateSquareCampaignComposition,
  type SocialPromoPackageFile,
  type SquareCompositionLayer,
} from "./social-promo-customer-package-qa";

const BODY = "HVAC tune-up and drain clear for homeowners who want plain, steady service.";

function passingFiles(): SocialPromoPackageFile[] {
  const captions = [
    "Post 1: Spring Tune-Up + Drain Clear is $189 at Harbor & Oak Home Services.",
    "Post 2: Book online or call.",
    "Post 3: The offer runs March 10 – April 15, 2026.",
    "Post 4: Spring service you can trust.",
  ].join("\n");
  const order = [
    "Suggested posting order — you post these yourself. This is not a calendar.",
    "1. Post 1",
    "2. Post 2",
    "3. Post 3",
    "4. Post 4",
  ].join("\n");
  return [
    { member: "post-1", byteLength: 20_000 },
    { member: "post-2", byteLength: 20_000 },
    { member: "post-3", byteLength: 20_000 },
    { member: "post-4", byteLength: 20_000 },
    { member: "square", byteLength: 20_000 },
    { member: "portrait", byteLength: 20_000 },
    { member: "captions", byteLength: captions.length, text: captions },
    { member: "order", byteLength: order.length, text: order },
  ];
}

function harborTruth(): PromoProjectTruth {
  return {
    campaignId: "harbor-oak-social-promo-quality-gate",
    jobId: "harbor-oak-social-promo-quality-gate:social_and_promo_graphics",
    dispatchId: "dd:test",
    skuId: "v2-rtu-promotion-graphics",
    fixtureId: "harbor-oak",
    label: "Harbor & Oak",
    outputMode: "customer",
    businessName: "Harbor & Oak Home Services",
    wordmark: "Harbor & Oak",
    descriptor: "Home Services",
    headline: "Spring service you can trust",
    offerName: "Spring Tune-Up + Drain Clear",
    priceDisplay: "$189",
    wasPriceDisplay: "was $249",
    dateWindow: "March 10 – April 15, 2026",
    body: BODY,
    cta: "Book online or call",
    phone: "(804) 555-0142",
    webDisplay: "harborandoak.example/book-tuneup",
    webUrl: "https://harborandoak.example/book-tuneup",
    disclaimer: "",
    brandColors: {
      primary: "#1F3A5F",
      secondary: "#C4A574",
      background: "#F7F4EF",
      text: "#1A1A1A",
      muted: "#5A6570",
    },
    materials: [
      {
        materialId: "logo",
        role: "logo",
        relativePath: "docs/launch/studio-operating-design-social-posts-proof-1/artifacts/v2-rtu-social-posts/materials/harbor-oak-anchor-oak-oval-v1.svg",
        contentSha256: "e5a7876e20a7c79d7746975f3ad790cdd9c6b82bf9ac86c3897a7ad063e9b510",
      },
    ],
    approvedLogoVariantId: "harbor-oak-anchor-oak-oval-v1",
    requiredTextTokens: ["$189"],
    prohibitedClaimPatterns: ["CERTIFICATION FIXTURE"],
    assets: [
      {
        assetId: "campaign-graphic-square",
        authorizedPurpose: "Campaign graphic, square",
        plateId: PROMO_SQUARE_PLATE.plateId,
        canvas: { widthPx: 1024, heightPx: 1024 },
        layoutVariant: "compact_square",
      },
      {
        assetId: "campaign-graphic-portrait",
        authorizedPurpose: "Campaign graphic, portrait",
        plateId: PROMO_PORTRAIT_PLATE.plateId,
        canvas: { widthPx: 1024, heightPx: 1536 },
        layoutVariant: "tall_portrait",
      },
    ],
    liveIntakePerAssetPurposeGap: "Parent intake supplies one offer for both graphics.",
  };
}

const OLD_SQUARE: SquareCompositionLayer[] = [
  { type: "text", role: "offer", y: 360, content: "Spring Tune-Up + Drain Clear", align: "left" },
  { type: "text", role: "price", y: 460, content: "$189 · was $249", align: "left" },
  { type: "text", role: "dates", y: 540, content: "March 10 – April 15, 2026", align: "left" },
  { type: "text", role: "cta", y: 720, content: "Book online or call", align: "left" },
];

describe("Social & Promo combined customer package QA", () => {
  it("rejects the sparse left-aligned square and a caption that leaks internal text", () => {
    const sparse = evaluateSquareCampaignComposition(OLD_SQUARE);
    expect(sparse.ok).toBe(false);
    if (!sparse.ok) expect(sparse.code).toBe("SQUARE_COMPOSITION");

    const leaked = evaluateSocialPromoCustomerPackage({
      files: passingFiles().map((file) =>
        file.member === "captions"
          ? { ...file, text: `${file.text}\nCERTIFICATION FIXTURE` }
          : file,
      ),
      squareLayers: [
        { type: "text", role: "body", y: 560, content: BODY, align: "center" },
        { type: "text", role: "offer", y: 372, content: "Spring Tune-Up + Drain Clear", align: "center" },
        { type: "text", role: "price", y: 448, content: "$189", align: "center" },
      ],
    });
    expect(leaked.ok).toBe(false);
    if (!leaked.ok) expect(leaked.code).toBe("FIXTURE_LEAKAGE");
  });

  it("accepts the centered square card and the eight-file package", () => {
    const square = reasonPromoGraphicAsset(
      harborTruth(),
      harborTruth().assets[0],
    );
    const composition = evaluateSquareCampaignComposition(square.layers);
    expect(composition.ok).toBe(true);
    expect(square.layers.some((layer) => layer.type === "text" && layer.role === "body" && layer.content === BODY)).toBe(true);
    expect(square.layers.some((layer) => layer.type === "text" && layer.role === "offer" && layer.align === "center")).toBe(true);
    const portrait = reasonPromoGraphicAsset(harborTruth(), harborTruth().assets[1]);
    expect(portrait.layoutVariant).toBe("tall_portrait");
    expect(portrait.layers.some((layer) => layer.type === "shape" && layer.role === "accent_bar" || (layer.type === "shape" && layer.x === 0 && layer.width < 40))).toBe(true);

    const packaged = evaluateSocialPromoCustomerPackage({
      files: passingFiles(),
      squareLayers: square.layers,
    });
    expect(packaged.ok).toBe(true);
  });
});
