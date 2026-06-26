"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import StudioPlanReviewScene from "@/components/studio-plan-review/StudioPlanReviewScene";
import { studioBoard } from "@/config/studio-board";
import { paymentHref } from "@/config/payment";
import { resolveDiscoveryBriefAnswers } from "@/lib/discovery-brief";
import { readDiscoveryAnswers } from "@/lib/business-discovery-session";
import {
  readCurrentCampaignHydrated,
  saveApprovedStudioPlan,
} from "@/lib/studio-board-campaign";
import { recommendFromDiscovery } from "@/recommendation";
import {
  addServiceToPlan,
  buildStudioPlanReview,
  initialPlanState,
  removeServiceFromPlan,
  swapServiceInPlan,
  type StudioPlanState,
} from "@/studio-plan-review";
import type { ServiceId } from "@/catalog/types";

/** Assembles plan review data and handlers — UI renders StudioPlanReviewScene only. */
export default function StudioPlanReviewPageClient() {
  const router = useRouter();
  const campaign = readCurrentCampaignHydrated();
  const briefAnswers = useMemo(
    () => resolveDiscoveryBriefAnswers(campaign?.discoveryAnswers, readDiscoveryAnswers()),
    [campaign?.discoveryAnswers],
  );
  const recommendation = useMemo(
    () => recommendFromDiscovery({ answers: briefAnswers }),
    [briefAnswers],
  );

  const [planState, setPlanState] = useState<StudioPlanState>(() =>
    initialPlanState(recommendation.recommendations.map((entry) => entry.serviceId)),
  );

  const model = useMemo(
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

  function handleApprove() {
    const saved = saveApprovedStudioPlan(planState.selectedServiceIds);
    if (!saved) return;
    const packageId = saved.packageId ?? studioBoard.membership.packageId;
    router.push(`${paymentHref(packageId)}&from=studio-plan-review`);
  }

  return (
    <StudioPlanReviewScene
      model={model}
      onRemove={handleRemove}
      onSwap={handleSwap}
      onAdd={handleAdd}
      onApprove={handleApprove}
    />
  );
}
