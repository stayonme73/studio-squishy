import { studioReputationCustomerProofOfferDefinitionAndCertV1 as pack } from "@/config/studio-reputation-customer-proof-offer-definition-and-cert-v1";
import { soldContractIsolationHolds } from "@/lib/studio-capacity-and-overload-certification/isolation";
import { assembleReputationProofCopy } from "./copy";
import { reputationProofFactoryCapabilityMap } from "./capability-map";
import { marigoldGroomingIntake } from "./marigold";
import { writeReputationProofPackage } from "./package";
import { evaluateReputationProofRights } from "./rights";

export async function runReputationProofV1Cert(repoRoot: string) {
  const started = Date.now();
  const intake = marigoldGroomingIntake();
  const first = await writeReputationProofPackage({ repoRoot, intake });
  const revisedIntake = marigoldGroomingIntake({ cta: "Share your visit" });
  const revision = await writeReputationProofPackage({
    repoRoot,
    intake: revisedIntake,
  });
  const rightsBlocked = evaluateReputationProofRights(
    marigoldGroomingIntake({ rightsConfirmed: false }),
  );
  const rewritten = evaluateReputationProofRights(
    intake,
    [],
    "They transformed my anxious rescue into a show dog.",
  );
  const invented = evaluateReputationProofRights(intake, [
    "Five-star reviews guaranteed. Sarah said we are the best.",
  ]);
  const elapsedMs = Date.now() - started;

  return {
    packageId: pack.packageId,
    classification: "B_READY_WITH_EXPLICIT_LIMITS" as const,
    fourPackagePlacement: pack.fourPackagePlacement,
    firstOk: first.ok,
    revisionOk: revision.ok,
    revisedCta: revisedIntake.cta,
    rightsBlocked: !rightsBlocked.ok,
    rewriteBlocked: !rewritten.ok,
    inventedBlocked: !invented.ok,
    fetchedReviews: false,
    accountAccessRequired: false,
    videoIncluded: false,
    rankingPromised: false,
    isolation: {
      coleRiver: soldContractIsolationHolds(),
      noHarbor: first.ok && !JSON.stringify(first).includes("Harbor"),
      campaignRoot: first.ok ? first.rootRel.includes(intake.campaignId) : false,
    },
    plates: pack.graphics,
    ownerProductionMinutes: 0,
    vendorUsd: 0,
    elapsedMs,
    capability: reputationProofFactoryCapabilityMap(),
    readyToFoldIntoFourPackage: true,
    foldConditions: [
      "Keep unpublished until the four-package structure is locked",
      "Do not add a live SKU or price from this stamp",
      "Use only customer-supplied reviews with rights confirmation",
      "No account login, review-count promises, or testimonial video",
    ],
  };
}
