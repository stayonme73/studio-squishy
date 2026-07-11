"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import SecureCheckoutGrid from "@/components/payment/SecureCheckoutGrid";
import RouteMapIntakeForm from "@/components/route-map/RouteMapIntakeForm";
import RouteMapJobCard from "@/components/route-map/RouteMapJobCard";
import RouteMapMobileMap from "@/components/route-map/RouteMapMobileMap";
import RouteMapRoutePanel from "@/components/route-map/RouteMapRoutePanel";
import RouteMapLobbyBackdrop from "@/components/route-map/RouteMapLobbyBackdrop";
import RouteMapSquishyPanel from "@/components/route-map/RouteMapSquishyPanel";
import RouteMapWorkspace from "@/components/route-map/RouteMapWorkspace";
import StudioPlanReviewScene from "@/components/studio-plan-review/StudioPlanReviewScene";
import type { ServiceId } from "@/catalog/types";
import {
  getRouteMapJob,
  type RouteMapJob,
  type RouteMapJobId,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import { studioBoard } from "@/config/studio-board";
import {
  addRouteMapServiceToPlan,
  addServiceToRouteMapPlanState,
  buildRouteMapPaymentSummaryFromServices,
  buildRouteMapPaymentSummary,
  isRouteMapPostPublishAddonEligible,
  removeRouteMapServiceFromPlan,
  resolveRouteMapRestoredJourney,
  saveApprovedRouteMapPlan,
  saveRouteMapPlanState,
  saveRouteMapJourneyStep,
  saveRouteMapIntakeDraft,
  selectRouteMapJob,
  submitRouteMapIntake,
} from "@/lib/route-map-campaign";
import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import { CAMPAIGN_SYNC_EVENT, type CampaignSyncStatus } from "@/lib/campaign-store/types";
import { readCampaignSyncStatus } from "@/lib/campaign-store/sync-client";
import { markPaymentReceived, readCurrentCampaignHydrated } from "@/lib/studio-board-campaign";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";
import { resolveSquishyRouteMapMessage } from "@/lib/route-map-squishy";
import type { RouteMapJourneyStep } from "@/config/studio-board";
import {
  buildRouteMapStudioPlanReview,
  swapServiceInPlan,
  type StudioPlanState,
} from "@/studio-plan-review";

export type RouteMapStep = "map" | RouteMapJourneyStep;

function routeMapSyncStatusLabel(status: CampaignSyncStatus | null): string {
  if (status?.state === "syncing") return "Saving...";
  if (status?.state === "error") return "Saved on this device. Sync will retry.";
  return "All changes saved";
}

export default function RouteMapScene() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<RouteMapStep>("map");
  const [roadId, setRoadId] = useState<RouteMapRoadId | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<RouteMapJobId | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<ServiceId[]>([]);
  const [includePostPublishAddon, setIncludePostPublishAddon] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CampaignSyncStatus | null>(null);
  const previousStepRef = useRef<RouteMapStep | null>(null);
  const previousSelectedServiceIdsRef = useRef<readonly ServiceId[] | null>(null);
  const justRestoredRef = useRef(false);
  const hasGreetedRef = useRef(false);

  const selectedJob = useMemo(
    () => (selectedJobId ? getRouteMapJob(selectedJobId) : undefined),
    [selectedJobId],
  );

  const postPublishEligible = selectedJob ? isRouteMapPostPublishAddonEligible(selectedJob.id) : false;

  const paymentSummary = useMemo(
    () =>
      selectedServiceIds.length > 0
        ? buildRouteMapPaymentSummaryFromServices(selectedServiceIds)
        : selectedJob
          ? buildRouteMapPaymentSummary(selectedJob, {
              includePostPublishAddon: postPublishEligible && includePostPublishAddon,
            })
          : undefined,
    [selectedServiceIds, selectedJob, postPublishEligible, includePostPublishAddon],
  );

  const planState: StudioPlanState = useMemo(
    () => ({ selectedServiceIds }),
    [selectedServiceIds],
  );

  const studioPlanModel = useMemo(
    () => buildRouteMapStudioPlanReview(planState),
    [planState],
  );

  const squishyMessage = useMemo(
    () =>
      resolveSquishyRouteMapMessage({
        step,
        previousStep: previousStepRef.current,
        selectedServiceIds,
        previousSelectedServiceIds: previousSelectedServiceIdsRef.current,
        selectedJobId: (selectedJobId as ServiceId | null) ?? null,
        justRestored: justRestoredRef.current,
        hasGreeted: hasGreetedRef.current,
      }),
    [step, selectedServiceIds, selectedJobId],
  );

  const handleSelectRoad = useCallback((id: RouteMapRoadId) => {
    setRoadId(id);
    setSelectedJobId(null);
    setStep("panel");
  }, []);

  const handleSelectJob = useCallback(
    (job: RouteMapJob, activeRoadId?: RouteMapRoadId) => {
      const resolvedRoadId = activeRoadId ?? roadId;
      if (!resolvedRoadId) return;
      setRoadId(resolvedRoadId);
      setSelectedJobId(job.id);
      setIncludePostPublishAddon(false);
      const updated = selectRouteMapJob(job.id, resolvedRoadId);
      setSelectedServiceIds([...(updated?.routeMapContext?.selectedServiceIds ?? selectedServiceIds)]);
      setStep("job");
    },
    [roadId, selectedServiceIds],
  );

  const handleChooseJob = useCallback(() => {
    if (!selectedJob || !roadId) return;
    const updated = addRouteMapServiceToPlan(selectedJob.id, roadId);
    setSelectedServiceIds([...(updated?.routeMapContext?.selectedServiceIds ?? selectedServiceIds)]);
    setStep("studio-plan");
  }, [selectedJob, roadId, selectedServiceIds]);

  const handleBackToMap = useCallback(() => {
    setStep("map");
    setRoadId(null);
    setSelectedJobId(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    if (step === "job" || step === "studio-plan" || step === "checkout" || step === "intake") return;
    handleBackToMap();
  }, [step, handleBackToMap]);

  const handleBackToPanel = useCallback(() => {
    saveRouteMapJourneyStep("panel");
    setStep("panel");
    setSelectedJobId(null);
  }, []);

  const handleBackToStudioPlan = useCallback(() => {
    saveRouteMapJourneyStep("studio-plan");
    setStep("studio-plan");
  }, []);

  const handleReturnToBrowsing = useCallback(() => {
    saveRouteMapJourneyStep("panel");
    setStep(roadId ? "panel" : "map");
  }, [roadId]);

  const handleRemoveFromPlan = useCallback(
    (serviceId: ServiceId) => {
      const updated = removeRouteMapServiceFromPlan(serviceId);
      setSelectedServiceIds([...(updated?.routeMapContext?.selectedServiceIds ?? [])]);
    },
    [],
  );

  const handleSwapInPlan = useCallback(
    (fromId: ServiceId, toId: ServiceId) => {
      const next = swapServiceInPlan(planState, fromId, toId);
      const updated = saveRouteMapPlanState(next);
      setSelectedServiceIds([...(updated?.routeMapContext?.selectedServiceIds ?? next.selectedServiceIds)]);
    },
    [planState],
  );

  const handleAddFromPlan = useCallback(
    (serviceId: ServiceId) => {
      const next = addServiceToRouteMapPlanState(planState, serviceId);
      const updated = saveRouteMapPlanState(next);
      setSelectedServiceIds([...(updated?.routeMapContext?.selectedServiceIds ?? next.selectedServiceIds)]);
    },
    [planState],
  );

  const handleApprovePlan = useCallback(() => {
    if (!studioPlanModel.planValid || selectedServiceIds.length === 0) return;
    const saved = saveApprovedRouteMapPlan(selectedServiceIds);
    if (!saved) return;
    saveRouteMapJourneyStep("checkout");
    setStep("checkout");
  }, [studioPlanModel.planValid, selectedServiceIds]);

  const handlePaymentComplete = useCallback(() => {
    saveRouteMapJourneyStep("intake", {
      includePostPublishAddon: postPublishEligible && includePostPublishAddon,
    });
    setStep("intake");
  }, [postPublishEligible, includePostPublishAddon]);

  const handleIntakeSubmit = useCallback(
    (answers: RouteMapIntakeAnswers) => {
      const updated = submitRouteMapIntake(answers);
      if (!updated) return;
      router.push(`${studioBoard.routes.studioBoard}?record=open`);
    },
    [router],
  );

  const handleIntakeSaveDraft = useCallback(
    (answers: RouteMapIntakeAnswers) => {
      const updated = saveRouteMapIntakeDraft(answers);
      if (!updated) return false;
      router.push(studioBoard.routes.studioBoard);
      return true;
    },
    [router],
  );

  useEffect(() => {
    const campaign = readCurrentCampaignHydrated();
    const restoredJourney = resolveRouteMapRestoredJourney(
      campaign?.routeMapContext,
      searchParams.get("step"),
    );
    if (!restoredJourney) return;

    justRestoredRef.current = true;
    setRoadId(restoredJourney.roadId);
    setSelectedJobId(restoredJourney.jobId);
    setSelectedServiceIds([...restoredJourney.selectedServiceIds]);
    setIncludePostPublishAddon(restoredJourney.includePostPublishAddon);
    setStep(restoredJourney.step);
  }, [searchParams]);

  useEffect(() => {
    if (squishyMessage?.key === "first-arrival") {
      hasGreetedRef.current = true;
    }
    if (squishyMessage?.key === "restored-journey") {
      justRestoredRef.current = false;
    }
    previousStepRef.current = step;
    previousSelectedServiceIdsRef.current = selectedServiceIds;
  }, [step, selectedServiceIds, squishyMessage]);

  useEffect(() => {
    setSyncStatus(readCampaignSyncStatus());

    function handleSyncStatus(event: Event) {
      const detail = event instanceof CustomEvent ? (event.detail as CampaignSyncStatus) : null;
      setSyncStatus(detail ?? readCampaignSyncStatus());
    }

    window.addEventListener(CAMPAIGN_SYNC_EVENT, handleSyncStatus);
    return () => window.removeEventListener(CAMPAIGN_SYNC_EVENT, handleSyncStatus);
  }, []);

  const showOverlay = step !== "map";
  const showPanel = step === "panel" && roadId;
  const showJob = step === "job" && selectedJob;
  const showStudioPlan = step === "studio-plan";
  const showCheckout = step === "checkout" && selectedServiceIds.length > 0 && paymentSummary;
  const showIntake = step === "intake" && selectedJob;

  return (
    <div className={`route-map-page route-map-page--immersive ${utilityPageFontClassName}`}>
      <div className="route-map-scene-body">
        <RouteMapLobbyBackdrop />
        <div
          className={`route-map-world${showOverlay ? " route-map-world--overlay" : ""}${showIntake ? " route-map-world--intake" : ""}`}
        >
          <div
            className="route-map-world__map route-map-world__map--desktop"
            inert={showOverlay ? true : undefined}
          >
            <RouteMapWorkspace
              onSelectRoad={handleSelectRoad}
              showChoosePanel={step === "map"}
            />
          </div>

          <div
            className="route-map-world__map route-map-world__map--mobile"
            inert={showOverlay ? true : undefined}
          >
            <RouteMapMobileMap
              onSelectRoad={handleSelectRoad}
              onSelectRouteStart={handleSelectJob}
              showSelector={step === "map"}
            />
          </div>

          {showOverlay ? (
            <div
              className="route-map-world__scrim"
              onClick={handleClosePanel}
              onKeyDown={(event) => {
                if (event.key === "Escape") handleClosePanel();
              }}
              role="presentation"
            />
          ) : null}

          {showOverlay ? (
            <div className="route-map-save-status" role="status" aria-live="polite">
              {routeMapSyncStatusLabel(syncStatus)}
            </div>
          ) : null}

          {showOverlay ? <RouteMapSquishyPanel message={squishyMessage} /> : null}

          {showPanel ? (
            <RouteMapRoutePanel
              roadId={roadId}
              onSelectJob={handleSelectJob}
              onClose={handleBackToMap}
            />
          ) : null}

          {showJob ? (
            <div className="route-map-world__sheet route-map-world__sheet--job">
              <RouteMapJobCard
                job={selectedJob}
                onChoose={handleChooseJob}
                onBack={handleBackToPanel}
                chooseLabel={
                  selectedServiceIds.includes(selectedJob.id)
                    ? "Already in Studio Plan"
                    : "Add to Studio Plan"
                }
                chooseDisabled={selectedServiceIds.includes(selectedJob.id)}
                variant="overlay"
              />
            </div>
          ) : null}

          {showStudioPlan ? (
            <div className="route-map-world__sheet route-map-world__sheet--checkout">
              <button type="button" className="route-map-back-link" onClick={handleReturnToBrowsing}>
                ← Back to Route Map
              </button>
              <div className="route-map-overlay-workspace route-map-overlay-workspace--checkout">
                <StudioPlanReviewScene
                  model={studioPlanModel}
                  onRemove={handleRemoveFromPlan}
                  onSwap={handleSwapInPlan}
                  onAdd={handleAddFromPlan}
                  onApprove={handleApprovePlan}
                />
              </div>
            </div>
          ) : null}

          {showCheckout ? (
            <div className="route-map-world__sheet route-map-world__sheet--checkout">
              <button type="button" className="route-map-back-link" onClick={handleBackToStudioPlan}>
                ← Back to Studio Plan
              </button>
              <div className="route-map-overlay-workspace route-map-overlay-workspace--checkout">
                <SecureCheckoutGrid
                layout="full"
                planSummary={paymentSummary}
                onBeforePayment={(acknowledgment) => {
                  if (selectedServiceIds.length === 0) return false;
                  return Boolean(saveApprovedRouteMapPlan(selectedServiceIds, acknowledgment));
                }}
                onPaymentComplete={() => {
                  markPaymentReceived();
                  handlePaymentComplete();
                }}
              />
              </div>
            </div>
          ) : null}

          {showIntake ? (
            <div className="route-map-world__sheet route-map-world__sheet--intake">
              <div className="route-map-overlay-workspace route-map-overlay-workspace--intake">
                <RouteMapIntakeForm
                job={selectedJob}
                postPublishAddon={postPublishEligible && includePostPublishAddon}
                onSaveDraft={handleIntakeSaveDraft}
                onSubmit={handleIntakeSubmit}
              />
              </div>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}
