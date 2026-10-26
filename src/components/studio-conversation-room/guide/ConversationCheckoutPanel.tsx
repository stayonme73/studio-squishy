"use client";

import { useEffect, useMemo, type ReactNode } from "react";

import SecureCheckoutGrid from "@/components/payment/SecureCheckoutGrid";
import SamsungDeckBack from "@/components/studio-conversation-room/guide/SamsungDeckBack";
import styles from "@/components/studio-conversation-room/guide/conversation-activity-panel.module.css";
import type { ServiceId } from "@/catalog/types";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { studioTileClass } from "@/config/studio-customer-tile-system-v1";
import { payment } from "@/config/payment";
import {
  getRouteMapRoad,
  type RouteMapJobId,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";
import { bridgeConversationPlanToCampaign } from "@/lib/conversation-room-draft/bridge-campaign";
import {
  buildRouteMapPaymentSummaryFromServices,
  saveApprovedRouteMapPlan,
} from "@/lib/route-map-campaign";

import { resetConversationStageScroll } from "@/lib/studio-conversation-stage-scroll";
import { renderWithCoralProjectChange } from "@/components/studio-conversation-room/guide/renderWithCoralProjectChange";

import "@/app/payment.css";
import "@/app/checkout/checkout.css";
import "@/app/studio-visual-system-v2.css";

export type ConversationCheckoutPanelProps = {
  roadId: RouteMapRoadId;
  selectedJobIds: ReadonlySet<RouteMapJobId>;
  onClose: () => void;
  onBackToStudioPlan: () => void;
  onPaymentComplete: () => void | Promise<void>;
  /** Local sandbox-confirm fixture — not Stripe hosted Checkout. */
  onSandboxConfirm?: () => void | Promise<void>;
  /** Pre-acceptance fail-closed gate (CLEAR_TO_ACCEPT required). */
  onAuthorizePayment?: () => boolean;
  /** Cancelled / failed / pending payment copy from durable processor state. */
  paymentHonestyMessage?: string | null;
  /** Mobile dedicated page — not an overlay on Conversation Room. */
  phonePage?: boolean;
  topControls?: ReactNode;
};

/**
 * Activity Panel Checkout — reuses SecureCheckoutGrid + campaign persistence.
 * Paid truth is established by Stripe webhook/reconcile (or server sandbox-confirm).
 */
export default function ConversationCheckoutPanel({
  roadId,
  selectedJobIds,
  onClose,
  onBackToStudioPlan,
  onPaymentComplete,
  onSandboxConfirm,
  onAuthorizePayment,
  paymentHonestyMessage = null,
  phonePage = false,
  topControls = null,
}: ConversationCheckoutPanelProps) {
  const v = conversationRoomGuideV1;
  const serviceIds = useMemo(
    () => Array.from(selectedJobIds) as ServiceId[],
    [selectedJobIds],
  );
  const road = getRouteMapRoad(roadId);
  const routeCustomerLabel = road?.customerLabel ?? null;

  const planSummary = useMemo(
    () =>
      serviceIds.length > 0
        ? buildRouteMapPaymentSummaryFromServices(serviceIds, roadId)
        : undefined,
    [serviceIds, roadId],
  );

  useEffect(() => {
    if (phonePage) {
      resetConversationStageScroll();
      return;
    }
    const confirm = document.getElementById("checkout-pay-continue");
    confirm?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [phonePage]);

  const journeyChrome = (
    <div data-tablet-journey-chrome="true">
      <SamsungDeckBack
        className={styles.backLink}
        onActivate={onBackToStudioPlan}
      >
        ← {v.checkoutBackToPlanLabel}
      </SamsungDeckBack>
      {topControls}
    </div>
  );

  if (serviceIds.length === 0 || !planSummary) {
    return (
      <div
        className={styles.sheet}
        data-panel="checkout"
        data-surface={phonePage ? "page" : "overlay"}
      >
        {journeyChrome}
        <header className={styles.header}>
          <div>
            {phonePage ? null : (
              <p className={styles.eyebrow}>Conversation Room</p>
            )}
            <h2 className={styles.title}>
              {phonePage ? v.checkoutTabletTitle : v.checkoutTitle}
            </h2>
          </div>
          {phonePage ? null : (
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close activity panel"
            >
              Close
            </button>
          )}
        </header>
        <p className={styles.intro} role="status">
          {v.studioPlanBridgeError}
        </p>
      </div>
    );
  }

  return (
    <div
      className={styles.sheet}
      data-panel="checkout"
      data-surface={phonePage ? "page" : "overlay"}
    >
      {journeyChrome}
      <header className={styles.header}>
        <div>
          {phonePage ? null : (
            <p className={styles.eyebrow}>Conversation Room</p>
          )}
          <h2 className={styles.title}>
            {phonePage ? v.checkoutTabletTitle : v.checkoutTitle}
          </h2>
        </div>
        {phonePage ? null : (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close activity panel"
          >
            Close
          </button>
        )}
      </header>

      {routeCustomerLabel ? (
        <p className={styles.checkoutRouteLabel}>
          <span className={styles.checkoutRouteEyebrow}>
            {v.studioPlanRouteLabel}
          </span>
          <span className={styles.checkoutRouteValue}>{routeCustomerLabel}</span>
        </p>
      ) : null}

      <p className={styles.intro}>{renderWithCoralProjectChange(v.checkoutLead)}</p>
      {phonePage ? null : (
        <p className={styles.checkoutScopeDisclosure} role="note">
          {renderWithCoralProjectChange(v.checkoutScopeDisclosure)}
        </p>
      )}
      {paymentHonestyMessage ? (
        <p className={styles.checkoutScopeDisclosure} role="alert">
          {paymentHonestyMessage}
        </p>
      ) : null}

      <div
        className={
          phonePage
            ? `${styles.checkoutPageSurface} ${utilityPageFontClassName}`
            : `${styles.checkoutHostSurface} ${studioTileClass.standardDense} ${utilityPageFontClassName}`
        }
        data-checkout-surface={phonePage ? "page-content" : "host"}
      >
        <SecureCheckoutGrid
          layout="full"
          planSummary={planSummary}
          submitLabel={payment.form.submitLabel}
          onBeforePayment={(acknowledgment) => {
            if (serviceIds.length === 0) return false;
            if (onAuthorizePayment && !onAuthorizePayment()) return false;
            let saved = saveApprovedRouteMapPlan(serviceIds, acknowledgment);
            if (!saved) {
              const bridged = bridgeConversationPlanToCampaign(
                roadId,
                serviceIds,
              );
              saved = bridged
                ? saveApprovedRouteMapPlan(serviceIds, acknowledgment)
                : null;
            }
            return Boolean(saved);
          }}
          onPaymentComplete={onPaymentComplete}
          onSandboxConfirm={onSandboxConfirm}
          compactPaymentHonesty={phonePage}
        />
        {phonePage ? null : (
          <p className={styles.checkoutHonestyNote}>
            {payment.form.paymentSecurityNote}
          </p>
        )}
      </div>
    </div>
  );
}
