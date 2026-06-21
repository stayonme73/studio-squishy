"use client";

import Link from "next/link";
import { useMemo } from "react";

import CopyCampaignBriefButton from "@/components/campaign-details/CopyCampaignBriefButton";
import CampaignJourneyHero from "@/components/campaign-details/CampaignJourneyHero";
import CampaignVisionSummary from "@/components/campaign-details/CampaignVisionSummary";
import HelpCenterLink from "@/components/shared/HelpCenterLink";
import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import CampaignJourneyMap from "@/components/studio-board/CampaignJourneyMap";
import StudioBoardDevStatus from "@/components/studio-board/StudioBoardDevStatus";
import { helpCenter } from "@/config/help-center";
import { studioBoard } from "@/config/studio-board";
import { resolveCampaignDetailsView } from "@/lib/campaign-details-view";
import { useCurrentCampaign } from "@/lib/use-current-campaign";

const { campaignDetails: copy, routes } = studioBoard;
const { campaignLinks } = helpCenter;

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="cd-overview__row">
      <dt className="cd-overview__label">{label}</dt>
      <dd className="cd-overview__value">{value}</dd>
    </div>
  );
}

function StudioUpdatesSection({ updates }: { updates: readonly { date: string; message: string }[] }) {
  return (
    <section
      className="utility-card cd-card--updates"
      aria-labelledby="cd-updates-title"
    >
      <h2 id="cd-updates-title" className="utility-card__title">
        {copy.sections.updates}
      </h2>
      <p className="cd-updates__hint">{studioBoard.notesCopy.readOnlyHint}</p>
      {updates.length > 0 ? (
        <ul className="cd-updates">
          {updates.map((update) => (
            <li key={`${update.date}-${update.message}`} className="cd-updates__item">
              <time className="cd-updates__date" dateTime={update.date}>
                {update.date}
              </time>
              <span className="cd-updates__text">{update.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cd-updates__empty">{studioBoard.notesCopy.emptyHint}</p>
      )}
    </section>
  );
}

/** Campaign Details — campaign record only (reference content lives in Help Center). */
export default function CampaignDetailsScene() {
  const { campaign, ready } = useCurrentCampaign();
  const view = useMemo(() => resolveCampaignDetailsView(campaign), [campaign]);
  const showPaymentHelp =
    view.status === "DRAFT_RECEIVED" || view.status === "PAYMENT_RECEIVED";

  if (!ready) {
    return (
      <UtilityPageFrame navId="campaign-details">
        <div className="utility-page" aria-busy="true">
          <div className="utility-shell utility-shell--loading" />
        </div>
      </UtilityPageFrame>
    );
  }

  if (!view.hasCampaign) {
    return (
      <UtilityPageFrame navId="campaign-details">
        <div className="utility-page">
          <UtilityPageHeader
            backHref={routes.studioBoard}
            activeNav="campaign-details"
            title={copy.empty.title}
            lead={copy.empty.body}
            helpCenterFrom="campaign-details"
          />
          <div className="utility-shell">
            <Link href={routes.studioBoard} className="utility-btn utility-btn--primary">
              {copy.empty.cta} →
            </Link>
            <HelpCenterLink
              label={campaignLinks.pageFooter[0].label}
              from="campaign-details"
              className="utility-help-link"
            />
          </div>
          <StudioBoardDevStatus placement="sidebar" />
        </div>
      </UtilityPageFrame>
    );
  }

  return (
    <UtilityPageFrame navId="campaign-details">
      <div className="utility-page" aria-label="Campaign Details">
        <UtilityPageHeader
          backHref={routes.studioBoard}
          activeNav="campaign-details"
          title={copy.pageTitle}
          helpCenterFrom="campaign-details"
          aside={
            <CampaignJourneyMap
              activeStep="campaign-details"
              status={view.status}
              hasCampaign={view.hasCampaign}
            />
          }
        />

      <div className="utility-grid cd-grid">
        <section
          className="utility-card cd-card--overview"
          aria-labelledby="cd-overview-title"
        >
          <h2 id="cd-overview-title" className="utility-card__title">
            {copy.sections.overview}
          </h2>
          <dl className="cd-overview">
            <OverviewRow label={copy.overviewLabels.name} value={view.campaignName} />
            <OverviewRow label={copy.overviewLabels.status} value={view.statusLabel} />
            <OverviewRow
              label={copy.overviewLabels.estimatedCompletion}
              value={view.estimatedCompletion}
            />
            <OverviewRow label={copy.overviewLabels.createdDate} value={view.createdDate} />
            <OverviewRow label={copy.overviewLabels.campaignType} value={view.campaignType} />
          </dl>
          {showPaymentHelp
            ? campaignLinks.overviewAwaitingPayment.map((link) => (
                <HelpCenterLink
                  key={link.anchor}
                  label={link.label}
                  anchor={link.anchor}
                  from="campaign-details"
                />
              ))
            : null}
        </section>

        <section
          className="utility-card cd-card--vision"
          aria-labelledby="cd-vision-title"
        >
          <div className="cd-vision__header">
            <h2 id="cd-vision-title" className="utility-card__title">
              {copy.sections.visionSummary}
            </h2>
            {campaign ? <CopyCampaignBriefButton campaign={campaign} /> : null}
          </div>
          <CampaignVisionSummary sections={view.visionSummary} />
          {campaignLinks.visionSummary.map((link) => (
            <HelpCenterLink
              key={link.anchor}
              label={link.label}
              anchor={link.anchor}
              from="campaign-details"
            />
          ))}
        </section>

        {view.revisionTracker ? (
          <section
            className="utility-card cd-card--revisions"
            aria-labelledby="cd-revisions-title"
          >
            <h2 id="cd-revisions-title" className="utility-card__title">
              {copy.sections.revisionTracker}
            </h2>
            <dl className="cd-revisions">
              <div className="cd-revisions__row">
                <dt className="cd-revisions__label">Included</dt>
                <dd className="cd-revisions__value">{view.revisionTracker.included}</dd>
              </div>
              <div className="cd-revisions__row">
                <dt className="cd-revisions__label">Used</dt>
                <dd className="cd-revisions__value">{view.revisionTracker.used}</dd>
              </div>
              <div className="cd-revisions__row">
                <dt className="cd-revisions__label">Remaining</dt>
                <dd className="cd-revisions__value cd-revisions__value--highlight">
                  {view.revisionTracker.remaining}
                </dd>
              </div>
            </dl>
            {campaignLinks.revisionTracker.map((link) => (
              <HelpCenterLink
                key={link.anchor}
                label={link.label}
                anchor={link.anchor}
                from="campaign-details"
              />
            ))}
          </section>
        ) : null}

        <section
          className="utility-card cd-card--package"
          aria-labelledby="cd-package-title"
        >
          <h2 id="cd-package-title" className="utility-card__title">
            {copy.sections.packageDetails}
          </h2>
          <ul className="cd-package-list">
            {view.packageIncludes.map((item) => (
              <li key={item} className="cd-package-list__item">
                {item}
              </li>
            ))}
          </ul>
          {campaignLinks.packageIncludes.map((link) => (
            <HelpCenterLink
              key={link.anchor}
              label={link.label}
              anchor={link.anchor}
              from="campaign-details"
            />
          ))}
        </section>

        <section
          className="utility-card cd-card--journey"
          aria-labelledby="cd-journey-title"
        >
          <h2 id="cd-journey-title" className="utility-card__title cd-card__title--journey">
            {copy.sections.journey}
          </h2>
          <p className="cd-journey__lead">Where you are in your Studio journey.</p>
          <CampaignJourneyHero status={view.status} />
        </section>

        <section
          className="utility-card cd-card--timeline"
          aria-labelledby="cd-timeline-title"
        >
          <h2 id="cd-timeline-title" className="utility-card__title">
            {copy.sections.timeline}
          </h2>
          <ol className="cd-timeline">
            {view.timeline.map((entry) => (
              <li key={`${entry.label}-${entry.sortKey}`} className="cd-timeline__item">
                <span className="cd-timeline__date">{entry.date}</span>
                <span className="cd-timeline__label">{entry.label}</span>
              </li>
            ))}
          </ol>
          {campaignLinks.timeline.map((link) => (
            <HelpCenterLink
              key={link.anchor}
              label={link.label}
              anchor={link.anchor}
              from="campaign-details"
            />
          ))}
        </section>

        <section
          className="utility-card cd-card--deliverables"
          aria-labelledby="cd-deliverables-title"
        >
          <h2 id="cd-deliverables-title" className="utility-card__title">
            {copy.sections.deliverables}
          </h2>
          {view.deliverablesRemaining.length > 0 ? (
            <ul className="cd-deliverables-remaining">
              {view.deliverablesRemaining.map((item) => (
                <li key={item.id} className="cd-deliverables-remaining__item">
                  <span className="cd-deliverables-remaining__label">{item.label}</span>
                  <span className="cd-deliverables-remaining__count">
                    {item.delivered} / {item.total}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {view.deliverables.ready ? (
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
                      {link.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="cd-deliverables__waiting">
              <p className="cd-deliverables__message">{view.deliverables.message}</p>
              <p className="cd-deliverables__hint">{view.deliverables.hint}</p>
            </div>
          )}
          {campaignLinks.deliverables.map((link) => (
            <HelpCenterLink
              key={link.anchor}
              label={link.label}
              anchor={link.anchor}
              from="campaign-details"
            />
          ))}
        </section>

        <StudioUpdatesSection updates={view.studioUpdates} />

        <footer className="utility-card cd-card--footer">
          <p className="cd-footer__hint">{helpCenter.footer.campaignHint}</p>
          <HelpCenterLink label={campaignLinks.pageFooter[0].label} from="campaign-details" />
        </footer>
      </div>

        <StudioBoardDevStatus placement="sidebar" />
      </div>
    </UtilityPageFrame>
  );
}
