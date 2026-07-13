"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import RouteMapIntakeForm from "@/components/route-map/RouteMapIntakeForm";
import RouteMapJobCard from "@/components/route-map/RouteMapJobCard";
import RouteMapMobileMap from "@/components/route-map/RouteMapMobileMap";
import RouteMapRoutePanel from "@/components/route-map/RouteMapRoutePanel";
import RouteMapLobbyBackdrop from "@/components/route-map/RouteMapLobbyBackdrop";
import RouteMapSquishyPanel from "@/components/route-map/RouteMapSquishyPanel";
import RouteMapWorkspace from "@/components/route-map/RouteMapWorkspace";
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
  resolveRouteMapRestoredJourney,
  resolveRouteMapSelectedServiceIds,
  saveRouteMapJourneyStep,
  saveRouteMapIntakeDraft,
  selectRouteMapJob,
  selectRouteMapRoad,
  submitRouteMapIntake,
} from "@/lib/route-map-campaign";
import { campaignSaveStatusLabel } from "@/lib/campaign-save-status-label";
import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import { CAMPAIGN_SYNC_EVENT, type CampaignSyncStatus } from "@/lib/campaign-store/types";
import { readCampaignSyncStatus } from "@/lib/campaign-store/sync-client";
import { readCurrentCampaignHydrated } from "@/lib/studio-board-campaign";
import { projectBuilderHref } from "@/config/project-builder-v1";
import { projectRecordArrivalHref } from "@/lib/project-record-arrival";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";
import { resolveSquishyRouteMapMessage } from "@/lib/route-map-squishy";
import type { RouteMapJourneyStep } from "@/config/studio-board";

export type RouteMapStep = "map" | RouteMapJourneyStep;

type IntakeDraftStatus = "unsaved" | "saved" | "error";

function routeMapSyncStatusLabel(
  status: CampaignSyncStatus | null,
  intakeDraftStatus: IntakeDraftStatus | null,
): string {
  if (intakeDraftStatus === "error") return "Save failed";
  if (intakeDraftStatus === "unsaved") return "Unsaved draft";
  if (intakeDraftStatus === "saved") return "Progress saved";
  return campaignSaveStatusLabel(status);
}

export default function RouteMapScene() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<RouteMapStep>("map");
  const [roadId, setRoadId] = useState<RouteMapRoadId | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<RouteMapJobId | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<ServiceId[]>([]);
  const [syncStatus, setSyncStatus] = useState<CampaignSyncStatus | null>(null);
  const [intakeDraftStatus, setIntakeDraftStatus] = useState<IntakeDraftStatus>("unsaved");
  /** True once the current project has been paid — the paid plan is protected from the old pre-payment path. */
  const [isPaidProject, setIsPaidProject] = useState(false);
  const previousStepRef = useRef<RouteMapStep | null>(null);
  const previousSelectedServiceIdsRef = useRef<readonly ServiceId[] | null>(null);
  const justRestoredRef = useRef(false);
  const hasGreetedRef = useRef(false);

  const selectedJob = useMemo(
    () => (selectedJobId ? getRouteMapJob(selectedJobId) : undefined),
    [selectedJobId],
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
        isPaidProject,
      }),
    [step, selectedServiceIds, selectedJobId, isPaidProject],
  );

  const handleSelectRoad = useCallback(
    (id: RouteMapRoadId) => {
      selectRouteMapRoad(id);
      router.push(projectBuilderHref(id));
    },
    [router],
  );

  const handleSelectJob = useCallback(
    (job: RouteMapJob, activeRoadId?: RouteMapRoadId) => {
      const resolvedRoadId = activeRoadId ?? roadId;
      if (!resolvedRoadId) return;
      setRoadId(resolvedRoadId);
      setSelectedJobId(job.id);
      const updated = selectRouteMapJob(job.id, resolvedRoadId);
      setSelectedServiceIds([...(updated?.routeMapContext?.selectedServiceIds ?? selectedServiceIds)]);
      setStep("job");
    },
    [roadId, selectedServiceIds],
  );

  const handleChooseJob = useCallback(() => {
    if (!selectedJob || !roadId) return;
    // Defensive boundary — the paid plan is protected; this control is also disabled in the UI below.
    if (isPaidProject && !selectedServiceIds.includes(selectedJob.id)) return;
    const updated = addRouteMapServiceToPlan(selectedJob.id, roadId);
    setSelectedServiceIds([...(updated?.routeMapContext?.selectedServiceIds ?? selectedServiceIds)]);
    saveRouteMapJourneyStep("studio-plan");
    router.push(`${projectBuilderHref(roadId)}&view=studio-plan`);
  }, [selectedJob, roadId, selectedServiceIds, isPaidProject, router]);

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

  const handleIntakeSubmit = useCallback(
    (answers: RouteMapIntakeAnswers) => {
      const updated = submitRouteMapIntake(answers);
      if (!updated) return;
      router.push(projectRecordArrivalHref(studioBoard.routes.campaignDetails));
    },
    [router],
  );

  const handleIntakeSaveDraft = useCallback((answers: RouteMapIntakeAnswers) => {
    const updated = saveRouteMapIntakeDraft(answers);
    if (!updated) {
      setIntakeDraftStatus("error");
      return false;
    }
    setIntakeDraftStatus("saved");
    return true;
  }, []);

  useEffect(() => {
    const campaign = readCurrentCampaignHydrated();
    if (campaign?.paymentReceivedAt) {
      setIsPaidProject(true);
    }
    const restoredJourney = resolveRouteMapRestoredJourney(
      campaign?.routeMapContext,
      searchParams.get("step"),
    );

    if (restoredJourney) {
      if (
        restoredJourney.step === "panel" ||
        restoredJourney.step === "studio-plan" ||
        restoredJourney.step === "checkout"
      ) {
        const href =
          restoredJourney.step === "studio-plan"
            ? `${projectBuilderHref(restoredJourney.roadId)}&view=studio-plan`
            : restoredJourney.step === "checkout"
              ? "/checkout"
              : projectBuilderHref(restoredJourney.roadId);
        router.replace(href);
        return;
      }

      justRestoredRef.current = true;
      setRoadId(restoredJourney.roadId);
      setSelectedJobId(restoredJourney.jobId);
      setSelectedServiceIds([...restoredJourney.selectedServiceIds]);
      setStep(restoredJourney.step);
      return;
    }

    const ctx = campaign?.routeMapContext;
    if (ctx?.roadId) {
      const persistedSelections = resolveRouteMapSelectedServiceIds(ctx);
      if (persistedSelections) {
        setSelectedServiceIds([...persistedSelections]);
      }
      if (ctx.jobId) {
        setSelectedJobId(ctx.jobId);
        setRoadId(ctx.roadId);
      }
    }

    setStep("map");
  }, [searchParams, router]);

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
              {routeMapSyncStatusLabel(syncStatus, showIntake ? intakeDraftStatus : null)}
            </div>
          ) : null}

          {showOverlay && !showIntake ? <RouteMapSquishyPanel message={squishyMessage} /> : null}

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
                    : isPaidProject
                      ? "Reviewed Separately After Payment"
                      : "Add to Studio Plan"
                }
                chooseDisabled={selectedServiceIds.includes(selectedJob.id) || isPaidProject}
                variant="overlay"
              />
            </div>
          ) : null}

          {showIntake ? (
            <div className="route-map-world__sheet route-map-world__sheet--intake">
              <div className="route-map-overlay-workspace route-map-overlay-workspace--intake">
                <RouteMapIntakeForm
                job={selectedJob}
                onSaveDraft={handleIntakeSaveDraft}
                onSubmit={handleIntakeSubmit}
                onDraftStatusChange={setIntakeDraftStatus}
              />
              </div>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}
