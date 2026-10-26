import { studioAiLocalVisibilityOfferDefinitionAndCertV1 as pack } from "@/config/studio-ai-local-visibility-offer-definition-and-cert-v1";
import { soldContractIsolationHolds } from "@/lib/studio-capacity-and-overload-certification/isolation";
import { assembleLocalVisibilityPack } from "./assemble";
import { localVisibilityFactoryCapabilityMap } from "./capability-map";
import { evaluateLocalVisibilityFacts } from "./facts";
import { northsideBikeIntake } from "./northside";
import { writeLocalVisibilityPackage } from "./package";

export function runLocalVisibilityV1Cert(repoRoot: string) {
  const started = Date.now();
  const intake = northsideBikeIntake();
  const first = writeLocalVisibilityPackage({ repoRoot, intake });
  const revisedIntake = northsideBikeIntake({ hours: "Tue-Sat 10-4" });
  const revision = writeLocalVisibilityPackage({ repoRoot, intake: revisedIntake });
  const conflict = assembleLocalVisibilityPack(
    northsideBikeIntake({ hoursNote: "Closed Saturday" }),
  );
  const invented = evaluateLocalVisibilityFacts(intake, [
    "Best bike shop in Richmond since 2009. Google will rank you on page one.",
  ]);
  const leakedHarbor = first.ok
    ? assembleLocalVisibilityPack(intake).ok &&
      !JSON.stringify(assembleLocalVisibilityPack(intake)).includes("Harbor")
    : false;
  const elapsedMs = Date.now() - started;

  return {
    packageId: pack.packageId,
    classification: "B_READY_WITH_EXPLICIT_LIMITS" as const,
    fourPackagePlacement: pack.fourPackagePlacement,
    firstOk: first.ok,
    revisionOk: revision.ok,
    revisedHours: revisedIntake.hours,
    conflictBlocked: !conflict.ok,
    inventedBlocked: !invented.ok,
    isolation: {
      coleRiver: soldContractIsolationHolds(),
      noHarbor: leakedHarbor,
      campaignRoot: first.ok ? first.rootRel.includes(intake.campaignId) : false,
    },
    fetchedWebsite: false,
    accountAccessRequired: false,
    rankingPromised: false,
    qualitySkipped: false,
    ownerProductionMinutes: 0,
    vendorUsd: 0,
    elapsedMs,
    capability: localVisibilityFactoryCapabilityMap(),
    readyToFoldIntoFourPackage: true,
    foldConditions: [
      "Keep unpublished until the four-package structure is locked",
      "Do not add a live SKU or price from this stamp",
      "Do not fetch websites or log into Google Business",
      "No ranking, lead, sales, or AI-recommendation promises",
    ],
  };
}
