"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ProjectSummaryScene from "@/components/project-summary/ProjectSummaryScene";
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
import { buildDiscoveryAnswersHeard } from "@/project-summary";
import {
  addServiceToPlan,
  buildStudioPlanReview,
  initialPlanState,
  removeServiceFromPlan,
  swapServiceInPlan,
  type StudioPlanState,
} from "@/studio-plan-review";
import type { ServiceId } from "@/catalog/types";

/** Assembles Project Summary data and handlers — UI renders ProjectSummaryScene only. */
export default function ProjectSummaryPageClient() {
  const router = useRouter();
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

  function handleRemove(serviceId: ServiceId) {
    setPlanState((current) => removeServiceFromPlan(current, serviceId));
  }

  function handleSwap(fromId: ServiceId, toId: ServiceId) {
    setPlanState((current) => swapServiceInPlan(current, fromId, toId));
  }

  function handleAdd(serviceId: ServiceId) {
    setPlanState((current) => addServiceToPlan(current, serviceId));
  }

  function handleConfirm() {
    const saved = saveApprovedStudioPlan(planState.selectedServiceIds);
    if (!saved) return;
    router.push(studioBoard.routes.studioBoard);
  }

  return (
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
  );
}
