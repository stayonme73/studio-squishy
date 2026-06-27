"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import ProjectSummaryScene from "@/components/project-summary/ProjectSummaryScene";
import { SecureCheckoutGrid } from "@/components/payment/PaymentCheckoutScene";
import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
import { payment } from "@/config/payment";
import { studioBoard } from "@/config/studio-board";
import { buildDiscoverySummary } from "@/discovery-summary";
import { resolveDiscoveryBriefAnswers } from "@/lib/discovery-brief";
import { readDiscoveryAnswers } from "@/lib/business-discovery-session";
import {
  readCurrentCampaignHydrated,
  saveApprovedStudioPlan,
} from "@/lib/studio-board-campaign";
import { recommendFromDiscovery } from "@/recommendation";
import type { DiscoveryBriefAnswers } from "@/recommendation/types";
import { buildDiscoveryAnswersHeard, PROJECT_SUMMARY_LABELS } from "@/project-summary";
import {
  addServiceToPlan,
  buildStudioPlanReview,
  initialPlanState,
  removeServiceFromPlan,
  swapServiceInPlan,
  type StudioPlanState,
} from "@/studio-plan-review";
import type { ServiceId } from "@/catalog/types";

export type ProjectSummaryPhase = "summary" | "checkout";

/** Project Summary workspace — summary phase then inline Secure Checkout after approve. */
export default function ProjectSummaryWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<ProjectSummaryPhase>(() =>
    searchParams.get("phase") === "checkout" ? "checkout" : "summary",
  );
  const [briefAnswers, setBriefAnswers] = useState<DiscoveryBriefAnswers>({});

  useLayoutEffect(() => {
    const campaign = readCurrentCampaignHydrated();
    const answers = resolveDiscoveryBriefAnswers(
      campaign?.discoveryAnswers,
      readDiscoveryAnswers(),
    );
    setBriefAnswers(answers);
    const recommendation = recommendFromDiscovery({ answers });
    setPlanState(
      initialPlanState(recommendation.recommendations.map((entry) => entry.serviceId)),
    );
  }, []);

  useEffect(() => {
    setPhase(searchParams.get("phase") === "checkout" ? "checkout" : "summary");
  }, [searchParams]);

  const heard = useMemo(() => buildDiscoveryAnswersHeard(briefAnswers), [briefAnswers]);
  const recommendation = useMemo(
    () => recommendFromDiscovery({ answers: briefAnswers }),
    [briefAnswers],
  );
  const summary = useMemo(() => buildDiscoverySummary(recommendation), [recommendation]);

  const [planState, setPlanState] = useState<StudioPlanState>(() => initialPlanState([]));

  const plan = useMemo(
    () => buildStudioPlanReview(recommendation, planState),
    [recommendation, planState],
  );

  const packageId = readCurrentCampaignHydrated()?.packageId;

  function handleRemove(serviceId: ServiceId) {
    setPlanState((current) => removeServiceFromPlan(current, serviceId));
  }

  function handleSwap(fromId: ServiceId, toId: ServiceId) {
    setPlanState((current) => swapServiceInPlan(current, fromId, toId));
  }

  function handleAdd(serviceId: ServiceId) {
    setPlanState((current) => addServiceToPlan(current, serviceId));
  }

  function enterCheckoutPhase() {
    setPhase("checkout");
    router.replace(`${studioBoard.routes.projectSummary}?phase=checkout`, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleConfirm() {
    const saved = saveApprovedStudioPlan(planState.selectedServiceIds);
    if (!saved) return;
    enterCheckoutPhase();
  }

  const isCheckout = phase === "checkout";
  const headerTitle = isCheckout ? payment.pageTitle : PROJECT_SUMMARY_LABELS.pageTitle;
  const headerLeadLines = isCheckout ? payment.pageLeadLines : PROJECT_SUMMARY_LABELS.pageLeadLines;
  const backHref = isCheckout ? studioBoard.routes.projectSummary : studioBoard.routes.projectDiscovery;
  const activeNav = isCheckout ? ("payment" as const) : ("studio-board" as const);
  const pageLabel = isCheckout ? payment.pageTitle : PROJECT_SUMMARY_LABELS.pageTitle;

  return (
    <>
      <div className="studio-utility-scene studio-utility-scene--header-band">
        <div
          className={`studio-utility-header-band ${
            isCheckout ? "payment-header-band" : "project-summary-header-band"
          }`}
        >
          <UtilityPageHeader
            backHref={backHref}
            activeNav={activeNav}
            title={headerTitle}
            leadLines={headerLeadLines}
            helpCenterFrom={isCheckout ? "payment" : "studio-board"}
          />
        </div>
        <div className="studio-utility-scene__body">
          <StudioUtilityBackdrop placement="below-header" />
          <div className="studio-utility-scene__content">
            <UtilityPageFrame navId={activeNav}>
              <div
                className={`utility-page project-summary-page${
                  isCheckout ? " project-summary-page--checkout payment-page" : ""
                }`}
                aria-label={pageLabel}
              >
                {isCheckout ? (
                  <div className="ps-checkout-panel" aria-label={payment.pageTitle}>
                    <SecureCheckoutGrid packageId={packageId} />
                  </div>
                ) : (
                  <ProjectSummaryScene
                    heard={heard}
                    summary={summary}
                    plan={plan}
                    editDiscoveryHref={studioBoard.routes.projectDiscovery}
                    onRemove={handleRemove}
                    onSwap={handleSwap}
                    onAdd={handleAdd}
                    onConfirm={handleConfirm}
                  />
                )}
              </div>
            </UtilityPageFrame>
          </div>
        </div>
      </div>
    </>
  );
}
