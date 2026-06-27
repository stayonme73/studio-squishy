"use client";

/**
 * @archived Complete Your Order — three-column payment page (journey v1).
 * Active `/payment` re-exports via `src/components/payment/PaymentCheckoutScene.tsx`.
 * @see docs/customer-journey-v1-locked.md
 */

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { payment, paymentIntakeHref } from "@/config/payment";
import type { StudioGuidePackageId } from "@/config/studio-guide";
import { getStudioGuideV1Package } from "@/config/studio-guide-v1-lock";
import { buildPaymentPlanSummary } from "@/lib/payment-plan-summary";
import { isPaymentSandboxAvailable, simulateSandboxPayment } from "@/lib/payment-sandbox";
import { markPaymentReceived } from "@/lib/studio-board-campaign";

type Props = {
  packageId: StudioGuidePackageId;
  fromPrototype?: boolean;
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

/** Archived three-panel checkout — Studio Plan approved, payment to begin project. */
export default function CompleteYourOrderCheckoutScene({ packageId }: Props) {
  const router = useRouter();
  const pkg = getStudioGuideV1Package(packageId);
  const planSummary = useMemo(() => buildPaymentPlanSummary(packageId), [packageId]);
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
    <div className="utility-page payment-page" aria-label={payment.pageTitle}>
      <div className="utility-shell pay-shell">
        <div className="pay-checkout-grid">
          <PaperCard title={payment.sections.summary} className="pay-paper-card--summary">
            <p className="pay-summary-includes-label">{payment.summary.recommendedServicesLabel}</p>
            <ul className="pay-summary-includes-list">
              {planSummary.services.map((item) => (
                <li key={item}>
                  <SummaryCheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="pay-summary-investment">
              <p className="pay-summary-includes-label">{planSummary.investmentLabel}</p>
              <p className="pay-summary-price">{planSummary.investmentDisplay}</p>
            </div>
          </PaperCard>

          <PaperCard title={payment.sections.form} className="pay-paper-card--form">
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

          <PaperCard title={payment.sections.next} className="pay-paper-card--next">
            <p className="pay-next-intro">{payment.whatsNext.intro}</p>
            <ul className="pay-next-steps">
              {payment.whatsNext.steps.map((step) => (
                <li key={step} className="pay-next-steps__item">
                  <SummaryCheckIcon />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
            <p className="pay-next-secure">{payment.secureNote}</p>
          </PaperCard>
        </div>
      </div>
    </div>
  );
}
