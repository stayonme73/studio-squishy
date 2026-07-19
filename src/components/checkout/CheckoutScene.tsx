"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import SecureCheckoutGrid from "@/components/payment/SecureCheckoutGrid";
import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
import type { ServiceId } from "@/catalog/types";
import { payment } from "@/config/payment";
import { projectBuilderHref } from "@/config/project-builder-v1";
import { getRouteMapRoad, type RouteMapRoadId } from "@/config/route-map-v1";
import {
  buildRouteMapPaymentSummaryFromServices,
  saveApprovedRouteMapPlan,
  saveRouteMapJourneyStep,
} from "@/lib/route-map-campaign";
import { CAMPAIGN_SYNC_EVENT, type CampaignSyncStatus } from "@/lib/campaign-store/types";
import { campaignSaveStatusLabel } from "@/lib/campaign-save-status-label";
import { readCampaignSyncStatus } from "@/lib/campaign-store/sync-client";
import { markPaymentReceived, readCurrentCampaignHydrated } from "@/lib/studio-board-campaign";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

function routeMapSyncStatusLabel(status: CampaignSyncStatus | null): string {
  return campaignSaveStatusLabel(status);
}

/** Secure Checkout — full-page room matching Project Builder / Studio Plan. */
export default function CheckoutScene() {
  const router = useRouter();
  const [syncStatus, setSyncStatus] = useState<CampaignSyncStatus | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<ServiceId[]>([]);
  const [roadId, setRoadId] = useState<RouteMapRoadId | null>(null);

  useEffect(() => {
    const campaign = readCurrentCampaignHydrated();
    const ctx = campaign?.routeMapContext;
    const ids = ctx?.selectedServiceIds ?? [];
    setSelectedServiceIds([...ids]);
    setRoadId(ctx?.roadId ?? null);

    if (ids.length === 0) {
      router.replace("/route-map");
      return;
    }

    saveRouteMapJourneyStep("checkout");
  }, [router]);

  useEffect(() => {
    setSyncStatus(readCampaignSyncStatus());

    function handleSyncStatus(event: Event) {
      const detail = event instanceof CustomEvent ? (event.detail as CampaignSyncStatus) : null;
      setSyncStatus(detail ?? readCampaignSyncStatus());
    }

    window.addEventListener(CAMPAIGN_SYNC_EVENT, handleSyncStatus);
    return () => window.removeEventListener(CAMPAIGN_SYNC_EVENT, handleSyncStatus);
  }, []);

  const road = roadId ? getRouteMapRoad(roadId) : undefined;
  const routeLabel = road ? `${road.highwayLabel} · ${road.customerLabel}` : null;

  const planSummary = useMemo(
    () =>
      selectedServiceIds.length > 0
        ? buildRouteMapPaymentSummaryFromServices(selectedServiceIds, roadId ?? undefined)
        : undefined,
    [selectedServiceIds, roadId],
  );

  const studioPlanHref =
    roadId != null ? `${projectBuilderHref(roadId)}&view=studio-plan` : "/route-map";
  const editProjectHref = roadId != null ? projectBuilderHref(roadId) : "/route-map";

  const handlePaymentComplete = useCallback(() => {
    markPaymentReceived();
    saveRouteMapJourneyStep("intake");
    router.push("/route-map?step=intake");
  }, [router]);

  if (selectedServiceIds.length === 0 || !planSummary) {
    return (
      <div className={`co-scene ${utilityPageFontClassName}`} aria-busy="true">
        <StudioUtilityBackdrop placement="viewport" />
      </div>
    );
  }

  return (
    <div className={`co-scene ${utilityPageFontClassName}`}>
      <StudioUtilityBackdrop placement="viewport" />
      <div className="co-scene__content">
        <header className="co-header co-card">
          <div className="co-header__top">
            <div className="co-header__nav">
              <Link
                href={studioPlanHref}
                className="co-header__back"
                onClick={() => saveRouteMapJourneyStep("studio-plan")}
              >
                {payment.backToStudioPlanLabel}
              </Link>
              <Link
                href={editProjectHref}
                className="utility-btn utility-btn--secondary co-header__edit"
                onClick={() => saveRouteMapJourneyStep("panel")}
              >
                {payment.editProjectLabel}
              </Link>
            </div>
            {(() => {
              const syncLabel = routeMapSyncStatusLabel(syncStatus);
              return syncLabel ? (
                <p className="co-header__sync" role="status" aria-live="polite">
                  {syncLabel}
                </p>
              ) : null;
            })()}
          </div>

          <div className="co-header__intro">
            {routeLabel ? (
              <>
                <p className="co-header__eyebrow">Your route</p>
                <p className="co-header__route">{routeLabel}</p>
              </>
            ) : null}
            <h1 className="co-header__title">{payment.pageTitle}</h1>
            {payment.pageLeadLines.map((line) => (
              <p key={line} className="co-header__lead">
                {line}
              </p>
            ))}
          </div>
        </header>

        <SecureCheckoutGrid
          layout="full"
          planSummary={planSummary}
          onBeforePayment={(acknowledgment) => {
            if (selectedServiceIds.length === 0) return false;
            return Boolean(saveApprovedRouteMapPlan(selectedServiceIds, acknowledgment));
          }}
          onPaymentComplete={handlePaymentComplete}
        />
      </div>
    </div>
  );
}
