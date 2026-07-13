"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { ServiceId } from "@/catalog/types";
import type { ApprovalAcknowledgment } from "@/config/studio-board";
import { payment } from "@/config/payment";
import { resolvePostPaymentIntakeHref } from "@/lib/intake-edit";
import {
  ACKNOWLEDGMENT_VERSION,
  APPROVAL_ACKNOWLEDGMENT_TEXT,
} from "@/config/service-guide";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { resolveBundlePackageId } from "@/lib/approved-plan-display";
import {
  buildPaymentPlanSummary,
  type PaymentPlanSummary,
} from "@/lib/payment-plan-summary";
import { isPaymentSandboxAvailable, simulateSandboxPayment } from "@/lib/payment-sandbox";
import { readCurrentCampaignHydrated, markPaymentReceived } from "@/lib/studio-board-campaign";

type Props = {
  packageId?: StudioGuidePackageId;
  /** When set, runs after payment instead of default Vision Intake navigation. */
  onPaymentComplete?: (packageId: StudioGuidePackageId | undefined) => void;
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
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const id = title ? `co-section-${title.replace(/\s+/g, "-").toLowerCase()}` : undefined;
  return (
    <section
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

/** Secure Checkout — presentation only; payment logic unchanged. */
export default function SecureCheckoutGrid({
  packageId: packageIdProp,
  onPaymentComplete,
  layout = "full",
  planSummary: planSummaryProp,
  recommendationNotice,
  paymentDecisionAddon,
  onBeforePayment,
  onOpenServiceGuide,
  onViewPlanDetails,
}: Props) {
  const router = useRouter();
  const checkoutPackageId = resolveCheckoutPackageId(packageIdProp);
  const storedPlanSummary = useMemo(() => buildPaymentPlanSummary(), []);
  const planSummary = planSummaryProp ?? storedPlanSummary;
  const [termsAccepted, setTermsAccepted] = useState(false);
  const showSandbox = isPaymentSandboxAvailable();
  const isEmbedded = layout === "embedded";

  function buildAcknowledgment(): ApprovalAcknowledgment {
    return {
      acknowledgmentVersion: ACKNOWLEDGMENT_VERSION,
      acknowledgmentText: APPROVAL_ACKNOWLEDGMENT_TEXT,
      acknowledgedAt: new Date().toISOString(),
    };
  }

  function completeCheckout() {
    const acknowledgment = buildAcknowledgment();
    if (onBeforePayment && !onBeforePayment(acknowledgment)) return;
    if (onPaymentComplete) {
      onPaymentComplete(checkoutPackageId);
      return;
    }
    markPaymentReceived(checkoutPackageId);
    router.push(resolvePostPaymentIntakeHref(readCurrentCampaignHydrated(), checkoutPackageId));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!termsAccepted) return;
    completeCheckout();
  }

  function handleSandboxPayment() {
    const acknowledgment = buildAcknowledgment();
    if (onBeforePayment && !onBeforePayment(acknowledgment)) return;
    if (onPaymentComplete) {
      onPaymentComplete(checkoutPackageId);
      return;
    }
    simulateSandboxPayment(checkoutPackageId);
    router.push(resolvePostPaymentIntakeHref(readCurrentCampaignHydrated(), checkoutPackageId));
  }

  const showMonthlySubtotal = planSummary.monthlySubtotalCents > 0;
  const showOneTimeSubtotal =
    planSummary.oneTimeSubtotalCents > 0 ||
    planSummary.lineItems.some((line) => line.billingType === "one_time");

  const billingFields = (
    <>
      <label className="pay-field">
        <span>{payment.form.fullName}</span>
        <input type="text" name="fullName" autoComplete="name" required />
      </label>
      <label className="pay-field">
        <span>{payment.form.businessName}</span>
        <input type="text" name="businessName" autoComplete="organization" />
      </label>
      <label className="pay-field">
        <span>{payment.form.email}</span>
        <input type="email" name="email" autoComplete="email" required />
      </label>
      <label className="pay-field">
        <span>{payment.form.phone}</span>
        <input type="tel" name="phone" autoComplete="tel" />
      </label>
    </>
  );

  const paymentFields = (
    <>
      <label className="pay-field">
        <span>{payment.form.cardNumber}</span>
        <input
          type="text"
          name="cardNumber"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          required
        />
      </label>
      <div className="pay-form-row">
        <label className="pay-field">
          <span>{payment.form.expDate}</span>
          <input
            type="text"
            name="expDate"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM / YY"
            required
          />
        </label>
        <label className="pay-field">
          <span>{payment.form.cvv}</span>
          <input
            type="text"
            name="cvv"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="CVV"
            required
          />
        </label>
      </div>
      <label className="pay-field">
        <span>{payment.form.zipCode}</span>
        <input type="text" name="zipCode" inputMode="numeric" autoComplete="postal-code" required />
      </label>
    </>
  );

  const sandboxPanel = showSandbox ? (
    <div
      className={`pay-sandbox${isEmbedded ? "" : " pay-sandbox--stack"}`}
      aria-label={payment.sandbox.label}
    >
      <div className="pay-sandbox__head">
        <p className="pay-sandbox__label">{payment.sandbox.label}</p>
        <span className="pay-sandbox__badge">{payment.sandbox.badge}</span>
      </div>
      <p className="pay-sandbox__hint">{payment.sandbox.hint}</p>
      <button type="button" className="pay-sandbox__btn" onClick={handleSandboxPayment}>
        {payment.sandbox.buttonLabel}
      </button>
    </div>
  ) : null;

  if (isEmbedded) {
    return (
      <div className="pay-shell pay-shell--embedded">
        <div className="pay-checkout-grid pay-checkout-grid--embedded">
          <PaperCard title={payment.sections.summary} className="pay-paper-card--summary">
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
              <p className="pay-summary-disclosure-note">{payment.summary.cardProcessingDisclosureNote}</p>
            </div>
          </PaperCard>

          <PaperCard title={payment.sections.form} className="pay-paper-card--form">
            <form className="pay-form" onSubmit={handleSubmit}>
              {billingFields}
              {paymentFields}
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
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                  />
                  <span>{payment.form.termsLabel}</span>
                </label>
              </section>
              <button type="submit" className="pay-submit" disabled={!termsAccepted}>
                {payment.form.submitLabel}
              </button>
              {sandboxPanel}
            </form>
          </PaperCard>
        </div>
      </div>
    );
  }

  return (
    <div className="pay-shell pay-shell--stack">
      <div className="pay-checkout-stack">
        <CheckoutSection title={payment.sections.summary}>
          <h3 className="co-card__subheading">{payment.sections.deliverables}</h3>
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
            <p className="co-investment__label">{payment.summary.investmentLabel}</p>
            <p className="co-investment__total">{planSummary.amountDueTodayDisplay}</p>
            <p className="co-investment__note">{payment.summary.cardProcessingDisclosureNote}</p>
          </div>
        </CheckoutSection>

        <form className="pay-checkout-form" onSubmit={handleSubmit}>
          <CheckoutSection title={payment.sections.billing}>{billingFields}</CheckoutSection>

          <CheckoutSection title={payment.sections.payment}>
            {paymentFields}
            <p className="co-payment-security">{payment.form.paymentSecurityNote}</p>
          </CheckoutSection>

          <CheckoutSection title={payment.sections.next}>
            <ol className="co-next-steps" aria-label={payment.sections.next}>
              {payment.whatsNext.steps.map((step, index) => (
                <li key={step.label} className="co-next-steps__item">
                  <span className="co-next-steps__num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="co-next-steps__label">{step.label}</span>
                </li>
              ))}
            </ol>
            <p className="co-next-steps__reassurance">{payment.whatsNext.emailReassurance}</p>
          </CheckoutSection>

          <CheckoutSection title="" className="co-card--confirm">
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
                checked={termsAccepted}
                onChange={(event) => setTermsAccepted(event.target.checked)}
              />
              <span>{payment.form.termsLabel}</span>
            </label>
            <button
              type="submit"
              className="utility-btn utility-btn--primary co-submit"
              disabled={!termsAccepted}
            >
              {payment.form.submitLabel}
            </button>
            <p className="co-payment-reassurance">{payment.form.paymentReassurance}</p>
            {sandboxPanel}
          </CheckoutSection>
        </form>
      </div>
    </div>
  );
}
