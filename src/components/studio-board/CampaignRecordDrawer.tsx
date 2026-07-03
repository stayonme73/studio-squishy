"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";

import CopyCampaignBriefButton from "@/components/campaign-details/CopyCampaignBriefButton";
import CampaignVisionSummary from "@/components/campaign-details/CampaignVisionSummary";
import { RouteMapClientSummaryPanel } from "@/components/route-map/RouteMapIntakeSummaryPanels";
import { studioBoard } from "@/config/studio-board";
import { resolveCampaignDetailsView } from "@/lib/campaign-details-view";
import { draftRoomEditHref, isIntakeEditable } from "@/lib/intake-edit";
import { useCurrentCampaign } from "@/lib/use-current-campaign";
import { useFinalDelivery } from "@/lib/use-final-delivery";

const { campaignRecord: copy, campaignBrief, campaignDetails: detailsCopy } = studioBoard;

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Read-only archive of customer intake — replaces Campaign Details page. */
export default function CampaignRecordDrawer({ open, onClose }: Props) {
  const { campaign } = useCurrentCampaign();
  const { delivery: finalDelivery } = useFinalDelivery(campaign?.campaignId);
  const panelRef = useRef<HTMLElement>(null);
  const view = resolveCampaignDetailsView(campaign, { finalDelivery });
  const intakeEditable = campaign ? isIntakeEditable(campaign.campaignStatus) : false;
  const hintCopy = intakeEditable ? copy.editableHint : copy.submittedHint;

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
            <p className="sb-record-drawer__hint">{hintCopy}</p>
          </div>
          <button type="button" className="sb-record-drawer__close utility-btn utility-btn--secondary" onClick={onClose}>
            {copy.closeLabel}
          </button>
        </header>

        <div className="sb-record-drawer__body">
          {view.hasCampaign && campaign ? (
            <div className="sb-record-drawer__actions">
              <CopyCampaignBriefButton campaign={campaign} />
              {intakeEditable ? (
                <Link
                  href={draftRoomEditHref(campaign.packageId)}
                  className="utility-btn utility-btn--secondary"
                >
                  {campaignBrief.editLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
          {!intakeEditable && view.hasCampaign ? (
            <p className="sb-record-drawer__locked" role="status">
              {campaignBrief.lockedMessage}
            </p>
          ) : null}
          {view.packageIncludes.length > 0 ? (
            <div className="sb-record-drawer__studio-plan">
              <h3 className="sb-record-drawer__section-title">
                {campaign?.approvedStudioPlan ? view.campaignType : detailsCopy.sections.packageDetails}
              </h3>
              <ul className="cd-package-list">
                {view.packageIncludes.map((item) => (
                  <li key={item} className="cd-package-list__item">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {view.hasProjectDetailsSummary ? (
            <div className="sb-record-drawer__project-details">
              <h3 className="sb-record-drawer__section-title">Project Details</h3>
              {view.projectDetailsSummary.map((section) => (
                <article key={section.title} className="cd-vision__section">
                  <p className="cd-vision__eyebrow">{section.title}</p>
                  <div className="cd-vision__answers">
                    {section.items.map((item) => (
                      <div key={`${section.title}-${item.label}`} className="cd-vision__answer">
                        <p className="cd-vision__label">{item.label}</p>
                        <p className="cd-vision__value">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {view.hasRouteMapClientSummary && view.routeMapClientSummary ? (
            <RouteMapClientSummaryPanel summary={view.routeMapClientSummary} />
          ) : null}
          {view.hasVisionSummary ? (
            <CampaignVisionSummary sections={view.visionSummary} />
          ) : view.hasRouteMapClientSummary ||
            view.hasProjectDetailsSummary ||
            view.packageIncludes.length > 0 ? null : (
            <p className="sb-record-drawer__empty">{copy.emptyHint}</p>
          )}
          {view.deliverables.ready ? (
            <div className="sb-record-drawer__deliverables">
              <h3 className="sb-record-drawer__section-title">{detailsCopy.sections.deliverables}</h3>
              <div className="cd-deliverables__ready">
                {view.deliverables.message ? (
                  <p className="cd-deliverables__message">{view.deliverables.message}</p>
                ) : null}
                <ul className="cd-deliverables__links">
                  {view.deliverables.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={link.primary ? "cd-deliverables__cta" : "cd-deliverables__link"}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
