"use client";

import { useCallback, useEffect, useState } from "react";

import { ownerConsoleWebsiteInspectionV1 as inspection } from "@/config/owner-console-website-inspection-v1";
import { parseDevDevicePreviewHref } from "@/lib/dev-device-preview";

type DevicePreview = {
  pageLabel: string;
  url: string;
  usedLan: boolean;
  note: string | null;
  qrDataUrl: string;
};

const defaultPreviewHref =
  inspection.shortcuts.journey[0]?.href ?? "/";

export default function FileRoomOwnerConsoleWebsiteInspection() {
  const [previewHref, setPreviewHref] = useState(defaultPreviewHref);
  const [preview, setPreview] = useState<DevicePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const devPreview = process.env.NODE_ENV === "development";

  const loadPreview = useCallback(async (href: string) => {
    if (!devPreview) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setCopyState("idle");
    try {
      const { pathname, search } = parseDevDevicePreviewHref(href);
      const params = new URLSearchParams({
        pathname,
        search: search.startsWith("?") ? search.slice(1) : search,
      });
      const response = await fetch(`/api/dev/device-preview?${params.toString()}`, {
        cache: "no-store",
      });
      if (response.status === 403 || response.status === 401) {
        throw new Error("Owner session required for device preview.");
      }
      if (!response.ok) {
        throw new Error("Could not build device preview URL.");
      }
      setPreview((await response.json()) as DevicePreview);
    } catch (error) {
      setPreview(null);
      setPreviewError(error instanceof Error ? error.message : "Preview unavailable.");
    } finally {
      setPreviewLoading(false);
    }
  }, [devPreview]);

  useEffect(() => {
    if (!devPreview) return;
    void loadPreview(previewHref);
  }, [devPreview, previewHref, loadPreview]);

  async function handleCopy() {
    if (!preview?.url) return;
    try {
      await navigator.clipboard.writeText(preview.url);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section className="fr-owner-console-inspection" aria-labelledby="fr-owner-console-inspection-title">
      <header className="fr-owner-console-inspection__header">
        <h2 id="fr-owner-console-inspection-title">{inspection.sectionTitle}</h2>
        <p>{inspection.sectionLead}</p>
      </header>

      <div className="fr-owner-console-inspection__group">
        <h3>{inspection.journeyTitle}</h3>
        <ul className="fr-owner-console-inspection__links">
          {inspection.shortcuts.journey.map((item) => (
            <li key={item.id}>
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                <strong>{item.label}</strong>
                {item.description ? <span>{item.description}</span> : null}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <details className="fr-owner-console-inspection__fold">
        <summary>{inspection.toolsTitle}</summary>
        <ul className="fr-owner-console-inspection__links">
          {inspection.shortcuts.internal.map((item) => (
            <li key={item.id}>
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                <strong>{item.label}</strong>
                {item.description ? <span>{item.description}</span> : null}
              </a>
            </li>
          ))}
        </ul>
      </details>

      {devPreview ? (
        <details className="fr-owner-console-inspection__fold fr-owner-console-inspection__fold--preview">
          <summary>{inspection.mobilePreviewTitle}</summary>
          <div className="fr-owner-console-inspection__preview-body">
            <p className="fr-owner-console-inspection__hint">{inspection.mobilePreviewHint}</p>
            <label className="fr-owner-console-inspection__path-label">
              Preview path
              <select
                value={previewHref}
                onChange={(event) => setPreviewHref(event.target.value)}
              >
                {inspection.shortcuts.journey.map((item) => (
                  <option key={item.id} value={item.href}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {previewLoading ? <p>Building QR…</p> : null}
            {previewError ? <p className="fr-owner-console-inspection__warn">{previewError}</p> : null}
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="fr-owner-console-inspection__qr"
                  src={preview.qrDataUrl}
                  alt={`QR for ${preview.pageLabel}`}
                  width={200}
                  height={200}
                />
                <p className="fr-owner-console-inspection__url">{preview.url}</p>
                {preview.note ? (
                  <p className="fr-owner-console-inspection__warn">{preview.note}</p>
                ) : null}
                <button type="button" className="fr-btn fr-btn--secondary" onClick={() => void handleCopy()}>
                  {copyState === "copied"
                    ? "Copied"
                    : copyState === "failed"
                      ? "Copy failed"
                      : "Copy URL"}
                </button>
              </>
            ) : null}
          </div>
        </details>
      ) : null}
    </section>
  );
}
