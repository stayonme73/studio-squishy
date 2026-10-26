"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import { useSamsungTapActivate } from "@/lib/studio-samsung-activate";

import type { ServiceId } from "@/catalog/types";
import type { ApprovalAcknowledgment } from "@/config/studio-board";
import { payment } from "@/config/payment";
import {
  ACKNOWLEDGMENT_VERSION,
  APPROVAL_ACKNOWLEDGMENT_TEXT,
} from "@/config/service-guide";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { studioPaymentV1 } from "@/config/studio-payment-v1";
import { resolveBundlePackageId } from "@/lib/approved-plan-display";
import {
  buildPaymentPlanSummary,
  type PaymentPlanSummary,
} from "@/lib/payment-plan-summary";
import { isDeveloperCheckoutSandboxVisible } from "@/lib/studio-payment/hosted-checkout-ui";
import {
  rememberStudioPaymentSandbox,
  restoreStudioPaymentSandboxQuery,
} from "@/lib/studio-payment/sandbox-query";
import { readCurrentCampaignHydrated } from "@/lib/studio-board-campaign";

type Props = {
  packageId?: StudioGuidePackageId;
  /** Starts Stripe-hosted Checkout (redirect). Required for paid-truth Stripe smoke. */
  onPaymentComplete?: (
    packageId: StudioGuidePackageId | undefined,
  ) => void | Promise<void>;
  /**
   * Local sandbox-confirm fixture only. Shown only with developer opt-in
   * (`NEXT_PUBLIC_DEV_TOOLS=1` or `?studioPaymentSandbox=1`).
   */
  onSandboxConfirm?: () => void | Promise<void>;
  /** `embedded` — legacy two-column sheet. `full` — certified single-column checkout room. */
  layout?: "full" | "embedded";
  /** Live plan summary from customize column; overrides storage/mock summary when set. */
  planSummary?: PaymentPlanSummary;
  /** Recommendation notice above the Pay button (embedded Project Summary checkout). */
  recommendationNotice?: {
    title: string;
    lines: readonly string[];
  };
  /** Optional content placed with the final payment decision controls. */
  paymentDecisionAddon?: ReactNode;
  /** Persist approved plan before payment; return false to block checkout. */
  onBeforePayment?: (acknowledgment: ApprovalAcknowledgment) => boolean;
  /** Open Service Guide for a checkout line item SKU. */
  onOpenServiceGuide?: (serviceId: ServiceId) => void;
  /** Scroll or navigate to selected plan details (embedded checkout). */
  onViewPlanDetails?: () => void;
  /** Override submit button label (Conversation Room panel may use “Complete Checkout”). */
  submitLabel?: string;
  /** Review & Pay may replace Conversation Room intake steps without rewriting payment.ts. */
  whatsNextSteps?: readonly { label: string; marker: "number" }[];
  whatsNextReassurance?: string;
  termsLabel?: string;
  /** Review & Pay heading. Defaults to the shared checkout title. */
  confirmSectionTitle?: string;
  /** Review & Pay can name the payment block without changing other checkouts. */
  summaryTitle?: string;
  servicesHeading?: string;
  investmentLabel?: string;
  investmentNote?: string;
  /** Review & Pay already states the price above this grid. */
  hideOrderSummary?: boolean;
  /**
   * Review & Pay already has one price. Keep the line under the button
   * and leave out the Stripe sentence above it.
   */
  paymentLine?: "both" | "reassurance";
  /**
   * Phone Conversation Room: say Stripe/payment honesty once.
   * Desktop /payment keeps the security note plus the under-button reassurance.
   */
  compactPaymentHonesty?: boolean;
};

function SummaryCheckIcon() {
  return (
    <svg className="pay-summary-check" viewBox="0 0 16 16" aria-hidden focusable="false">
      <path
        d="M2.5 8.2 L5.8 11.5 L13.5 4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaperCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`pay-paper-card ${className}`.trim()}
      aria-labelledby={`pay-card-${title.replace(/\s+/g, "-").toLowerCase()}`}
    >
      <div className="pay-paper-card__pin" aria-hidden />
      <div className="pay-paper-card__texture" aria-hidden />
      <div className="pay-paper-card__spine" aria-hidden />
      <div className="pay-paper-card__body">
        <h2
          id={`pay-card-${title.replace(/\s+/g, "-").toLowerCase()}`}
          className="pay-paper-card__title"
        >
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function CheckoutSection({
  title,
  children,
  className = "",
  sectionId,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  sectionId?: string;
}) {
  const id = title ? `co-section-${title.replace(/\s+/g, "-").toLowerCase()}` : undefined;
  return (
    <section
      id={sectionId}
      className={`co-card ${className}`.trim()}
      aria-labelledby={id}
    >
      {title ? (
        <h2 id={id} className="co-card__heading">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

function resolveCheckoutPackageId(
  packageIdProp?: StudioGuidePackageId,
): StudioGuidePackageId | undefined {
  if (packageIdProp) return packageIdProp;
  return resolveBundlePackageId(readCurrentCampaignHydrated()?.packageId);
}

/**
 * Hosted Stripe Checkout review surface.
 * Plan + confirmation only — card entry happens solely on Stripe Checkout.
 */
export default function SecureCheckoutGrid({
  packageId: packageIdProp,
  onPaymentComplete,
  onSandboxConfirm,
  layout = "full",
  planSummary: planSummaryProp,
  recommendationNotice,
  paymentDecisionAddon,
  onBeforePayment,
  onOpenServiceGuide,
  onViewPlanDetails,
  submitLabel,
  compactPaymentHonesty = false,
  whatsNextSteps,
  whatsNextReassurance,
  termsLabel,
  confirmSectionTitle,
  summaryTitle,
  servicesHeading,
  investmentLabel,
  investmentNote,
  hideOrderSummary = false,
  paymentLine = "both",
}: Props) {
  const checkoutPackageId = resolveCheckoutPackageId(packageIdProp);
  const storedPlanSummary = useMemo(() => buildPaymentPlanSummary(), []);
  const planSummary = planSummaryProp ?? storedPlanSummary;
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showSandboxFixture, setShowSandboxFixture] = useState(false);
  const isEmbedded = layout === "embedded";
  const confirmLabel = submitLabel ?? payment.form.submitLabel;
  const confirmTerms = termsLabel ?? payment.form.termsLabel;
  const confirmTitle = confirmSectionTitle ?? payment.sections.confirm;
  const nextSteps = whatsNextSteps ?? payment.whatsNext.steps;
  const nextReassurance = whatsNextReassurance ?? payment.whatsNext.emailReassurance;
  const payActivate = useSamsungTapActivate<HTMLAnchorElement>(() => {
    if (completing) return;
    if (!termsAccepted) {
      setCheckoutError(confirmTerms);
      return;
    }
    void completeCheckout();
  });

  /* Query flag is only knowable after mount. SSR `window` is undefined, so a
     useMemo on first paint hid the fixture even with ?studioPaymentSandbox=1. */
  useEffect(() => {
    rememberStudioPaymentSandbox(window.location.search);
    restoreStudioPaymentSandboxQuery();
    if (!onSandboxConfirm) {
      setShowSandboxFixture(false);
      return;
    }
    setShowSandboxFixture(
      isDeveloperCheckoutSandboxVisible({ search: window.location.search }),
    );
  }, [onSandboxConfirm]);

  useEffect(() => {
    if (!showSandboxFixture || !checkoutError) return;
    if (!/card payment is not ready/i.test(checkoutError)) return;
    const fixture = document.querySelector(
      '[data-developer-fixture="sandbox-confirm"]',
    );
    if (!(fixture instanceof HTMLElement)) return;
    fixture.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [checkoutError, showSandboxFixture]);

  function buildAcknowledgment(): ApprovalAcknowledgment {
    return {
      acknowledgmentVersion: ACKNOWLEDGMENT_VERSION,
      acknowledgmentText: APPROVAL_ACKNOWLEDGMENT_TEXT,
      acknowledgedAt: new Date().toISOString(),
    };
  }

  function isAuthorizedCertSandbox(): boolean {
    if (!onSandboxConfirm || typeof window === "undefined") return false;
    return isDeveloperCheckoutSandboxVisible({
      search: window.location.search,
    });
  }

  async function completeCheckout() {
    if (completing) return;
    /*
     * Cert path only: ?studioPaymentSandbox=1 (or NEXT_PUBLIC_DEV_TOOLS=1)
     * uses the existing sandbox-confirm flow. Production Continue never
     * prefers sandbox.
     */
    if (isAuthorizedCertSandbox()) {
      await handleSandboxPayment();
      return;
    }
    const acknowledgment = buildAcknowledgment();
    if (onBeforePayment && !onBeforePayment(acknowledgment)) {
      setCheckoutError(studioPaymentV1.customerCopy.processorSessionFailed);
      return;
    }
    setCheckoutError(null);
    setCompleting(true);
    if (onPaymentComplete) {
      try {
        await onPaymentComplete(checkoutPackageId);
        /* Redirect to Stripe leaves this page; if not, clear busy state. */
        setCompleting(false);
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim()
            ? error.message
            : studioPaymentV1.customerCopy.paymentFailed;
        setCheckoutError(message);
        setCompleting(false);
      }
      return;
    }
    setCheckoutError(studioPaymentV1.customerCopy.legacyPaidBlocked);
    setCompleting(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (completing) return;
    if (!termsAccepted) {
      setCheckoutError(confirmTerms);
      return;
    }
    void completeCheckout();
  }

  async function handleSandboxPayment() {
    if (!onSandboxConfirm || completing) return;
    if (!termsAccepted) {
      setCheckoutError(confirmTerms);
      return;
    }
    const acknowledgment = buildAcknowledgment();
    if (onBeforePayment && !onBeforePayment(acknowledgment)) {
      setCheckoutError(studioPaymentV1.customerCopy.processorSessionFailed);
      return;
    }
    setCheckoutError(null);
    setCompleting(true);
    try {
      await onSandboxConfirm();
      setCompleting(false);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : studioPaymentV1.customerCopy.paymentFailed;
      setCheckoutError(message);
      setCompleting(false);
    }
  }

  const showMonthlySubtotal = planSummary.monthlySubtotalCents > 0;
  const showOneTimeSubtotal =
    planSummary.oneTimeSubtotalCents > 0 ||
    planSummary.lineItems.some((line) => line.billingType === "one_time");

  const acknowledgmentBlock = (
    <section className="pay-acknowledgment" aria-labelledby="pay-acknowledgment-heading">
      {onViewPlanDetails ? (
        <button type="button" className="pay-plan-details-link" onClick={onViewPlanDetails}>
          {payment.form.viewPlanDetailsLabel}
        </button>
      ) : null}
      <h3 id="pay-acknowledgment-heading" className="pay-acknowledgment__heading">
        {payment.form.acknowledgmentHeading}
      </h3>
      {payment.form.acknowledgmentBody.map((paragraph) => (
        <p key={paragraph} className="pay-acknowledgment__body">
          {paragraph}
        </p>
      ))}
      <label className="pay-acknowledgment__checkbox">
        <input
          type="checkbox"
          name="terms"
          data-checkout-terms="1"
          checked={termsAccepted}
          onChange={(event) => setTermsAccepted(event.target.checked)}
        />
        <span>{confirmTerms}</span>
      </label>
    </section>
  );

  const sandboxPanel = showSandboxFixture ? (
    <div
      className={`pay-sandbox${isEmbedded ? "" : " pay-sandbox--stack"}`}
      data-developer-fixture="sandbox-confirm"
      aria-label={payment.sandbox.label}
    >
      <div className="pay-sandbox__head">
        <p className="pay-sandbox__label">{payment.sandbox.label}</p>
        <span className="pay-sandbox__badge">{payment.sandbox.badge}</span>
      </div>
      <p className="pay-sandbox__hint">
        {payment.sandbox.hint} {studioPaymentV1.customerCopy.sandboxFixtureOnly}
      </p>
      <button
        type="button"
        className="pay-sandbox__btn"
        onClick={() => {
          void handleSandboxPayment();
        }}
        disabled={completing || !termsAccepted}
      >
        {payment.sandbox.buttonLabel}
      </button>
    </div>
  ) : null;

  const planSummaryBody = (
    <>
      <p className="pay-summary-includes-label">{payment.summary.recommendedServicesLabel}</p>
      <ul className="pay-summary-includes-list">
        {planSummary.lineItems.map((item) => (
          <li key={item.serviceId}>
            <SummaryCheckIcon />
            <span>
              {onOpenServiceGuide ? (
                <button
                  type="button"
                  className="pay-summary-line-guide"
                  onClick={() => onOpenServiceGuide(item.serviceId)}
                >
                  {item.name}
                </button>
              ) : (
                item.name
              )}
              <span className="pay-summary-line-price"> — {item.priceDisplay}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="pay-summary-investment">
        {showOneTimeSubtotal ? (
          <div className="pay-summary-total-row">
            <p className="pay-summary-total-label">{payment.summary.oneTimeSubtotalLabel}</p>
            <p className="pay-summary-price">{planSummary.oneTimeSubtotalDisplay}</p>
          </div>
        ) : null}
        {showMonthlySubtotal ? (
          <div className="pay-summary-total-row">
            <p className="pay-summary-total-label">{payment.summary.monthlySubtotalLabel}</p>
            <p className="pay-summary-price">{planSummary.monthlySubtotalDisplay}/month</p>
          </div>
        ) : null}
        <div className="pay-summary-total-row pay-summary-total-row--due">
          <p className="pay-summary-total-label">{payment.summary.amountDueTodayLabel}</p>
          <p className="pay-summary-price">{planSummary.amountDueTodayDisplay}</p>
        </div>
        <p className="pay-summary-disclosure-note">
          {payment.summary.cardProcessingDisclosureNote}
        </p>
      </div>
    </>
  );

  if (isEmbedded) {
    return (
      <div
        className="pay-shell pay-shell--embedded"
        data-hosted-checkout="stripe"
        data-collects-card="false"
      >
        <div className="pay-checkout-grid pay-checkout-grid--embedded">
          <PaperCard title={payment.sections.summary} className="pay-paper-card--summary">
            {planSummaryBody}
          </PaperCard>

          <PaperCard title={confirmTitle} className="pay-paper-card--form">
            <form className="pay-form" onSubmit={handleSubmit}>
              {recommendationNotice ? (
                <div className="pay-disclaimer" role="note">
                  <h3 className="pay-disclaimer__heading">{recommendationNotice.title}</h3>
                  {recommendationNotice.lines.map((line) => (
                    <p key={line} className="pay-disclaimer__line">
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}
              {paymentDecisionAddon ? (
                <div className="pay-decision-addon">{paymentDecisionAddon}</div>
              ) : null}
              {acknowledgmentBlock}
              <p className="pay-summary-disclosure-note" role="note">
                {payment.form.paymentSecurityNote}
              </p>
              <button
                type="submit"
                className="pay-submit"
                data-checkout-pay="continue"
                disabled={completing}
              >
                {confirmLabel}
              </button>
              {checkoutError ? (
                <p className="pay-summary-disclosure-note" role="alert">
                  {checkoutError}
                </p>
              ) : compactPaymentHonesty ? null : (
                <p className="pay-summary-disclosure-note">
                  {payment.form.paymentReassurance}
                </p>
              )}
              {sandboxPanel}
            </form>
          </PaperCard>
        </div>
      </div>
    );
  }

  return (
    <div
      className="pay-shell pay-shell--stack"
      data-hosted-checkout="stripe"
      data-collects-card="false"
    >
      <div className="pay-checkout-stack">
        {hideOrderSummary ? null : <CheckoutSection title={summaryTitle ?? payment.sections.summary}>
          <h3 className="co-card__subheading">
            {servicesHeading ?? payment.sections.deliverables}
          </h3>
          <ul className="co-deliverables">
            {planSummary.lineItems.map((item) => (
              <li key={item.serviceId} className="co-deliverable">
                <div className="co-deliverable__head">
                  <p className="co-deliverable__title">
                    {onOpenServiceGuide ? (
                      <button
                        type="button"
                        className="co-deliverable__guide"
                        onClick={() => onOpenServiceGuide(item.serviceId)}
                      >
                        {item.name}
                      </button>
                    ) : (
                      item.name
                    )}
                  </p>
                  <p className="co-deliverable__price">{item.priceDisplay}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="co-investment">
            {showOneTimeSubtotal && showMonthlySubtotal ? (
              <>
                <div className="co-investment__row">
                  <span>{payment.summary.oneTimeSubtotalLabel}</span>
                  <span>{planSummary.oneTimeSubtotalDisplay}</span>
                </div>
                <div className="co-investment__row">
                  <span>{payment.summary.monthlySubtotalLabel}</span>
                  <span>{planSummary.monthlySubtotalDisplay}/month</span>
                </div>
              </>
            ) : null}
            <p className="co-investment__label">
              {investmentLabel ?? payment.summary.investmentLabel}
            </p>
            <p className="co-investment__total">{planSummary.amountDueTodayDisplay}</p>
            <p className="co-investment__note">
              {investmentNote ?? payment.summary.cardProcessingDisclosureNote}
            </p>
          </div>
        </CheckoutSection>}

        <form className="pay-checkout-form" onSubmit={handleSubmit}>
          <CheckoutSection
            title={confirmTitle}
            className="co-card--confirm"
            sectionId="checkout-pay-continue"
          >
            {recommendationNotice ? (
              <div className="pay-disclaimer" role="note">
                <h3 className="pay-disclaimer__heading">{recommendationNotice.title}</h3>
                {recommendationNotice.lines.map((line) => (
                  <p key={line} className="pay-disclaimer__line">
                    {line}
                  </p>
                ))}
              </div>
            ) : null}
            {paymentDecisionAddon ? (
              <div className="pay-decision-addon">{paymentDecisionAddon}</div>
            ) : null}
            <label className="pay-acknowledgment__checkbox co-confirm__checkbox">
              <input
                type="checkbox"
                name="terms"
                data-checkout-terms="1"
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
              />
              <span>{confirmTerms}</span>
            </label>
            {paymentLine === "reassurance" ? null : (
              <p className="co-payment-security" role="note">
                {payment.form.paymentSecurityNote}
              </p>
            )}
            {compactPaymentHonesty ? sandboxPanel : null}
            <a
              ref={payActivate.ref}
              id="checkout-pay-continue"
              href="#checkout-continue"
              className="lobby-entry-film__cta co-submit"
              data-checkout-pay="continue"
              data-completing={completing ? "true" : undefined}
              role="button"
              aria-busy={completing ? "true" : undefined}
              aria-disabled={completing ? "true" : undefined}
              onClick={(event) => {
                event.preventDefault();
                if (completing) return;
                payActivate.onClick();
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                if (completing) return;
                if (!termsAccepted) {
                  setCheckoutError(confirmTerms);
                  return;
                }
                void completeCheckout();
              }}
            >
              <span>{confirmLabel}</span>
            </a>
            {checkoutError ? (
              <p className="co-payment-reassurance" role="alert">
                {checkoutError}
              </p>
            ) : compactPaymentHonesty ? null : (
              <p className="co-payment-reassurance">{payment.form.paymentReassurance}</p>
            )}
            {compactPaymentHonesty ? null : sandboxPanel}
          </CheckoutSection>

          <CheckoutSection title={payment.sections.next}>
            <ol className="co-next-steps" aria-label={payment.sections.next}>
              {nextSteps.map((step, index) => (
                <li key={step.label} className="co-next-steps__item">
                  <span className="co-next-steps__num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="co-next-steps__label">{step.label}</span>
                </li>
              ))}
            </ol>
            <p className="co-next-steps__reassurance">{nextReassurance}</p>
          </CheckoutSection>
        </form>
      </div>
    </div>
  );
}
