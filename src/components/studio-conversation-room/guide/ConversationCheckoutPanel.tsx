"use client";

import { useEffect, useMemo } from "react";

import SecureCheckoutGrid from "@/components/payment/SecureCheckoutGrid";
import styles from "@/components/studio-conversation-room/guide/conversation-activity-panel.module.css";
import type { ServiceId } from "@/catalog/types";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { payment } from "@/config/payment";
import {
  getRouteMapRoad,
  type RouteMapJobId,
  type RouteMapRoadId,
} from "@/config/route-map-v1";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";
import {
  buildRouteMapPaymentSummaryFromServices,
  saveApprovedRouteMapPlan,
} from "@/lib/route-map-campaign";

import "@/app/payment.css";
import "@/app/checkout/checkout.css";

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
    if (phonePage) return;
    const confirm = document.getElementById("checkout-pay-continue");
    confirm?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [phonePage]);

  if (serviceIds.length === 0 || !planSummary) {
    return (
      <div
        className={styles.sheet}
        data-panel="checkout"
        data-surface={phonePage ? "page" : "overlay"}
      >
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
        <button
          type="button"
          className={styles.backLink}
          onClick={onBackToStudioPlan}
        >
          ← {v.checkoutBackToPlanLabel}
        </button>
      </div>
    );
  }

  return (
    <div
      className={styles.sheet}
      data-panel="checkout"
      data-surface={phonePage ? "page" : "overlay"}
    >
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

      <p className={styles.intro}>{v.checkoutLead}</p>
      {phonePage ? null : (
        <p className={styles.checkoutScopeDisclosure} role="note">
          {v.checkoutScopeDisclosure}
        </p>
      )}
      {paymentHonestyMessage ? (
        <p className={styles.checkoutScopeDisclosure} role="alert">
          {paymentHonestyMessage}
        </p>
      ) : null}

      <button
        type="button"
        className={styles.backLink}
        onClick={onBackToStudioPlan}
      >
        ← {v.checkoutBackToPlanLabel}
      </button>

      <div
        className={`${styles.checkoutHostSurface} ${utilityPageFontClassName}`}
      >
        <SecureCheckoutGrid
          layout="full"
          planSummary={planSummary}
          submitLabel={payment.form.submitLabel}
          onBeforePayment={(acknowledgment) => {
            if (serviceIds.length === 0) return false;
            if (onAuthorizePayment && !onAuthorizePayment()) return false;
            return Boolean(
              saveApprovedRouteMapPlan(serviceIds, acknowledgment),
            );
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
