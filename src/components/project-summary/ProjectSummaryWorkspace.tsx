"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import ProjectSummaryScene from "@/components/project-summary/ProjectSummaryScene";
import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
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

/** Project Summary — single wide workspace with inline Secure Checkout. */
export default function ProjectSummaryWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    if (searchParams.get("phase") === "checkout") {
      router.replace(studioBoard.routes.projectSummary, { scroll: false });
    }
  }, [router, searchParams]);

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

  function handleSavePlanBeforePayment(): boolean {
    if (!plan.canApprove) return false;
    return saveApprovedStudioPlan(planState.selectedServiceIds) !== null;
  }

  return (
    <div className="studio-utility-scene studio-utility-scene--header-band">
      <div className="studio-utility-header-band project-summary-header-band">
        <UtilityPageHeader
          backHref={studioBoard.routes.projectDiscovery}
          activeNav="studio-board"
          title={PROJECT_SUMMARY_LABELS.pageTitle}
          leadLines={PROJECT_SUMMARY_LABELS.pageLeadLines}
          helpCenterFrom="studio-board"
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
              />
            </div>
          </UtilityPageFrame>
        </div>
      </div>
    </div>
  );
}
