"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import RouteMapIntakeForm from "@/components/route-map/RouteMapIntakeForm";
import RouteMapJobCard from "@/components/route-map/RouteMapJobCard";
import RouteMapMobileMap from "@/components/route-map/RouteMapMobileMap";
import RouteMapRoutePanel from "@/components/route-map/RouteMapRoutePanel";
import RouteMapLobbyBackdrop from "@/components/route-map/RouteMapLobbyBackdrop";
import RouteMapSquishyPanel from "@/components/route-map/RouteMapSquishyPanel";
import RouteMapWorkspace from "@/components/route-map/RouteMapWorkspace";
import { StudioTablet } from "@/components/studio-tablet";
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
import {
  INTAKE_CONTINUITY_COPY,
  resolveIntakeEntrySurface,
  type IntakeEntrySurface,
} from "@/lib/route-map-intake-continuity";
import { isIntakeComplete, readCurrentCampaignHydrated } from "@/lib/studio-board-campaign";
import {
  completeIntakeHandoff,
  navigateIntakeHandoff,
  probeCustomerSessionSignedIn,
  resolveIntakeHandoffPlan,
} from "@/lib/studio-intake-handoff";
import { projectBuilderHref } from "@/config/project-builder-v1";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";
import { resolveSquishyRouteMapMessage } from "@/lib/route-map-squishy";
import type { RouteMapJourneyStep } from "@/config/studio-board";
import { customerJourneyStepRoute } from "@/config/customer-journey-v1";

export type RouteMapStep = "map" | RouteMapJourneyStep;

type IntakeDraftStatus = "unsaved" | "saved" | "error";

function routeMapSyncStatusLabel(
  status: CampaignSyncStatus | null,
  intakeDraftStatus: IntakeDraftStatus | null,
): string {
  // Host surfaces: never alarm with "Save failed" (local progress remains path of record).
  if (status?.state === "syncing") return "Saving…";
  if (intakeDraftStatus === "unsaved") return "Unsaved draft";
  if (intakeDraftStatus === "saved") return "Progress saved";
  if (intakeDraftStatus === "error") return "";
  return campaignSaveStatusLabel(status);
}

function IntakeGatePanel({
  surface,
}: {
  surface: Exclude<IntakeEntrySurface, { kind: "form" }>;
}) {
  const copy = INTAKE_CONTINUITY_COPY;
  if (surface.kind === "already-submitted") {
    return (
      <section className="route-map-intake-gate" aria-labelledby="route-map-intake-gate-title">
        <p className="route-map-section-lead">Project Intake</p>
        <h2 id="route-map-intake-gate-title" className="route-map-section-title">
          {copy.alreadySubmittedTitle}
        </h2>
        <p className="route-map-section-lead">{copy.alreadySubmittedLead}</p>
        <Link href={studioBoard.routes.studioBoard} className="route-map-primary-btn">
          {copy.alreadySubmittedCta}
        </Link>
      </section>
    );
  }

  if (surface.kind === "missing-payment") {
    return (
      <section className="route-map-intake-gate" aria-labelledby="route-map-intake-gate-title">
        <p className="route-map-section-lead">Project Intake</p>
        <h2 id="route-map-intake-gate-title" className="route-map-section-title">
          {copy.missingPaymentTitle}
        </h2>
        <p className="route-map-section-lead">{copy.missingPaymentLead}</p>
        <Link href={customerJourneyStepRoute("secure-checkout")} className="route-map-primary-btn">
          {copy.missingPaymentCta}
        </Link>
      </section>
    );
  }

  if (surface.kind === "missing-plan") {
    return (
      <section className="route-map-intake-gate" aria-labelledby="route-map-intake-gate-title">
        <p className="route-map-section-lead">Project Intake</p>
        <h2 id="route-map-intake-gate-title" className="route-map-section-title">
          {copy.missingPlanTitle}
        </h2>
        <p className="route-map-section-lead">{copy.missingPlanLead}</p>
        <Link href={surface.recoveryHref} className="route-map-primary-btn">
          {surface.recoveryLabel}
        </Link>
      </section>
    );
  }

  return (
    <section className="route-map-intake-gate" aria-labelledby="route-map-intake-gate-title">
      <p className="route-map-section-lead">Project Intake</p>
      <h2 id="route-map-intake-gate-title" className="route-map-section-title">
        {copy.missingContextTitle}
      </h2>
      <p className="route-map-section-lead">{copy.missingContextLead}</p>
      <Link href={surface.recoveryHref} className="route-map-primary-btn">
        {surface.recoveryLabel}
      </Link>
    </section>
  );
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
  const [intakeGate, setIntakeGate] = useState<Exclude<IntakeEntrySurface, { kind: "form" }> | null>(
    null,
  );
  const [intakeDraftAnswers, setIntakeDraftAnswers] = useState<RouteMapIntakeAnswers | null>(null);
  const [intakeSubmitError, setIntakeSubmitError] = useState<string | null>(null);
  /** Fail-closed signed-out until session probe — Host intake CTA stays truthful. */
  const [intakeHandoffSignedIn, setIntakeHandoffSignedIn] = useState(false);
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
    setIntakeGate(null);
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

  const showIntakeForm = step === "intake" && selectedJob && !intakeGate;

  useEffect(() => {
    if (!showIntakeForm) return;
    let cancelled = false;
    void probeCustomerSessionSignedIn().then((signedIn) => {
      if (!cancelled) setIntakeHandoffSignedIn(signedIn);
    });
    return () => {
      cancelled = true;
    };
  }, [showIntakeForm]);

  const intakeHandoffPlan = useMemo(
    () => resolveIntakeHandoffPlan(intakeHandoffSignedIn),
    [intakeHandoffSignedIn],
  );

  const handleIntakeSubmit = useCallback(
    (answers: RouteMapIntakeAnswers): boolean => {
      setIntakeSubmitError(null);
      const campaign = readCurrentCampaignHydrated();
      if (isIntakeComplete(campaign)) {
        setIntakeGate({ kind: "already-submitted" });
        return false;
      }
      if (!campaign?.paymentReceivedAt) {
        setIntakeGate({ kind: "missing-payment" });
        return false;
      }
      if (!campaign.approvedStudioPlan) {
        const surface = resolveIntakeEntrySurface(campaign, "intake");
        if (surface && surface.kind !== "form") setIntakeGate(surface);
        else {
          setIntakeGate({
            kind: "missing-plan",
            recoveryHref: studioBoard.routes.newCampaign,
            recoveryLabel: "Return to Route Map",
          });
        }
        return false;
      }

      const updated = submitRouteMapIntake(answers);
      if (!updated) {
        setIntakeDraftStatus("error");
        setIntakeSubmitError(INTAKE_CONTINUITY_COPY.submitFailed);
        return false;
      }
      void (async () => {
        const plan = await completeIntakeHandoff();
        setIntakeHandoffSignedIn(plan.auth === "signed-in");
        navigateIntakeHandoff(plan.destination);
      })();
      return true;
    },
    [],
  );

  const handleIntakeSaveDraft = useCallback((answers: RouteMapIntakeAnswers) => {
    const campaign = readCurrentCampaignHydrated();
    if (isIntakeComplete(campaign)) {
      setIntakeGate({ kind: "already-submitted" });
      setIntakeDraftStatus("error");
      return false;
    }
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

    const requestedStep = searchParams.get("step");
    const intakeSurface = resolveIntakeEntrySurface(campaign, requestedStep);
    if (intakeSurface) {
      if (intakeSurface.kind !== "form") {
        setIntakeGate(intakeSurface);
        setIntakeDraftAnswers(null);
        setStep("intake");
        setSelectedJobId(null);
        setRoadId(campaign?.routeMapContext?.roadId ?? null);
        return;
      }

      setIntakeGate(null);
      setIntakeDraftAnswers(intakeSurface.draftAnswers);
      justRestoredRef.current = true;
      setRoadId(intakeSurface.roadId);
      setSelectedJobId(intakeSurface.jobId);
      setSelectedServiceIds([...intakeSurface.selectedServiceIds]);
      setStep("intake");
      setIntakeDraftStatus(intakeSurface.draftAnswers ? "saved" : "unsaved");
      return;
    }

    const restoredJourney = resolveRouteMapRestoredJourney(
      campaign?.routeMapContext,
      requestedStep,
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
      setIntakeGate(null);
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

    setIntakeGate(null);
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
  const showIntakeGate = step === "intake" && Boolean(intakeGate);

  return (
    <div className={`route-map-page route-map-page--immersive ${utilityPageFontClassName}`}>
      <div className="route-map-scene-body">
        <RouteMapLobbyBackdrop />
        <div
          className={`route-map-world${showOverlay ? " route-map-world--overlay" : ""}${
            showIntakeForm || showIntakeGate ? " route-map-world--intake" : ""
          }`}
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

          {showOverlay
            ? (() => {
                const syncLabel = routeMapSyncStatusLabel(
                  syncStatus,
                  showIntakeForm ? intakeDraftStatus : null,
                );
                return syncLabel ? (
                  <div className="route-map-save-status" role="status" aria-live="polite">
                    {syncLabel}
                  </div>
                ) : null;
              })()
            : null}

          {showOverlay && !showIntakeForm && !showIntakeGate ? (
            <RouteMapSquishyPanel message={squishyMessage} />
          ) : null}

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

          {showIntakeGate && intakeGate ? (
            <div className="route-map-world__sheet route-map-world__sheet--intake">
              <div className="route-map-overlay-workspace route-map-overlay-workspace--intake">
                <StudioTablet
                  className="route-map-intake-tablet"
                  stage="intake"
                  stageTitle="Project Intake"
                >
                  <IntakeGatePanel surface={intakeGate} />
                </StudioTablet>
              </div>
            </div>
          ) : null}

          {showIntakeForm ? (
            <div className="route-map-world__sheet route-map-world__sheet--intake">
              <div className="route-map-overlay-workspace route-map-overlay-workspace--intake">
                <StudioTablet
                  className="route-map-intake-tablet"
                  stage="intake"
                  stageTitle="Project Intake"
                >
                  <RouteMapIntakeForm
                    key={`${selectedJob.id}:${intakeDraftAnswers ? "draft" : "empty"}`}
                    job={selectedJob}
                    initialDraftAnswers={intakeDraftAnswers}
                    onSaveDraft={handleIntakeSaveDraft}
                    onSubmit={handleIntakeSubmit}
                    onDraftStatusChange={setIntakeDraftStatus}
                    submitError={intakeSubmitError}
                    submitCtaLabel={intakeHandoffPlan.submitCtaLabel}
                    nextStepBlurb={intakeHandoffPlan.nextStepBlurb}
                  />
                </StudioTablet>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
