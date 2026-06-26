"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { ownerQa, type OwnerQaJourneySeed } from "@/config/owner-qa";
import {
  applyOwnerQaPaidAwaitingIntake,
  applyOwnerQaStatus,
} from "@/lib/owner-qa-campaign";
import { clearCampaignState } from "@/lib/studio-board-campaign";

/** Development-only owner nav — journey presets + utility shortcuts. */
export default function OwnerQaPanel() {
  const router = useRouter();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function closePanel() {
    setOpen(false);
  }

  function applySeed(seed: OwnerQaJourneySeed) {
    if (seed.kind === "reset") {
      clearCampaignState();
      return;
    }
    if (seed.kind === "paid-awaiting-intake") {
      applyOwnerQaPaidAwaitingIntake(seed.packageId);
      return;
    }
    applyOwnerQaStatus(seed.status);
  }

  function handleJourney(href: string, seed: OwnerQaJourneySeed) {
    applySeed(seed);
    closePanel();
    router.push(href);
    router.refresh();
  }

  function handleReset() {
    clearCampaignState();
    closePanel();
    router.refresh();
  }

  return (
    <div ref={rootRef} className={`owner-qa${open ? " owner-qa--open" : ""}`}>
      {open ? (
        <div id={panelId} className="owner-qa__panel" role="dialog" aria-label="Studio Review">
          <p className="owner-qa__title">Studio Review</p>
          <p className="owner-qa__hint">Jump the product journey. Development only.</p>

          <section className="owner-qa__section">
            <h2 className="owner-qa__section-title">Journey</h2>
            <div className="owner-qa__presets">
              {ownerQa.journeyPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="owner-qa__preset"
                  onClick={() => handleJourney(preset.href, preset.seed)}
                >
                  <span className="owner-qa__preset-label">{preset.label}</span>
                  {preset.description ? (
                    <span className="owner-qa__preset-desc">{preset.description}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </section>

          <section className="owner-qa__section">
            <h2 className="owner-qa__section-title">Shortcuts</h2>
            <div className="owner-qa__links">
              {ownerQa.shortcuts.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className="owner-qa__link"
                  onClick={closePanel}
                >
                  {page.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="owner-qa__section">
            <button
              type="button"
              className="owner-qa__action owner-qa__action--danger owner-qa__action--wide"
              onClick={handleReset}
            >
              Reset campaign
            </button>
          </section>
        </div>
      ) : null}

      <button
        type="button"
        className="owner-qa__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        Studio Review
      </button>
    </div>
  );
}
