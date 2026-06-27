"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import ProjectSummaryScene from "@/components/project-summary/ProjectSummaryScene";
import ServiceGuidePanel from "@/components/service-guide/ServiceGuidePanel";
import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
import { studioBoard, type ApprovalAcknowledgment } from "@/config/studio-board";
import { resolveDiscoveryBrief } from "@/lib/discovery-brief";
import { readDiscoveryAnswers } from "@/lib/business-discovery-session";
import { runDiscoveryRecommendation } from "@/lib/run-discovery-recommendation";
import {
  readCurrentCampaignHydrated,
  saveApprovedStudioPlan,
} from "@/lib/studio-board-campaign";
import { buildDiscoveryAnswersHeard, PROJECT_SUMMARY_LABELS } from "@/project-summary";
import {
  addServiceToPlan,
  buildStudioPlanReview,
  initialPlanState,
  removeServiceFromPlan,
  swapServiceInPlan,
  type StudioPlanState,
} from "@/studio-plan-review";
import { getRecommendedServiceIds } from "@/recommendation";
import type { DiscoveryBrief } from "@/recommendation/types";
import type { ServiceId } from "@/catalog/types";
import { buildServiceGuide } from "@/service-guide";

function resolveInitialPlanState(
  recommendedServiceIds: readonly ServiceId[],
  approvedSelectedIds: readonly ServiceId[] | undefined,
): StudioPlanState {
  if (approvedSelectedIds?.length) {
    return { selectedServiceIds: [...approvedSelectedIds] };
  }
  return initialPlanState(recommendedServiceIds);
}

/** Project Summary — single wide workspace with inline Secure Checkout. */
export default function ProjectSummaryWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [brief, setBrief] = useState<DiscoveryBrief>({ answers: {} });

  useLayoutEffect(() => {
    const campaign = readCurrentCampaignHydrated();
    const sessionAnswers = readDiscoveryAnswers();
    const resolvedBrief = resolveDiscoveryBrief(campaign?.discoveryAnswers, sessionAnswers);
    setBrief(resolvedBrief);
    const { recommendation } = runDiscoveryRecommendation({
      ...sessionAnswers,
      ...resolvedBrief.answers,
    });
    const approved = campaign?.approvedStudioPlan;
    const approvedIds =
      approved?.selectedServiceIds ??
      (approved
        ? [...approved.includedServiceIds, ...approved.additionalServiceIds]
        : undefined);
    setPlanState(
      resolveInitialPlanState(getRecommendedServiceIds(recommendation), approvedIds),
    );
  }, []);

  useEffect(() => {
    if (searchParams.get("phase") === "checkout") {
      router.replace(studioBoard.routes.projectSummary, { scroll: false });
    }
  }, [router, searchParams]);

  const pipeline = useMemo(
    () => runDiscoveryRecommendation({ ...brief.answers }),
    [brief],
  );
  const { recommendation, summary } = pipeline;
  const heard = useMemo(() => buildDiscoveryAnswersHeard(brief.answers), [brief.answers]);

  const [planState, setPlanState] = useState<StudioPlanState>(() => initialPlanState([]));
  const [serviceGuideOpen, setServiceGuideOpen] = useState(false);
  const [activeGuideServiceId, setActiveGuideServiceId] = useState<ServiceId | null>(null);

  const activeGuide = useMemo(
    () => (activeGuideServiceId ? buildServiceGuide(activeGuideServiceId) : null),
    [activeGuideServiceId],
  );

  function handleOpenServiceGuide(serviceId: ServiceId) {
    setActiveGuideServiceId(serviceId);
    setServiceGuideOpen(true);
  }

  function handleCloseServiceGuide() {
    setServiceGuideOpen(false);
  }

  function handleViewPlanDetails() {
    document.getElementById("ps-changes-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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

  function handleSavePlanBeforePayment(acknowledgment: ApprovalAcknowledgment): boolean {
    if (!plan.planValid) return false;
    return saveApprovedStudioPlan(planState.selectedServiceIds, acknowledgment) !== null;
  }

  return (
    <div className="studio-utility-scene studio-utility-scene--header-band">
      <div className="studio-utility-header-band project-summary-header-band">
        <UtilityPageHeader
          backHref={studioBoard.routes.projectDiscovery}
          activeNav="studio-board"
          title={PROJECT_SUMMARY_LABELS.pageTitle}
          lead={PROJECT_SUMMARY_LABELS.pageLead}
          backLabel={PROJECT_SUMMARY_LABELS.backLabel}
          backVariant="link"
          helpLabel={PROJECT_SUMMARY_LABELS.helpCenterLabel}
          helpCenterFrom="studio-board"
          layout="orientation"
        />
      </div>
      <div className="studio-utility-scene__body">
        <StudioUtilityBackdrop placement="below-header" />
        <div className="studio-utility-scene__content">
          <UtilityPageFrame navId="studio-board">
            <div className="utility-page project-summary-page" aria-label={PROJECT_SUMMARY_LABELS.pageTitle}>
              <ProjectSummaryScene
                heard={heard}
                summary={summary}
                plan={plan}
                packageId={packageId}
                editDiscoveryHref={studioBoard.routes.projectDiscovery}
                onRemove={handleRemove}
                onSwap={handleSwap}
                onAdd={handleAdd}
                onSavePlanBeforePayment={handleSavePlanBeforePayment}
                onOpenServiceGuide={handleOpenServiceGuide}
                onViewPlanDetails={handleViewPlanDetails}
              />
            </div>
          </UtilityPageFrame>
        </div>
      </div>
      <ServiceGuidePanel
        open={serviceGuideOpen}
        guide={activeGuide}
        onClose={handleCloseServiceGuide}
      />
    </div>
  );
}
