"use client";

import { type CSSProperties } from "react";

import type { StudioGuidePackageId } from "@/config/studio-guide";
import { studioGuide } from "@/config/studio-guide";
import { getStudioGuideV1Package } from "@/config/studio-guide-v1-lock";
import { studioGuidePrototype } from "@/config/studio-guide-prototype";

type Props = {
  packageId: StudioGuidePackageId;
  onClose: () => void;
  onSelect: (packageId: StudioGuidePackageId) => void;
};

function DeliverableSketchIcon() {
  return (
    <svg
      className="sg-proto-proposal-check"
      viewBox="0 0 20 20"
      aria-hidden
      focusable="false"
    >
      <rect
        x="2"
        y="2"
        width="16"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeDasharray="2 1.5"
      />
      <path
        d="M5.5 10.2 L8.4 13.2 L14.8 6.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StudioNoteCheck() {
  return (
    <svg
      className="sg-proto-proposal-note-check"
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

export default function StudioGuideBookletExpand({
  packageId,
  onClose,
  onSelect,
}: Props) {
  const pkg = getStudioGuideV1Package(packageId);
  const accent = studioGuidePrototype.accents[packageId];
  const { copy } = studioGuidePrototype;
  const { whatHappensNext } = studioGuide;

  if (!pkg) return null;

  const deliverableMid = Math.ceil(pkg.deliverables.length / 2);
  const deliverablesLeft = pkg.deliverables.slice(0, deliverableMid);
  const deliverablesRight = pkg.deliverables.slice(deliverableMid);

  const renderDeliverable = (item: (typeof pkg.deliverables)[number]) => (
    <li key={item.title} className="sg-proto-proposal-deliverable">
      <DeliverableSketchIcon />
      <div className="sg-proto-proposal-deliverable-copy">
        <h4>{item.title}</h4>
        {item.lines.length > 0 && (
          <ul>
            {item.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );

  return (
    <div className="sg-proto-proposal-scene" role="presentation">
      <div
        className={`sg-proto-proposal sg-proto-proposal--${packageId}`}
        role="dialog"
        aria-labelledby={`sg-proto-proposal-title-${packageId}`}
        style={
          {
            "--sg-proto-spine": accent.spine,
            "--sg-proto-ink": accent.ink,
          } as CSSProperties
        }
      >
        <div className="sg-proto-proposal-paper-texture" aria-hidden />
        <div className="sg-proto-proposal-fold sg-proto-proposal-fold--left" aria-hidden />
        <div className="sg-proto-proposal-coffee-ring" aria-hidden />

        <div className="sg-proto-proposal-body">
          <header className="sg-proto-proposal-identity">
            <h2 id={`sg-proto-proposal-title-${packageId}`} className="sg-proto-proposal-title">
              {pkg.label}
            </h2>
            <p className="sg-proto-proposal-tagline">{pkg.tagline}</p>
            <p className="sg-proto-proposal-price">{pkg.price}</p>
            <div className="sg-proto-proposal-best-for">
              <h3 className="sg-proto-proposal-section-label">Best For</h3>
              <p>{pkg.bestFor}</p>
            </div>
          </header>

          <aside className="sg-proto-proposal-margin-notes" aria-label="Studio notes">
            <h3 className="sg-proto-hand sg-proto-proposal-margin-heading">Studio Notes</h3>
            <ul className="sg-proto-hand sg-proto-proposal-margin-list">
              {pkg.marginNotes
                .filter((note) => note !== "review below")
                .map((note) => (
                  <li key={note}>
                    <StudioNoteCheck />
                    <span>{note}</span>
                  </li>
                ))}
            </ul>
          </aside>

          <section className="sg-proto-proposal-deliverables" aria-label="What you receive">
            <h3 className="sg-proto-proposal-section-label sg-proto-proposal-section-label--ruled">
              What You Receive
            </h3>
            <div className="sg-proto-proposal-deliverable-grid">
              <ul className="sg-proto-proposal-deliverable-list">
                {deliverablesLeft.map(renderDeliverable)}
              </ul>
              <ul className="sg-proto-proposal-deliverable-list">
                {deliverablesRight.map(renderDeliverable)}
              </ul>
            </div>
          </section>

          <section className="sg-proto-proposal-policies" aria-label="Timeline and policies">
            <div className="sg-proto-proposal-policy-block">
              <h3 className="sg-proto-proposal-section-label">Timeline</h3>
              <p>{pkg.timeline}</p>
            </div>
            <div className="sg-proto-proposal-policy-block">
              <h3 className="sg-proto-proposal-section-label">Revisions</h3>
              <p>{pkg.revisions}</p>
            </div>
            <div className="sg-proto-proposal-policy-block">
              <h3 className="sg-proto-proposal-section-label">Refund Policy</h3>
              <p>{pkg.refundPolicy[0]}</p>
              <p>{pkg.refundPolicy[1]}</p>
            </div>
            <div className="sg-proto-proposal-policy-block sg-proto-proposal-policy-block--next">
              <h3 className="sg-proto-proposal-section-label">{whatHappensNext.title}</h3>
              <ol className="sg-proto-proposal-next-steps">
                {whatHappensNext.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </section>

          <aside className="sg-proto-proposal-cta" aria-label="Approve proposal">
            <button
              type="button"
              className="sg-proto-proposal-close"
              onClick={onClose}
              aria-label={copy.expandClose}
            >
              <span className="sg-proto-hand">↩ Fold Closed</span>
            </button>
            <p className="sg-proto-proposal-cta-heading">Ready to Begin?</p>
            <p className="sg-proto-proposal-cta-lead">
              Approve the proposal and we&apos;ll get started.
            </p>
            <button
              type="button"
              className="sg-proto-proposal-cta-button"
              onClick={() => onSelect(packageId)}
            >
              <DeliverableSketchIcon />
              <span>{pkg.selectCta}</span>
            </button>
            <p className="sg-proto-proposal-cta-note">You&apos;ll review payment details next.</p>
            <p className="sg-proto-proposal-cta-secure">
              <span aria-hidden>🔒</span> Secure · Private · Encrypted
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
