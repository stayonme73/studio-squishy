"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import SecureCheckoutGrid from "@/components/payment/SecureCheckoutGrid";
import RouteMapIntakeForm from "@/components/route-map/RouteMapIntakeForm";
import RouteMapJobCard from "@/components/route-map/RouteMapJobCard";
import RouteMapMobileMap from "@/components/route-map/RouteMapMobileMap";
import RouteMapRoutePanel from "@/components/route-map/RouteMapRoutePanel";
import RouteMapLobbyBackdrop from "@/components/route-map/RouteMapLobbyBackdrop";
import RouteMapWorkspace from "@/components/route-map/RouteMapWorkspace";
import {
  getRouteMapJob,
  type RouteMapJob,
  type RouteMapJobId,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import { studioBoard } from "@/config/studio-board";
import {
  buildRouteMapPaymentSummary,
  isRouteMapPostPublishAddonEligible,
  resolveRouteMapRestoredJourney,
  saveApprovedRouteMapPlan,
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
import type { RouteMapJourneyStep } from "@/config/studio-board";

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
  const [includePostPublishAddon, setIncludePostPublishAddon] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CampaignSyncStatus | null>(null);

  const selectedJob = useMemo(
    () => (selectedJobId ? getRouteMapJob(selectedJobId) : undefined),
    [selectedJobId],
  );

  const postPublishEligible = selectedJob ? isRouteMapPostPublishAddonEligible(selectedJob.id) : false;

  const paymentSummary = useMemo(
    () =>
      selectedJob
        ? buildRouteMapPaymentSummary(selectedJob, {
            includePostPublishAddon: postPublishEligible && includePostPublishAddon,
          })
        : undefined,
    [selectedJob, postPublishEligible, includePostPublishAddon],
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
      selectRouteMapJob(job.id, resolvedRoadId);
      setStep("job");
    },
    [roadId],
  );

  const handleChooseJob = useCallback(() => {
    if (!selectedJob) return;
    saveRouteMapJourneyStep("checkout", {
      includePostPublishAddon: postPublishEligible && includePostPublishAddon,
    });
    setStep("checkout");
  }, [selectedJob, postPublishEligible, includePostPublishAddon]);

  const handleBackToMap = useCallback(() => {
    setStep("map");
    setRoadId(null);
    setSelectedJobId(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    if (step === "job" || step === "checkout" || step === "intake") return;
    handleBackToMap();
  }, [step, handleBackToMap]);

  const handleBackToPanel = useCallback(() => {
    saveRouteMapJourneyStep("panel");
    setStep("panel");
    setSelectedJobId(null);
  }, []);

  const handleBackToJob = useCallback(() => {
    saveRouteMapJourneyStep("job", {
      includePostPublishAddon: postPublishEligible && includePostPublishAddon,
    });
    setStep("job");
  }, [postPublishEligible, includePostPublishAddon]);

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

  const handlePostPublishAddonChange = useCallback(
    (checked: boolean) => {
      setIncludePostPublishAddon(checked);
      saveRouteMapJourneyStep("checkout", {
        includePostPublishAddon: postPublishEligible && checked,
      });
    },
    [postPublishEligible],
  );

  useEffect(() => {
    const campaign = readCurrentCampaignHydrated();
    const restoredJourney = resolveRouteMapRestoredJourney(
      campaign?.routeMapContext,
      searchParams.get("step"),
    );
    if (!restoredJourney) return;

    setRoadId(restoredJourney.roadId);
    setSelectedJobId(restoredJourney.jobId);
    setIncludePostPublishAddon(restoredJourney.includePostPublishAddon);
    setStep(restoredJourney.step);
  }, [searchParams]);

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
  const showCheckout = step === "checkout" && selectedJob && paymentSummary;
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
                variant="overlay"
              />
            </div>
          ) : null}

          {showCheckout ? (
            <div className="route-map-world__sheet route-map-world__sheet--checkout">
              <button type="button" className="route-map-back-link" onClick={handleBackToJob}>
                ← Back to job details
              </button>
              <div className="route-map-overlay-workspace route-map-overlay-workspace--checkout">
                <SecureCheckoutGrid
                layout="full"
                planSummary={paymentSummary}
                onBeforePayment={(acknowledgment) => {
                  if (!selectedJobId) return false;
                  return Boolean(
                    saveApprovedRouteMapPlan(selectedJobId, acknowledgment, {
                      includePostPublishAddon: postPublishEligible && includePostPublishAddon,
                    }),
                  );
                }}
                onPaymentComplete={() => {
                  markPaymentReceived();
                  handlePaymentComplete();
                }}
                paymentDecisionAddon={
                  postPublishEligible ? (
                    <label className="route-map-checkout-addon">
                      <input
                        type="checkbox"
                        checked={includePostPublishAddon}
                        onChange={(event) => handlePostPublishAddonChange(event.target.checked)}
                      />
                      <span>
                        Add Post/Publish for Me (+$100) — Studio schedules or publishes on one connected
                        platform
                      </span>
                    </label>
                  ) : null
                }
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
