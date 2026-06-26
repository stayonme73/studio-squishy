"use client";

/**
 * @archived Complete Your Order — three-column payment page (journey v1).
 * Active `/payment` re-exports via `src/components/payment/PaymentCheckoutScene.tsx`.
 * @see docs/customer-journey-v1-locked.md
 */

import { type CSSProperties, type FormEvent, type ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import {
  payment,
  paymentIntakeHref,
  paymentPackageAccents,
  paymentSummaryIncludes,
  paymentTimelineLabel,
  paymentWorkflowStepIcon,
  paymentWorkflowStepState,
} from "@/config/payment";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { getStudioGuideV1Package } from "@/config/studio-guide-v1-lock";
import { isPaymentSandboxAvailable, simulateSandboxPayment } from "@/lib/payment-sandbox";
import { markPaymentReceived } from "@/lib/studio-board-campaign";

type Props = {
  packageId: StudioGuidePackageId;
  fromPrototype?: boolean;
};

function SummaryCheckIcon({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 16 16"
      aria-hidden
      focusable="false"
    >
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
  packageId,
  title,
  children,
  className = "",
}: {
  packageId: StudioGuidePackageId;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const accent = paymentPackageAccents[packageId];

  return (
    <section
      className={`pay-paper-card ${className}`.trim()}
      style={{ "--pay-spine": accent.spine } as CSSProperties}
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

/** Archived three-panel checkout — customer-facing title is Secure Checkout. */
export default function CompleteYourOrderCheckoutScene({ packageId, fromPrototype }: Props) {
  const router = useRouter();
  const pkg = getStudioGuideV1Package(packageId);
  const accent = paymentPackageAccents[packageId];
  const includes = paymentSummaryIncludes(packageId);
  const timeline = paymentTimelineLabel(packageId);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const showSandbox = isPaymentSandboxAvailable();

  if (!pkg) return null;

  function completeCheckout() {
    markPaymentReceived(packageId);
    router.push(paymentIntakeHref(packageId));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!termsAccepted) return;
    completeCheckout();
  }

  function handleSandboxPayment() {
    simulateSandboxPayment(packageId);
    router.push(paymentIntakeHref(packageId));
  }

  return (
    <div className="utility-page" aria-label="Secure Checkout">
      <UtilityPageHeader
        backHref={fromPrototype ? payment.routes.studioGuidePrototype : payment.routes.studioGuide}
        activeNav="payment"
        title={payment.title}
        helpCenterFrom="payment"
      />

      <div className="utility-shell pay-shell">
        <div className="pay-checkout-grid">
          <PaperCard packageId={packageId} title={payment.sections.summary} className="pay-paper-card--summary">
            <p className="pay-summary-package">{pkg.label}</p>
            <p className="pay-summary-tagline">{pkg.tagline}</p>
            <p className="pay-summary-price">{pkg.price}</p>

            <div className="pay-summary-includes">
              <p className="pay-summary-includes-label">{payment.summary.includesLabel}</p>
              <ul className="pay-summary-includes-list">
                {includes.map((item) => (
                  <li key={item}>
                    <SummaryCheckIcon className="pay-summary-check" style={{ color: accent.check }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="pay-summary-timeline">
              <span className="pay-label">{payment.summary.timelineLabel}</span>
              {timeline}
            </p>
          </PaperCard>

          <PaperCard packageId={packageId} title={payment.sections.form} className="pay-paper-card--form">
            <form className="pay-form" onSubmit={handleSubmit}>
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
              <label className="pay-terms">
                <input
                  type="checkbox"
                  name="terms"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                />
                <span>{payment.form.termsLabel}</span>
              </label>
              <button type="submit" className="pay-submit" disabled={!termsAccepted}>
                {payment.form.submitLabel}
              </button>
              {showSandbox ? (
                <div className="pay-sandbox" aria-label={payment.sandbox.label}>
                  <div className="pay-sandbox__head">
                    <p className="pay-sandbox__label">{payment.sandbox.label}</p>
                    <span className="pay-sandbox__badge">{payment.sandbox.badge}</span>
                  </div>
                  <p className="pay-sandbox__hint">{payment.sandbox.hint}</p>
                  <button
                    type="button"
                    className="pay-sandbox__btn"
                    onClick={handleSandboxPayment}
                  >
                    {payment.sandbox.buttonLabel}
                  </button>
                </div>
              ) : null}
            </form>
          </PaperCard>

          <PaperCard packageId={packageId} title={payment.sections.next} className="pay-paper-card--next">
            <p className="pay-next-current-label">{payment.whatsNext.currentStepLabel}</p>
            <ol className="pay-next-steps">
              {payment.whatsNext.steps.map((step, index) => {
                const state = paymentWorkflowStepState(index, payment.workflowStepIndex.payment);
                return (
                  <li
                    key={step}
                    className={`pay-next-steps__item pay-next-steps__item--${state}`}
                  >
                    <span className="pay-next-step-icon" aria-hidden="true">
                      {paymentWorkflowStepIcon(state)}
                    </span>
                    <span>{step}</span>
                  </li>
                );
              })}
            </ol>
            <p className="pay-next-secure">{payment.secureNote}</p>
          </PaperCard>
        </div>
      </div>
    </div>
  );
}
