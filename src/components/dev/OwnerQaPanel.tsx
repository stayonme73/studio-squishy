"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import {
  performDevClientTestReset,
  stripActiveCampaignSearchParams,
} from "@/lib/dev-reset-client-test-state";
import { ownerQa } from "@/config/owner-qa";
import { studioBoard } from "@/config/studio-board";
import { applyOwnerQaJourneySeed } from "@/lib/owner-qa-campaign";

/** Development-only owner nav — journey presets + utility shortcuts. */
export default function OwnerQaPanel() {
  const router = useRouter();
  const panelId = useId();
  const confirmId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setConfirmResetOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (confirmResetOpen) {
        setConfirmResetOpen(false);
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, confirmResetOpen]);

  function closePanel() {
    setOpen(false);
    setConfirmResetOpen(false);
  }

  function handleJourney(href: string, seed: (typeof ownerQa.journeyPresets)[number]["seed"]) {
    applyOwnerQaJourneySeed(seed);
    closePanel();
    router.push(href);
    router.refresh();
  }

  function handleShortcutLink(href: string) {
    closePanel();
    router.push(href);
    router.refresh();
  }

  function handleResetRequest() {
    setConfirmResetOpen(true);
  }

  function handleResetCancel() {
    setConfirmResetOpen(false);
  }

  async function handleResetConfirm() {
    await performDevClientTestReset();
    closePanel();
    router.push(studioBoard.routes.studioLobby);
    router.refresh();
  }

  return (
    <div ref={rootRef} className={`owner-qa${open ? " owner-qa--open" : ""}`}>
      {open ? (
        <div id={panelId} className="owner-qa__panel" role="dialog" aria-label="Studio Review">
          <p className="owner-qa__title">Studio Review</p>
          <p className="owner-qa__hint">Jump the product journey. Development only.</p>

          <section className="owner-qa__section">
            <h2 className="owner-qa__section-title">Active Pages</h2>
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
              {ownerQa.shortcuts.map((shortcut) =>
                shortcut.kind === "reset" ? (
                  <button
                    key={shortcut.id}
                    type="button"
                    className="owner-qa__action owner-qa__action--danger"
                    onClick={handleResetRequest}
                    aria-expanded={confirmResetOpen}
                    aria-controls={confirmId}
                  >
                    {shortcut.label}
                  </button>
                ) : (
                  <button
                    key={shortcut.id}
                    type="button"
                    className="owner-qa__link"
                    onClick={() => handleShortcutLink(shortcut.href)}
                  >
                    <span className="owner-qa__preset-label">{shortcut.label}</span>
                    {shortcut.description ? (
                      <span className="owner-qa__preset-desc">{shortcut.description}</span>
                    ) : null}
                  </button>
                ),
              )}
            </div>
          </section>

          {confirmResetOpen ? (
            <div
              id={confirmId}
              className="owner-qa__confirm"
              role="alertdialog"
              aria-labelledby={`${confirmId}-title`}
              aria-describedby={`${confirmId}-desc`}
            >
              <p id={`${confirmId}-title`} className="owner-qa__confirm-title">
                Reset campaign?
              </p>
              <p id={`${confirmId}-desc`} className="owner-qa__confirm-desc">
                Clears discovery answers, approved plan, payment state, project details, uploads,
                and all other campaign data in this browser. You will return to a clean Studio Lobby.
              </p>
              <div className="owner-qa__confirm-actions">
                <button type="button" className="owner-qa__action" onClick={handleResetCancel}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="owner-qa__action owner-qa__action--danger"
                  onClick={handleResetConfirm}
                >
                  Reset campaign
                </button>
              </div>
            </div>
          ) : null}
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
