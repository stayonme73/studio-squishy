"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import SecureCheckoutGrid from "@/components/payment/SecureCheckoutGrid";
import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import RouteMapIntakeForm from "@/components/route-map/RouteMapIntakeForm";
import RouteMapJobCard from "@/components/route-map/RouteMapJobCard";
import RouteMapLaneSelector from "@/components/route-map/RouteMapLaneSelector";
import RouteMapRoadView from "@/components/route-map/RouteMapRoadView";
import {
  ROUTE_MAP_V1,
  getRouteMapJob,
  getSelectableRouteMapRoads,
  type RouteMapJob,
  type RouteMapJobId,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import { studioBoard } from "@/config/studio-board";
import {
  buildRouteMapPaymentSummary,
  saveApprovedRouteMapPlan,
  selectRouteMapJob,
  submitRouteMapIntake,
} from "@/lib/route-map-campaign";
import type { RouteMapIntakeAnswers } from "@/config/route-map-intake-v1";
import { markPaymentReceived } from "@/lib/studio-board-campaign";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

export type RouteMapStep = "lanes" | "road" | "job" | "checkout" | "intake";

export default function RouteMapScene() {
  const router = useRouter();
  const [step, setStep] = useState<RouteMapStep>("lanes");
  const [roadId, setRoadId] = useState<RouteMapRoadId | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<RouteMapJobId | null>(null);

  const selectableRoads = useMemo(() => getSelectableRouteMapRoads(), []);

  const selectedJob = useMemo(
    () => (selectedJobId ? getRouteMapJob(selectedJobId) : undefined),
    [selectedJobId],
  );

  const paymentSummary = useMemo(
    () => (selectedJob ? buildRouteMapPaymentSummary(selectedJob) : undefined),
    [selectedJob],
  );

  const handleSelectRoad = useCallback(
    (id: RouteMapRoadId) => {
      setRoadId(id);
      if (id === "random-exit") {
        setStep("road");
        return;
      }
      setStep("road");
    },
    [],
  );

  const handleSelectJob = useCallback(
    (job: RouteMapJob) => {
      if (!roadId) return;
      setSelectedJobId(job.id);
      selectRouteMapJob(job.id, roadId);
      setStep("job");
    },
    [roadId],
  );

  const handleChooseJob = useCallback(() => {
    if (!selectedJob) return;
    setStep("checkout");
  }, [selectedJob]);

  const handleBackToMap = useCallback(() => {
    setStep("lanes");
    setRoadId(null);
    setSelectedJobId(null);
  }, []);

  const handleBackToRoad = useCallback(() => {
    setStep("road");
    setSelectedJobId(null);
  }, []);

  const handlePaymentComplete = useCallback(() => {
    setStep("intake");
  }, []);

  const handleIntakeSubmit = useCallback(
    (answers: RouteMapIntakeAnswers) => {
      submitRouteMapIntake(answers);
      router.push(`${studioBoard.routes.studioBoard}?record=open`);
    },
    [router],
  );

  return (
    <div
      className={`route-map-page studio-utility-scene studio-utility-scene--header-band ${utilityPageFontClassName}`}
    >
      <div className="studio-utility-header-band route-map-header-band">
        <UtilityPageHeader
          backHref={step === "lanes" ? studioBoard.routes.helpCenter : "/route-map"}
          backLabel={step === "lanes" ? "← Help Center" : ROUTE_MAP_V1.backToMapLabel}
          activeNav="help-center"
          title={ROUTE_MAP_V1.pageTitle}
          lead="Choose your route — pick a lane, select a job, pay, then share intake details."
          layout="orientation"
        />
      </div>

      <div className="studio-utility-scene__body">
        <StudioUtilityBackdrop placement="below-header" />
        <div className="studio-utility-scene__content">
          <div className="route-map-layout utility-content">
            <aside className="route-map-sidebar" aria-label={ROUTE_MAP_V1.sidebarHeading}>
              <h2 className="route-map-sidebar__title">{ROUTE_MAP_V1.sidebarHeading}</h2>
              <nav className="route-map-sidebar__nav">
                {selectableRoads.map((road) => (
                  <button
                    key={road.id}
                    type="button"
                    className={[
                      "route-map-sidebar__link",
                      road.accentClass,
                      road.id === "update" ? "route-map-sidebar__link--exit" : "",
                      road.id === "random-exit" ? "route-map-sidebar__link--random" : "",
                      roadId === road.id ? "route-map-sidebar__link--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleSelectRoad(road.id)}
                  >
                    <span className="route-map-sidebar__highway">{road.highwayLabel}</span>
                    <span className="route-map-sidebar__label">{road.customerLabel}</span>
                  </button>
                ))}
              </nav>
              <p className="route-map-sidebar__promise">{ROUTE_MAP_V1.promiseFooter}</p>
            </aside>

            <main className="route-map-main">
              {step === "lanes" && (
                <RouteMapLaneSelector onSelectRoad={handleSelectRoad} />
              )}

              {step === "road" && roadId && (
                <RouteMapRoadView
                  roadId={roadId}
                  onSelectJob={handleSelectJob}
                  onBack={handleBackToMap}
                />
              )}

              {step === "job" && selectedJob && (
                <RouteMapJobCard
                  job={selectedJob}
                  onChoose={handleChooseJob}
                  onBack={handleBackToRoad}
                />
              )}

              {step === "checkout" && selectedJob && paymentSummary && (
                <div className="route-map-checkout">
                  <button type="button" className="route-map-back-link" onClick={() => setStep("job")}>
                    ← Back to job details
                  </button>
                  <SecureCheckoutGrid
                    layout="embedded"
                    planSummary={paymentSummary}
                    onBeforePayment={(acknowledgment) => {
                      if (!selectedJobId) return false;
                      return Boolean(saveApprovedRouteMapPlan(selectedJobId, acknowledgment));
                    }}
                    onPaymentComplete={() => {
                      markPaymentReceived();
                      handlePaymentComplete();
                    }}
                    recommendationNotice={{
                      title: selectedJob.name,
                      lines: [selectedJob.purpose],
                    }}
                  />
                </div>
              )}

              {step === "intake" && selectedJob && (
                <RouteMapIntakeForm job={selectedJob} onSubmit={handleIntakeSubmit} />
              )}

              {step !== "lanes" && step !== "checkout" && step !== "intake" && (
                <p className="route-map-footer-note">
                  Need the full discovery experience?{" "}
                  <Link href={ROUTE_MAP_V1.projectDiscoveryRoute}>Enter Project Discovery</Link>
                </p>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
