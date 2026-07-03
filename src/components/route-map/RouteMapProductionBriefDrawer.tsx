"use client";

import { useCallback, useEffect, useRef } from "react";

import CopyProductionBriefButton from "@/components/campaign-details/CopyProductionBriefButton";
import { RouteMapProductionBriefPanel } from "@/components/route-map/RouteMapIntakeSummaryPanels";
import type { CampaignRecord } from "@/config/studio-board";
import { studioBoard } from "@/config/studio-board";
import { resolveRouteMapProductionBrief } from "@/lib/route-map-production-brief";

type Props = {
  campaign: CampaignRecord | null;
  open: boolean;
  onClose: () => void;
};

/** Dev-only internal production brief drawer — separate from client Campaign Record. */
export default function RouteMapProductionBriefDrawer({ campaign, open, onClose }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const brief = campaign ? resolveRouteMapProductionBrief(campaign) : null;

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

  if (!open || !brief || !campaign) return null;

  return (
    <div className="sb-record-drawer" role="presentation">
      <button
        type="button"
        className="sb-record-drawer__backdrop"
        aria-label="Close production brief"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className="sb-record-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sb-production-brief-title"
        tabIndex={-1}
      >
        <header className="sb-record-drawer__header">
          <div className="sb-record-drawer__header-copy">
            <h2 id="sb-production-brief-title" className="sb-record-drawer__title">
              Production Brief
            </h2>
            <p className="sb-record-drawer__subtitle">{brief.jobName}</p>
            <p className="sb-record-drawer__hint">Internal work instructions — not shown to clients.</p>
          </div>
          <button
            type="button"
            className="sb-record-drawer__close utility-btn utility-btn--secondary"
            onClick={onClose}
          >
            {studioBoard.campaignRecord.closeLabel}
          </button>
        </header>
        <div className="sb-record-drawer__body">
          <div className="sb-record-drawer__actions">
            <CopyProductionBriefButton campaign={campaign} />
          </div>
          <RouteMapProductionBriefPanel brief={brief} />
        </div>
      </aside>
    </div>
  );
}
