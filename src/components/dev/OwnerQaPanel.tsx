"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import OwnerQaStudioSystem from "@/components/dev/OwnerQaStudioSystem";
import { performDevClientTestReset } from "@/lib/dev-reset-client-test-state";
import { ownerQa } from "@/config/owner-qa";
import { studioLobbyEntryV1 } from "@/config/studio-lobby-entry-v1";
import { applyOwnerQaJourneySeed } from "@/lib/owner-qa-campaign";
import { buildOwnerQaJourneyView } from "@/lib/owner-qa-journey-view";
import { readCurrentCampaign } from "@/lib/studio-board-campaign";
import { withStudioPaymentSandboxQuery } from "@/lib/studio-payment/sandbox-query";
import {
  StudioMobileControlsSlot,
  useStudioMobileUtility,
} from "@/components/dev/studio-mobile-utility";
import type { CampaignRecord } from "@/config/studio-board";

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

/** Shared Mobile bottom utility — Welcome Studio Review tab is the visual master. */
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
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null);
  const mobileUtility = useStudioMobileUtility();
  const ownerTools = process.env.NODE_ENV === "development";
  const showTab = ownerTools || Boolean(mobileUtility?.controlsRegistered);

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
    if (!mobileUtility) return;
    mobileUtility.setCloseUtility(closeReview);
    return () => mobileUtility.setCloseUtility(null);
    // closeReview reads the current path/query via replace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileUtility, pathname, searchParams]);

  useEffect(() => {
    setCampaign(readCurrentCampaign());
  }, [open, pathname]);

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
    if (!open || !ownerTools) return;

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
  }, [open, pathname, ownerTools]);

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
    window.location.assign(
      withStudioPaymentSandboxQuery(href, window.location.search),
    );
  }

  function handleShortcutLink(href: string) {
    window.location.assign(
      withStudioPaymentSandboxQuery(href, window.location.search),
    );
  }

  function handleResetRequest() {
    setConfirmResetOpen(true);
  }

  function handleResetCancel() {
    setConfirmResetOpen(false);
  }

  async function handleResetConfirm() {
    await performDevClientTestReset();
    window.location.assign(
      withStudioPaymentSandboxQuery(
        studioLobbyEntryV1.routes.frontDoor,
        window.location.search,
      ),
    );
  }

  if (!showTab) return null;

  /* Isolate the proof tab until after mount so Link/button cannot hydrate-mismatch. */
  if (!portalReady) {
    return (
      <div
        className="owner-qa studio-review-mobile-tab"
        data-studio-review-mobile-tab=""
      />
    );
  }

  const journeyView = buildOwnerQaJourneyView({
    pathname,
    search: searchParams.toString(),
    campaign,
  });

  const panelBody = (
    <>
      {usePhoneSheet ? <StudioMobileControlsSlot /> : null}
      {ownerTools ? (
        <OwnerQaStudioSystem
          view={journeyView}
          confirmId={confirmId}
          confirmResetOpen={confirmResetOpen}
          devicePreview={devicePreview}
          devicePreviewError={devicePreviewError}
          devicePreviewLoading={devicePreviewLoading}
          copyState={copyState}
          onClose={closeReview}
          onCopyUrl={handleCopyPreviewUrl}
          onJourney={handleJourney}
          onShortcut={handleShortcutLink}
          onResetRequest={handleResetRequest}
          onResetCancel={handleResetCancel}
          onResetConfirm={handleResetConfirm}
        />
      ) : (
        <button type="button" className="owner-qa__action" onClick={closeReview}>
          Close
        </button>
      )}
    </>
  );

  const isCustomerHomepage = pathname === "/" || pathname === "/studio-lobby";
  if (isCustomerHomepage && !ownerTools) {
    return null;
  }
  const homepageLocalOnly = isCustomerHomepage && ownerTools;
  const reviewToggleLabel = !ownerTools
    ? "Studio Controls"
    : homepageLocalOnly
      ? "local"
      : "Studio Review";
  const reviewAriaLabel = ownerTools ? "Studio Review" : "Studio Controls";

  const phoneLayer =
    open && usePhoneSheet && portalReady
      ? createPortal(
          <div ref={layerRef} className="owner-qa-phone-layer">
            <button
              type="button"
              className="owner-qa-phone-layer__scrim"
              aria-label={ownerTools ? "Close Studio Review" : "Close Studio Controls"}
              onClick={closeReview}
            />
            <div
              id={panelId}
              className="owner-qa__panel owner-qa__panel--phone"
              role="dialog"
              aria-modal="true"
              aria-label={reviewAriaLabel}
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
      <div
        ref={rootRef}
        className={`owner-qa studio-review-mobile-tab${open ? " owner-qa--open" : ""}${homepageLocalOnly ? " owner-qa--homepage-local" : ""}`}
        data-studio-review-mobile-tab=""
      >
        {open && !usePhoneSheet ? (
          <div id={panelId} className="owner-qa__panel" role="dialog" aria-label={reviewAriaLabel}>
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
            {reviewToggleLabel}
          </button>
        ) : (
          <Link
            href={openHref}
            scroll={false}
            className="owner-qa__toggle"
            aria-expanded={false}
            aria-controls={panelId}
            aria-label={homepageLocalOnly ? "Local Studio Review" : reviewAriaLabel}
          >
            {reviewToggleLabel}
          </Link>
        )}
      </div>
      {phoneLayer}
    </>
  );
}
