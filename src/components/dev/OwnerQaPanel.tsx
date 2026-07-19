"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { performDevClientTestReset } from "@/lib/dev-reset-client-test-state";
import { ownerQa } from "@/config/owner-qa";
import { studioBoard } from "@/config/studio-board";
import { applyOwnerQaJourneySeed } from "@/lib/owner-qa-campaign";

type DevicePreview = {
  pageLabel: string;
  url: string;
  usedLan: boolean;
  note: string | null;
  qrDataUrl: string;
};

const REVIEW_PARAM = "studioReview";

function detectPhoneSheet() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

/** Development-only owner nav — journey presets + utility shortcuts. */
export default function OwnerQaPanel() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const panelId = useId();
  const confirmId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const open = searchParams.get(REVIEW_PARAM) === "1";
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [devicePreview, setDevicePreview] = useState<DevicePreview | null>(null);
  const [devicePreviewError, setDevicePreviewError] = useState<string | null>(null);
  const [devicePreviewLoading, setDevicePreviewLoading] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [usePhoneSheet, setUsePhoneSheet] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  const openHref = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(REVIEW_PARAM, "1");
    const query = params.toString();
    return `${pathname}?${query}`;
  }, [pathname, searchParams]);

  function closeReview() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(REVIEW_PARAM);
    const query = params.toString();
    setConfirmResetOpen(false);
    setCopyState("idle");
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  useEffect(() => {
    setPortalReady(true);
    const sync = () => setUsePhoneSheet(detectPhoneSheet());
    sync();
    const widthMedia = window.matchMedia("(max-width: 900px)");
    const coarseMedia = window.matchMedia("(pointer: coarse)");
    widthMedia.addEventListener("change", sync);
    coarseMedia.addEventListener("change", sync);
    return () => {
      widthMedia.removeEventListener("change", sync);
      coarseMedia.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (confirmResetOpen) {
        setConfirmResetOpen(false);
        return;
      }
      closeReview();
    }

    document.addEventListener("keydown", handleEscape);

    /* Phone/Samsung: Close + scrim only — ghost pointerdowns kill the sheet. */
    if (usePhoneSheet) {
      return () => document.removeEventListener("keydown", handleEscape);
    }

    let dismissReady = false;
    const readyTimer = window.setTimeout(() => {
      dismissReady = true;
    }, 320);

    function handleOutsidePointer(event: PointerEvent) {
      if (!dismissReady) return;
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || layerRef.current?.contains(target)) {
        return;
      }
      closeReview();
    }

    document.addEventListener("pointerdown", handleOutsidePointer, true);
    return () => {
      window.clearTimeout(readyTimer);
      document.removeEventListener("pointerdown", handleOutsidePointer, true);
      document.removeEventListener("keydown", handleEscape);
    };
    // closeReview uses current searchParams/pathname via replace; intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open/sheet/confirm only
  }, [open, confirmResetOpen, usePhoneSheet, pathname, searchParams]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    setDevicePreviewLoading(true);
    setDevicePreviewError(null);
    setCopyState("idle");

    const params = new URLSearchParams({
      pathname: window.location.pathname || pathname,
      search: window.location.search || "",
    });

    fetch(`/api/dev/device-preview?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not build device preview URL.");
        }
        return (await response.json()) as DevicePreview;
      })
      .then((payload) => {
        setDevicePreview(payload);
        setDevicePreviewLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setDevicePreview(null);
        setDevicePreviewLoading(false);
        setDevicePreviewError(
          error instanceof Error ? error.message : "Could not build device preview URL.",
        );
      });

    return () => controller.abort();
  }, [open, pathname]);

  async function handleCopyPreviewUrl() {
    if (!devicePreview?.url) return;
    try {
      await navigator.clipboard.writeText(devicePreview.url);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  function handleJourney(href: string, seed: (typeof ownerQa.journeyPresets)[number]["seed"]) {
    applyOwnerQaJourneySeed(seed);
    /* Full navigation — router.replace(close) + router.push races on Samsung. */
    window.location.assign(href);
  }

  function handleShortcutLink(href: string) {
    window.location.assign(href);
  }

  function handleResetRequest() {
    setConfirmResetOpen(true);
  }

  function handleResetCancel() {
    setConfirmResetOpen(false);
  }

  async function handleResetConfirm() {
    await performDevClientTestReset();
    window.location.assign(studioBoard.routes.studioLobby);
  }

  const panelBody = (
    <>
      <p className="owner-qa__title">Studio Review</p>
      <p className="owner-qa__hint">{ownerQa.panelHint}</p>

      <section className="owner-qa__section" aria-label="Samsung device preview">
        <h2 className="owner-qa__section-title">Phone review (QR)</h2>
        <p className="owner-qa__device-page">
          {devicePreview?.pageLabel ?? "Current page"}
        </p>
        {devicePreviewLoading ? (
          <p className="owner-qa__device-note">Building QR for this page…</p>
        ) : null}
        {devicePreviewError ? (
          <p className="owner-qa__device-note owner-qa__device-note--warn">
            {devicePreviewError}
          </p>
        ) : null}
        {devicePreview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="owner-qa__qr"
              src={devicePreview.qrDataUrl}
              alt={`QR code for ${devicePreview.pageLabel}`}
              width={220}
              height={220}
            />
            <p className="owner-qa__device-url">{devicePreview.url}</p>
            {devicePreview.note ? (
              <p className="owner-qa__device-note owner-qa__device-note--warn">
                {devicePreview.note}
              </p>
            ) : (
              <p className="owner-qa__device-note">
                Scan with your Samsung camera to open this page (Lobby view — Studio Review
                stays closed). Phone and computer must be on the same Wi‑Fi.
              </p>
            )}
            <div className="owner-qa__device-actions">
              <button
                type="button"
                className="owner-qa__action"
                onClick={handleCopyPreviewUrl}
              >
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Copy failed"
                    : "Copy URL"}
              </button>
              <button type="button" className="owner-qa__action" onClick={closeReview}>
                Close
              </button>
            </div>
          </>
        ) : null}
      </section>

      <section className="owner-qa__section">
        <h2 className="owner-qa__section-title">{ownerQa.customerJourneySectionTitle}</h2>
        <div className="owner-qa__presets">
          {ownerQa.journeyPresets.map((preset) => (
            <a
              key={preset.id}
              href={preset.href}
              className="owner-qa__preset"
              onClick={(event) => {
                event.preventDefault();
                handleJourney(preset.href, preset.seed);
              }}
            >
              <span className="owner-qa__preset-label">{preset.label}</span>
              {preset.description ? (
                <span className="owner-qa__preset-desc">{preset.description}</span>
              ) : null}
            </a>
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
              <a
                key={shortcut.id}
                href={shortcut.href}
                className="owner-qa__link"
                onClick={(event) => {
                  event.preventDefault();
                  handleShortcutLink(shortcut.href);
                }}
              >
                <span className="owner-qa__preset-label">{shortcut.label}</span>
                {shortcut.description ? (
                  <span className="owner-qa__preset-desc">{shortcut.description}</span>
                ) : null}
              </a>
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
    </>
  );

  const phoneLayer =
    open && usePhoneSheet && portalReady
      ? createPortal(
          <div ref={layerRef} className="owner-qa-phone-layer">
            <button
              type="button"
              className="owner-qa-phone-layer__scrim"
              aria-label="Close Studio Review"
              onClick={closeReview}
            />
            <div
              id={panelId}
              className="owner-qa__panel owner-qa__panel--phone"
              role="dialog"
              aria-modal="true"
              aria-label="Studio Review"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {panelBody}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={rootRef} className={`owner-qa${open ? " owner-qa--open" : ""}`}>
        {open && !usePhoneSheet ? (
          <div id={panelId} className="owner-qa__panel" role="dialog" aria-label="Studio Review">
            {panelBody}
          </div>
        ) : null}

        {open ? (
          <button
            type="button"
            className="owner-qa__toggle"
            aria-expanded
            aria-controls={panelId}
            onClick={closeReview}
          >
            Studio Review
          </button>
        ) : (
          <Link
            href={openHref}
            scroll={false}
            className="owner-qa__toggle"
            aria-expanded={false}
            aria-controls={panelId}
          >
            Studio Review
          </Link>
        )}
      </div>
      {phoneLayer}
    </>
  );
}
