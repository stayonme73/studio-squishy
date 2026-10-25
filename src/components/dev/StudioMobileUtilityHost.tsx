"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  StudioMobileControlsSlot,
  useStudioMobileUtility,
} from "@/components/dev/studio-mobile-utility";

function detectPhoneSheet() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

/**
 * Customer Conversation Room mobile utility only — hosts Studio Controls.
 * Studio Review / Owner shortcuts live in Owner Console (owner-only).
 */
export default function StudioMobileUtilityHost() {
  const pathname = usePathname() || "/";
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const mobileUtility = useStudioMobileUtility();
  const [open, setOpen] = useState(false);
  const [usePhoneSheet, setUsePhoneSheet] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  const showTab = Boolean(mobileUtility?.controlsRegistered);

  function closeUtility() {
    setOpen(false);
  }

  useEffect(() => {
    if (!mobileUtility) return;
    mobileUtility.setCloseUtility(closeUtility);
    return () => mobileUtility.setCloseUtility(null);
  }, [mobileUtility]);

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
      if (event.key === "Escape") closeUtility();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  if (!showTab) return null;

  const isCustomerHomepage = pathname === "/" || pathname === "/studio-lobby";
  if (isCustomerHomepage) return null;

  if (!portalReady) {
    return (
      <div
        className="owner-qa studio-review-mobile-tab"
        data-studio-review-mobile-tab=""
        data-studio-mobile-utility-host=""
      />
    );
  }

  const panelBody = (
    <>
      {usePhoneSheet ? <StudioMobileControlsSlot /> : null}
      <button type="button" className="owner-qa__action" onClick={closeUtility}>
        Close
      </button>
    </>
  );

  const phoneLayer =
    open && usePhoneSheet && portalReady
      ? createPortal(
          <div ref={layerRef} className="owner-qa-phone-layer">
            <button
              type="button"
              className="owner-qa-phone-layer__scrim"
              aria-label="Close Studio Controls"
              onClick={closeUtility}
            />
            <div
              id={panelId}
              className="owner-qa__panel owner-qa__panel--phone"
              role="dialog"
              aria-modal="true"
              aria-label="Studio Controls"
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
        className={`owner-qa studio-review-mobile-tab${open ? " owner-qa--open" : ""}`}
        data-studio-review-mobile-tab=""
        data-studio-mobile-utility-host=""
      >
        {open && !usePhoneSheet ? (
          <div id={panelId} className="owner-qa__panel" role="dialog" aria-label="Studio Controls">
            {panelBody}
          </div>
        ) : null}
        <button
          type="button"
          className="owner-qa__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          Studio Controls
        </button>
      </div>
      {phoneLayer}
    </>
  );
}
