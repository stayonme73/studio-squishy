import { studioAdCreativeOfferDefinitionAndCertV1 as pack } from "@/config/studio-ad-creative-offer-definition-and-cert-v1";
import { soldContractIsolationHolds } from "@/lib/studio-capacity-and-overload-certification/isolation";
import { reasonPromoCampaignSetDeterministic } from "@/lib/studio-design-renderer/promo-reason";
import { validatePromoCampaignSetSpec } from "@/lib/studio-design-renderer/promo-validate";
import { adCreativeFactoryCapabilityMap } from "./capability-map";
import { evaluateAdCreativeClaims } from "./claims";
import { mapleWickIntake, mapleWickPromoTruth } from "./maple-wick";
import { writeAdCreativePackage } from "./package";

export function runAdCreativeV1Cert(repoRoot: string) {
  const started = Date.now();
  const intake = mapleWickIntake();
  const claims = evaluateAdCreativeClaims(intake);
  const first = writeAdCreativePackage({ repoRoot, intake });
  const revision = writeAdCreativePackage({
    repoRoot,
    intake,
    revision: { headline: "Light fall at Maple & Wick" },
  });
  const invented = evaluateAdCreativeClaims({
    ...intake,
    primaryText: "Guaranteed results and the best ROI in town.",
  });
  const truth = mapleWickPromoTruth(repoRoot);
  const spec = reasonPromoCampaignSetDeterministic(truth);
  const graphics = validatePromoCampaignSetSpec(repoRoot, spec, truth);
  const elapsedMs = Date.now() - started;

  return {
    packageId: pack.packageId,
    classification: "B_READY_WITH_EXPLICIT_LIMITS" as const,
    placement: pack.placement,
    claimsOk: claims.ok,
    firstOk: first.ok,
    revisionOk: revision.ok,
    revisedHeadline: revision.ok ? revision.card.headline : "",
    inventedBlocked: !invented.ok,
    graphicsSpecOk: graphics.ok,
    square: spec.assets[0]?.canvas,
    portrait: spec.assets[1]?.canvas,
    isolation: {
      coleRiver: soldContractIsolationHolds(),
      noHarborNameInAdText:
        revision.ok && !revision.card.pasteReady.includes("Harbor"),
      campaignRoot: first.ok ? first.rootRel.includes(intake.campaignId) : false,
    },
    accountAccessRequired: false,
    qualitySkipped: false,
    ownerProductionMinutes: 0,
    elapsedMs,
    capability: adCreativeFactoryCapabilityMap(),
    readyToFoldIntoFourPackage: true,
    foldConditions: [
      "Keep unpublished until the four-package structure is locked",
      "Do not add a live SKU or price from this stamp",
      "Graphics stay on certified promo plates",
      "No video ads, account access, or performance promises",
    ],
  };
}
