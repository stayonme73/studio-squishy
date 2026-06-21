"use client";

import { useCallback, useEffect, useRef } from "react";

import CopyCampaignBriefButton from "@/components/campaign-details/CopyCampaignBriefButton";
import CampaignVisionSummary from "@/components/campaign-details/CampaignVisionSummary";
import { studioBoard } from "@/config/studio-board";
import { resolveCampaignDetailsView } from "@/lib/campaign-details-view";
import { useCurrentCampaign } from "@/lib/use-current-campaign";

const { campaignRecord: copy } = studioBoard;

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Read-only archive of customer intake — replaces Campaign Details page. */
export default function CampaignRecordDrawer({ open, onClose }: Props) {
  const { campaign } = useCurrentCampaign();
  const panelRef = useRef<HTMLElement>(null);
  const view = resolveCampaignDetailsView(campaign);

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

  if (!open) return null;

  return (
    <div className="sb-record-drawer" role="presentation">
      <button
        type="button"
        className="sb-record-drawer__backdrop"
        aria-label={copy.closeLabel}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        className="sb-record-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sb-record-drawer-title"
        tabIndex={-1}
      >
        <header className="sb-record-drawer__header">
          <div className="sb-record-drawer__header-copy">
            <h2 id="sb-record-drawer-title" className="sb-record-drawer__title">
              {copy.drawerTitle}
            </h2>
            {view.hasCampaign ? (
              <p className="sb-record-drawer__subtitle">{view.campaignName}</p>
            ) : null}
            <p className="sb-record-drawer__hint">{copy.submittedHint}</p>
          </div>
          <button type="button" className="sb-record-drawer__close utility-btn utility-btn--secondary" onClick={onClose}>
            {copy.closeLabel}
          </button>
        </header>

        <div className="sb-record-drawer__body">
          {view.hasCampaign && campaign ? (
            <div className="sb-record-drawer__actions">
              <CopyCampaignBriefButton campaign={campaign} />
            </div>
          ) : null}
          {view.hasVisionSummary ? (
            <CampaignVisionSummary sections={view.visionSummary} />
          ) : (
            <p className="sb-record-drawer__empty">{copy.emptyHint}</p>
          )}
        </div>
      </aside>
    </div>
  );
}
