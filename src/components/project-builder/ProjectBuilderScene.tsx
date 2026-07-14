"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import ProjectBuilderDeliverableTile from "@/components/project-builder/ProjectBuilderDeliverableTile";
import ProjectBuilderServiceDrawer from "@/components/project-builder/ProjectBuilderServiceDrawer";
import ProjectBuilderSquishyCompanion from "@/components/project-builder/ProjectBuilderSquishyCompanion";
import ProjectBuilderStudioPlanSummary from "@/components/project-builder/ProjectBuilderStudioPlanSummary";
import ProjectBuilderSummaryRail from "@/components/project-builder/ProjectBuilderSummaryRail";
import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
import type { ServiceId } from "@/catalog/types";
import { PROJECT_BUILDER_V1, PROJECT_BUILDER_CONVERSATION_DEMO, projectBuilderHref } from "@/config/project-builder-v1";
import {
  getJobsForRoad,
  getRouteMapJob,
  getRouteMapRoad,
  type RouteMapJob,
  type RouteMapJobId,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import { CAMPAIGN_SYNC_EVENT, type CampaignSyncStatus } from "@/lib/campaign-store/types";
import { campaignSaveStatusLabel } from "@/lib/campaign-save-status-label";
import { readCampaignSyncStatus } from "@/lib/campaign-store/sync-client";
import {
  addRouteMapServiceToPlan,
  buildRouteMapPaymentSummaryFromServices,
  removeRouteMapServiceFromPlan,
  releaseRouteMapForMapView,
  resolveRouteMapRestoredJourney,
  saveApprovedRouteMapPlan,
  saveRouteMapJourneyStep,
  selectRouteMapRoad,
} from "@/lib/route-map-campaign";
import { buildProjectBuilderStudioPlanSummary } from "@/lib/project-builder-studio-plan-summary";
import { readCurrentCampaignHydrated } from "@/lib/studio-board-campaign";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

type BuilderView = "select" | "studio-plan";

const ROAD_IDS = ["i75", "i20", "update", "random-exit"] as const;

function isSelectableRoadId(value: string | null): value is RouteMapRoadId {
  return value !== null && (ROAD_IDS as readonly string[]).includes(value);
}

function routeMapSyncStatusLabel(status: CampaignSyncStatus | null): string {
  return campaignSaveStatusLabel(status);
}

function routeMarkerLabel(roadId: RouteMapRoadId): string {
  const road = getRouteMapRoad(roadId);
  if (!road) return roadId;
  return `${road.highwayLabel} · ${road.customerLabel}`;
}

export default function ProjectBuilderScene() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roadId, setRoadId] = useState<RouteMapRoadId | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<ServiceId[]>([]);
  const [view, setView] = useState<BuilderView>("select");
  const [detailJobId, setDetailJobId] = useState<RouteMapJob["id"] | null>(null);
  const drawerTriggerRef = useRef<HTMLElement | null>(null);
  const [syncStatus, setSyncStatus] = useState<CampaignSyncStatus | null>(null);
  const [isPaidProject, setIsPaidProject] = useState(false);

  const jobs = useMemo(() => (roadId ? getJobsForRoad(roadId) : []), [roadId]);
  const road = roadId ? getRouteMapRoad(roadId) : undefined;
  const detailJob = useMemo(() => {
    if (!detailJobId) return null;
    return jobs.find((job) => job.id === detailJobId) ?? getRouteMapJob(detailJobId) ?? null;
  }, [jobs, detailJobId]);

  const paymentSummary = useMemo(
    () =>
      selectedServiceIds.length > 0
        ? buildRouteMapPaymentSummaryFromServices(selectedServiceIds, roadId ?? undefined)
        : undefined,
    [selectedServiceIds, roadId],
  );

  const projectPlanSummary = useMemo(
    () => buildProjectBuilderStudioPlanSummary(selectedServiceIds, roadId ?? "i75"),
    [selectedServiceIds, roadId],
  );

  const canReviewStudioPlan = projectPlanSummary.canContinue;

  const totalDisplay = paymentSummary?.amountDueTodayDisplay ?? "$0";

  useEffect(() => {
    const campaign = readCurrentCampaignHydrated();
    if (campaign?.paymentReceivedAt) {
      setIsPaidProject(true);
    }

    const requestedRoad = searchParams.get("road");
    const restoredJourney = resolveRouteMapRestoredJourney(campaign?.routeMapContext, null);
    const resolvedRoadId = isSelectableRoadId(requestedRoad)
      ? requestedRoad
      : restoredJourney?.roadId ?? campaign?.routeMapContext?.roadId ?? null;

    if (!isSelectableRoadId(resolvedRoadId)) {
      router.replace("/route-map");
      return;
    }

    if (requestedRoad !== resolvedRoadId) {
      selectRouteMapRoad(resolvedRoadId);
    } else if (!campaign?.routeMapContext || campaign.routeMapContext.roadId !== resolvedRoadId) {
      selectRouteMapRoad(resolvedRoadId);
    }

    setRoadId(resolvedRoadId);
    const restoredSelected =
      restoredJourney?.selectedServiceIds ??
      campaign?.routeMapContext?.selectedServiceIds ??
      [];
    setSelectedServiceIds([...restoredSelected]);

    const requestedView = searchParams.get("view");
    if (requestedView === "studio-plan") {
      setView("studio-plan");
    }
  }, [router, searchParams]);

  useEffect(() => {
    setSyncStatus(readCampaignSyncStatus());

    function handleSyncStatus(event: Event) {
      const detail = event instanceof CustomEvent ? (event.detail as CampaignSyncStatus) : null;
      setSyncStatus(detail ?? readCampaignSyncStatus());
    }

    window.addEventListener(CAMPAIGN_SYNC_EVENT, handleSyncStatus);
    return () => window.removeEventListener(CAMPAIGN_SYNC_EVENT, handleSyncStatus);
  }, []);

  const handleAddJob = useCallback(
    (job: RouteMapJob) => {
      if (!roadId || isPaidProject) return;
      const updated = addRouteMapServiceToPlan(job.id, roadId);
      setSelectedServiceIds([...(updated?.routeMapContext?.selectedServiceIds ?? selectedServiceIds)]);
    },
    [roadId, selectedServiceIds, isPaidProject],
  );

  const handleRemoveJob = useCallback((job: RouteMapJob) => {
    const updated = removeRouteMapServiceFromPlan(job.id as ServiceId);
    setSelectedServiceIds([...(updated?.routeMapContext?.selectedServiceIds ?? [])]);
  }, []);

  const handleLearnMore = useCallback((job: RouteMapJob) => {
    drawerTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDetailJobId(job.id);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDetailJobId(null);
  }, []);

  const handleReviewStudioPlan = useCallback(() => {
    if (!canReviewStudioPlan || selectedServiceIds.length === 0) return;
    handleCloseDrawer();
    saveRouteMapJourneyStep("studio-plan");
    setView("studio-plan");
    if (roadId) {
      router.replace(`${projectBuilderHref(roadId)}&view=studio-plan`);
    }
  }, [canReviewStudioPlan, selectedServiceIds.length, roadId, router, handleCloseDrawer]);

  const handleBackToDeliverables = useCallback(() => {
    saveRouteMapJourneyStep("panel");
    setView("select");
    if (roadId) {
      router.replace(projectBuilderHref(roadId));
    }
  }, [roadId, router]);

  const handleViewScope = useCallback((jobId: RouteMapJobId) => {
    drawerTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDetailJobId(jobId);
  }, []);

  const handleContinueToCheckout = useCallback(() => {
    if (!canReviewStudioPlan || selectedServiceIds.length === 0) return;
    saveApprovedRouteMapPlan(selectedServiceIds);
    saveRouteMapJourneyStep("checkout");
    router.push("/checkout");
  }, [canReviewStudioPlan, selectedServiceIds, router]);

  if (!roadId || !road) {
    return (
      <div className={`pb-scene ${utilityPageFontClassName}`} aria-busy="true">
        <StudioUtilityBackdrop placement="viewport" />
      </div>
    );
  }

  return (
    <div className={`pb-scene pb-scene--studio-visible${detailJob ? " pb-scene--drawer-open" : ""} ${utilityPageFontClassName}`}>
      <StudioUtilityBackdrop placement="viewport" />
      <div className="pb-scene__content">
        <div className="pb-layout">
          <div className="pb-layout__main">
            <div className="pb-sticky-header">
              <header className="pb-header">
                <div className="pb-header__body">
                  <div className="pb-header__top">
                    <Link
                      href="/route-map"
                      className="pb-header__back"
                      onClick={() => releaseRouteMapForMapView()}
                    >
                      {PROJECT_BUILDER_V1.backToRouteMapLabel}
                    </Link>
                    <p className="pb-header__sync" role="status" aria-live="polite">
                      {routeMapSyncStatusLabel(syncStatus)}
                    </p>
                  </div>

                  <div className="pb-header__workspace">
                    <div className="pb-header__intro">
                      <p className="pb-header__eyebrow">{PROJECT_BUILDER_V1.routeContextEyebrow}</p>
                      <p className="pb-header__route">{routeMarkerLabel(roadId)}</p>
                      <h1 className="pb-header__title">{PROJECT_BUILDER_V1.pageTitle}</h1>
                      <p className="pb-header__lead">{PROJECT_BUILDER_V1.pageLead}</p>
                    </div>

                    <ProjectBuilderSummaryRail
                      selectedCount={selectedServiceIds.length}
                      totalDisplay={totalDisplay}
                      canReview={canReviewStudioPlan}
                      onReview={handleReviewStudioPlan}
                    />
                  </div>
                </div>
              </header>

              {view === "select" ? (
                <h2 id="pb-deliverables-title" className="pb-deliverables__title">
                  {PROJECT_BUILDER_V1.deliverablesHeading}
                </h2>
              ) : null}
            </div>

            <div className="pb-layout__work">
            {view === "select" ? (
              <section className="pb-deliverables" aria-labelledby="pb-deliverables-title">
                <div className="pb-deliverables__grid">
                  {jobs.map((job) => (
                    <ProjectBuilderDeliverableTile
                      key={job.id}
                      job={job}
                      roadId={roadId}
                      selected={selectedServiceIds.includes(job.id as ServiceId)}
                      addDisabled={isPaidProject}
                      onOpenDetails={() => handleLearnMore(job)}
                      onAdd={() => handleAddJob(job)}
                      onRemove={() => handleRemoveJob(job)}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <section className="pb-studio-plan" aria-labelledby="pb-studio-plan-title">
                <div className="pb-studio-plan__header pb-plan-summary__card">
                  <h2 id="pb-studio-plan-title" className="pb-studio-plan__title">
                    {PROJECT_BUILDER_V1.studioPlanHeading}
                  </h2>
                  <p className="pb-studio-plan__intro">{PROJECT_BUILDER_V1.studioPlanIntro}</p>
                </div>
                <ProjectBuilderStudioPlanSummary
                  model={projectPlanSummary}
                  onEditProject={handleBackToDeliverables}
                  onContinueToCheckout={handleContinueToCheckout}
                  onViewScope={handleViewScope}
                />
                {PROJECT_BUILDER_V1.checkoutNotLiveNote ? (
                  <p className="pb-studio-plan__checkout-note pb-plan-summary__card">
                    {PROJECT_BUILDER_V1.checkoutNotLiveNote}
                  </p>
                ) : null}
              </section>
            )}

            </div>
          </div>

          <ProjectBuilderSquishyCompanion turns={PROJECT_BUILDER_CONVERSATION_DEMO} />
        </div>
      </div>

      {detailJob ? (
        <ProjectBuilderServiceDrawer
          job={detailJob}
          roadId={roadId}
          selected={selectedServiceIds.includes(detailJob.id as ServiceId)}
          addDisabled={isPaidProject}
          returnFocusRef={drawerTriggerRef}
          onClose={handleCloseDrawer}
          onAdd={() => handleAddJob(detailJob)}
          onRemove={() => handleRemoveJob(detailJob)}
        />
      ) : null}
    </div>
  );
}
