"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  saveApprovedRouteMapPlan,
  saveRouteMapIntakeDraft,
  selectRouteMapJob,
  submitRouteMapIntake,
} from "@/lib/route-map-campaign";
import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import { markPaymentReceived } from "@/lib/studio-board-campaign";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

export type RouteMapStep = "map" | "panel" | "job" | "checkout" | "intake";

export default function RouteMapScene() {
  const router = useRouter();
  const [step, setStep] = useState<RouteMapStep>("map");
  const [roadId, setRoadId] = useState<RouteMapRoadId | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<RouteMapJobId | null>(null);
  const [includePostPublishAddon, setIncludePostPublishAddon] = useState(false);

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
    setStep("checkout");
  }, [selectedJob]);

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
    setStep("panel");
    setSelectedJobId(null);
  }, []);

  const handleBackToJob = useCallback(() => {
    setStep("job");
  }, []);

  const handlePaymentComplete = useCallback(() => {
    setStep("intake");
  }, []);

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

  const showOverlay = step !== "map";
  const showPanel = step === "panel" && roadId;
  const showJob = step === "job" && selectedJob;
  const showCheckout = step === "checkout" && selectedJob && paymentSummary;
  const showIntake = step === "intake" && selectedJob;

  return (
    <div className={`route-map-page route-map-page--immersive ${utilityPageFontClassName}`}>
      <div className="route-map-scene-body">
        <RouteMapLobbyBackdrop />
        <div className={`route-map-world${showOverlay ? " route-map-world--overlay" : ""}`}>
          <div className="route-map-world__map route-map-world__map--desktop">
            <RouteMapWorkspace
              onSelectRoad={handleSelectRoad}
              showChoosePanel={step === "map"}
              mapInteractive={step === "map"}
            />
          </div>

          <div className="route-map-world__map route-map-world__map--mobile">
            <RouteMapMobileMap
              onSelectRoad={handleSelectRoad}
              onSelectRouteStart={handleSelectJob}
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
                recommendationNotice={{
                  title: selectedJob.name,
                  lines: [selectedJob.purpose],
                }}
                paymentDecisionAddon={
                  postPublishEligible ? (
                    <label className="route-map-checkout-addon">
                      <input
                        type="checkbox"
                        checked={includePostPublishAddon}
                        onChange={(event) => setIncludePostPublishAddon(event.target.checked)}
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
          ) : null}

          {showIntake ? (
            <div className="route-map-world__sheet route-map-world__sheet--intake">
              <RouteMapIntakeForm
                job={selectedJob}
                postPublishAddon={postPublishEligible && includePostPublishAddon}
                onSaveDraft={handleIntakeSaveDraft}
                onSubmit={handleIntakeSubmit}
              />
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
}
