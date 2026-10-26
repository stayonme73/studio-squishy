"use client";

import { ownerQa } from "@/config/owner-qa";
import type { OwnerQaJourneyView, OwnerQaStepStatus } from "@/lib/owner-qa-journey-view";
import type { OwnerQaJourneySeedKind } from "@/lib/owner-qa-campaign";

type DevicePreview = {
  pageLabel: string;
  url: string;
  usedLan: boolean;
  note: string | null;
  qrDataUrl: string;
};

type Props = {
  view: OwnerQaJourneyView;
  confirmId: string;
  confirmResetOpen: boolean;
  devicePreview: DevicePreview | null;
  devicePreviewError: string | null;
  devicePreviewLoading: boolean;
  copyState: "idle" | "copied" | "failed";
  onClose: () => void;
  onCopyUrl: () => void;
  onJourney: (href: string, seed: OwnerQaJourneySeedKind) => void;
  onShortcut: (href: string) => void;
  onResetRequest: () => void;
  onResetCancel: () => void;
  onResetConfirm: () => void;
};

function statusClass(status: OwnerQaStepStatus): string {
  if (status === "COMPLETE") return "owner-qa__step--done";
  if (status === "ACTIVE" || status === "READY" || status === "WAITING") return "owner-qa__step--current";
  return "owner-qa__step--future";
}

export default function OwnerQaStudioSystem(props: Props) {
  const tools = ownerQa.shortcuts.filter((item) => item.kind === "link");
  const reset = ownerQa.shortcuts.find((item) => item.kind === "reset");

  return (
    <div className="owner-qa__system">
      <header className="owner-qa__topbar">
        <p className="owner-qa__brand">{ownerQa.brand}</p>
        <div className="owner-qa__top-meta">
          <span>{props.view.stageLabel}</span>
          <span className="owner-qa__status-dot">{props.view.projectStatus}</span>
          <span className="owner-qa__mode">{ownerQa.reviewModeLabel}</span>
          <button type="button" className="owner-qa__close" onClick={props.onClose}>
            Close
          </button>
        </div>
      </header>

      <section className="owner-qa__summary" aria-label="Project summary">
        <p className="owner-qa__kicker">Project / Service</p>
        <h2>{props.view.projectLabel}</h2>
        {props.view.customerName ? (
          <p className="owner-qa__summary-line">
            <span>Customer</span>
            {props.view.customerName}
          </p>
        ) : null}
        <p className="owner-qa__summary-line">
          <span>Current Stage</span>
          {props.view.stageLabel}
        </p>
        <p className="owner-qa__summary-line">
          <span>Status</span>
          {props.view.projectStatus}
        </p>
        <p className="owner-qa__next">{props.view.nextAction}</p>
        <button
          type="button"
          className="owner-qa__primary"
          onClick={() => props.onJourney(props.view.current.href, props.view.current.seed)}
        >
          Go to current stage
        </button>
      </section>

      <section className="owner-qa__journey" aria-label={ownerQa.customerJourneySectionTitle}>
        <h2>{ownerQa.customerJourneySectionTitle}</h2>
        {ownerQa.journeyPhases.map((phase) => (
          <div key={phase.id} className="owner-qa__phase">
            <h3>{phase.heading}</h3>
            <div className="owner-qa__steps">
              {phase.stepIds.map((stepId) => {
                const preset = ownerQa.journeyPresets.find((item) => item.id === stepId);
                if (!preset) return null;
                const status = props.view.stepStatus[preset.id];
                const number = ownerQa.journeyPresets.findIndex((item) => item.id === preset.id) + 1;
                return (
                  <a
                    key={preset.id}
                    href={preset.href}
                    className={`owner-qa__step ${statusClass(status)}`}
                    onClick={(event) => {
                      event.preventDefault();
                      props.onJourney(preset.href, preset.seed);
                    }}
                  >
                    <span className="owner-qa__step-num">{number}</span>
                    <span className="owner-qa__step-copy">
                      <strong>{preset.label}</strong>
                      <em>{preset.description}</em>
                    </span>
                    <span className="owner-qa__step-status">{status}</span>
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <details className="owner-qa__fold">
        <summary>Studio Tools</summary>
        <div className="owner-qa__fold-body">
          {tools.map((tool) => (
            <a
              key={tool.id}
              href={tool.href}
              className="owner-qa__tool"
              onClick={(event) => {
                event.preventDefault();
                props.onShortcut(tool.href);
              }}
            >
              <strong>{tool.label}</strong>
              {tool.description ? <span>{tool.description}</span> : null}
            </a>
          ))}
        </div>
      </details>

      <details className="owner-qa__fold owner-qa__fold--internal">
        <summary>Review Tools</summary>
        <div className="owner-qa__fold-body">
          <p className="owner-qa__hint">{ownerQa.panelHint}</p>
          <p className="owner-qa__device-page">{props.devicePreview?.pageLabel ?? "Current page"}</p>
          {props.devicePreviewLoading ? (
            <p className="owner-qa__device-note">Building QR for this page…</p>
          ) : null}
          {props.devicePreviewError ? (
            <p className="owner-qa__device-note owner-qa__device-note--warn">{props.devicePreviewError}</p>
          ) : null}
          {props.devicePreview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="owner-qa__qr"
                src={props.devicePreview.qrDataUrl}
                alt={`QR code for ${props.devicePreview.pageLabel}`}
                width={220}
                height={220}
              />
              <p className="owner-qa__device-url">{props.devicePreview.url}</p>
              {props.devicePreview.note ? (
                <p className="owner-qa__device-note owner-qa__device-note--warn">{props.devicePreview.note}</p>
              ) : (
                <p className="owner-qa__device-note">
                  Scan with your Samsung camera to open this page (Lobby view — Studio Review
                  stays closed). Phone and computer must be on the same Wi‑Fi.
                </p>
              )}
              <div className="owner-qa__device-actions">
                <button type="button" className="owner-qa__action" onClick={props.onCopyUrl}>
                  {props.copyState === "copied"
                    ? "Copied"
                    : props.copyState === "failed"
                      ? "Copy failed"
                      : "Copy URL"}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </details>

      <details className="owner-qa__fold owner-qa__fold--danger">
        <summary>Reset / Test Controls</summary>
        <div className="owner-qa__fold-body">
          {reset ? (
            <button
              type="button"
              className="owner-qa__action owner-qa__action--danger"
              onClick={props.onResetRequest}
              aria-expanded={props.confirmResetOpen}
              aria-controls={props.confirmId}
            >
              {reset.label}
            </button>
          ) : null}
          {props.confirmResetOpen ? (
            <div
              id={props.confirmId}
              className="owner-qa__confirm"
              role="alertdialog"
              aria-labelledby={`${props.confirmId}-title`}
              aria-describedby={`${props.confirmId}-desc`}
            >
              <p id={`${props.confirmId}-title`} className="owner-qa__confirm-title">
                Reset campaign?
              </p>
              <p id={`${props.confirmId}-desc`} className="owner-qa__confirm-desc">
                Clears discovery answers, approved plan, payment state, project details, uploads,
                and all other campaign data in this browser. You will return to a clean Studio Lobby.
              </p>
              <div className="owner-qa__confirm-actions">
                <button type="button" className="owner-qa__action" onClick={props.onResetCancel}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="owner-qa__action owner-qa__action--danger"
                  onClick={props.onResetConfirm}
                >
                  Reset campaign
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
