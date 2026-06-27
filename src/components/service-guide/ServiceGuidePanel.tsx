"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  CLIENT_ACCESS_BOILERPLATE,
  CLIENT_MATERIALS_BOILERPLATE,
  SERVICE_GUIDE_COPY,
} from "@/config/service-guide";
import type { ServiceGuideModel } from "@/service-guide";

type Props = {
  open: boolean;
  guide: ServiceGuideModel | null;
  onClose: () => void;
};

/** Slide-out Service Guide — Campaign Record drawer pattern, Project Summary styling. */
export default function ServiceGuidePanel({ open, guide, onClose }: Props) {
  const panelRef = useRef<HTMLElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open || !guide) return null;

  const billingLabel =
    guide.billingType === "monthly"
      ? SERVICE_GUIDE_COPY.billingMonthly
      : SERVICE_GUIDE_COPY.billingOneTime;

  return (
    <div className="ps-service-guide" role="presentation">
      <button
        type="button"
        className="ps-service-guide__backdrop"
        aria-label={SERVICE_GUIDE_COPY.closeLabel}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className="ps-service-guide__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ps-service-guide-title"
        tabIndex={-1}
      >
        <header className="ps-service-guide__header">
          <div className="ps-service-guide__header-copy">
            <p className="ps-service-guide__eyebrow">{SERVICE_GUIDE_COPY.panelTitle}</p>
            <h2 id="ps-service-guide-title" className="ps-service-guide__title">
              {guide.serviceName}
            </h2>
          </div>
          <button
            type="button"
            className="ps-service-guide__close"
            onClick={onClose}
          >
            {SERVICE_GUIDE_COPY.closeLabel}
          </button>
        </header>

        <div className="ps-service-guide__body">
          <section className="ps-service-guide__section">
            <h3 className="ps-service-guide__section-title">{SERVICE_GUIDE_COPY.purposeLabel}</h3>
            <p className="ps-service-guide__text">{guide.purpose}</p>
          </section>

          <section className="ps-service-guide__section ps-service-guide__section--meta">
            <div className="ps-service-guide__meta-row">
              <span className="ps-service-guide__meta-label">{SERVICE_GUIDE_COPY.priceLabel}</span>
              <span className="ps-service-guide__meta-value">{guide.priceDisplay}</span>
            </div>
            <div className="ps-service-guide__meta-row">
              <span className="ps-service-guide__meta-label">{SERVICE_GUIDE_COPY.billingLabel}</span>
              <span className="ps-service-guide__meta-value">{billingLabel}</span>
            </div>
          </section>

          {guide.parentSkuId ? (
            <section className="ps-service-guide__section">
              <h3 className="ps-service-guide__section-title">{SERVICE_GUIDE_COPY.parentServiceLabel}</h3>
              <p className="ps-service-guide__text">
                {guide.parentServiceName ?? guide.parentSkuId}
              </p>
            </section>
          ) : null}

          <section className="ps-service-guide__section">
            <h3 className="ps-service-guide__section-title">{SERVICE_GUIDE_COPY.deliverablesLabel}</h3>
            <ul className="ps-service-guide__list">
              {guide.deliverables.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="ps-service-guide__section">
            <h3 className="ps-service-guide__section-title">{SERVICE_GUIDE_COPY.exclusionsLabel}</h3>
            <ul className="ps-service-guide__list">
              {guide.exclusions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="ps-service-guide__section">
            <h3 className="ps-service-guide__section-title">{SERVICE_GUIDE_COPY.timingLabel}</h3>
            <p className="ps-service-guide__text">{guide.timingWindow.label}</p>
          </section>

          <section className="ps-service-guide__section">
            <h3 className="ps-service-guide__section-title">{SERVICE_GUIDE_COPY.revisionLabel}</h3>
            <p className="ps-service-guide__text">{guide.revisionRule}</p>
          </section>

          <section className="ps-service-guide__section">
            <h3 className="ps-service-guide__section-title">
              {SERVICE_GUIDE_COPY.clientResponsibilitiesLabel}
            </h3>
            <ul className="ps-service-guide__list">
              {guide.clientResponsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {guide.requiresClientAccess ? (
              <p className="ps-service-guide__note">{CLIENT_ACCESS_BOILERPLATE}</p>
            ) : null}
            {guide.requiresClientMaterials ? (
              <p className="ps-service-guide__note">{CLIENT_MATERIALS_BOILERPLATE}</p>
            ) : null}
          </section>

          <section className="ps-service-guide__section">
            <h3 className="ps-service-guide__section-title">{SERVICE_GUIDE_COPY.executionLabel}</h3>
            <p className="ps-service-guide__text">{guide.executionResponsibility}</p>
          </section>

          {guide.faq.length > 0 ? (
            <section className="ps-service-guide__section">
              <h3 className="ps-service-guide__section-title">{SERVICE_GUIDE_COPY.faqLabel}</h3>
              <dl className="ps-service-guide__faq">
                {guide.faq.map((item) => (
                  <div key={item.question} className="ps-service-guide__faq-item">
                    <dt className="ps-service-guide__faq-q">{item.question}</dt>
                    <dd className="ps-service-guide__faq-a">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
