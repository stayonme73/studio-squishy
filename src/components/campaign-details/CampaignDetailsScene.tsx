"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import CopyCampaignBriefButton from "@/components/campaign-details/CopyCampaignBriefButton";
import CampaignBriefActions from "@/components/campaign-details/CampaignBriefActions";
import CampaignJourneyHero from "@/components/campaign-details/CampaignJourneyHero";
import CampaignVisionSummary from "@/components/campaign-details/CampaignVisionSummary";
import ProjectDetailsSummaryPanel from "@/components/campaign-details/ProjectDetailsSummaryPanel";
import { RouteMapClientSummaryPanel } from "@/components/route-map/RouteMapIntakeSummaryPanels";
import InformationUpdateEntry from "@/components/campaign-details/InformationUpdateEntry";
import ProjectRecordSquishy from "@/components/campaign-details/ProjectRecordSquishy";
import ProjectActivityCard from "@/components/campaign-details/ProjectActivityCard";
import HelpCenterLink from "@/components/shared/HelpCenterLink";
import UtilityPageFrame from "@/components/shared/UtilityPageFrame";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import CampaignJourneyMap from "@/components/studio-board/CampaignJourneyMap";
import StudioBoardDevStatus from "@/components/studio-board/StudioBoardDevStatus";
import { helpCenter } from "@/config/help-center";
import { studioBoard } from "@/config/studio-board";
import { resolveCampaignDetailsView } from "@/lib/campaign-details-view";
import {
  PROJECT_RECORD_ARRIVAL_PARAM,
  shouldShowProjectRecordArrival,
} from "@/lib/project-record-arrival";
import { resolveProjectStatusPanelState } from "@/lib/project-record-status";
import { useCurrentCampaign } from "@/lib/use-current-campaign";
import { useProjectJobStatus } from "@/lib/use-project-job-status";
import { useProjectActivity } from "@/lib/use-project-activity";

const { campaignDetails: copy, routes } = studioBoard;
const { campaignLinks } = helpCenter;

function formatStatusDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { campaign, ready } = useCurrentCampaign();
  const view = useMemo(() => resolveCampaignDetailsView(campaign), [campaign]);
  const showPaymentHelp =
    view.status === "DRAFT_RECEIVED" || view.status === "PAYMENT_RECEIVED";
  // No customer-safe status call before payment — there is nothing to fetch yet.
  const { jobs: projectJobs, loading: projectJobsLoading, error: projectJobsError } =
    useProjectJobStatus(campaign?.paymentReceivedAt ? campaign.campaignId : undefined);
  const {
    events: activityEvents,
    pendingCount,
    loading: activityLoading,
    error: activityError,
    refresh: refreshActivity,
  } = useProjectActivity(campaign?.campaignId, campaign?.paymentReceivedAt);
  const statusCopy = copy.projectStatusCopy;
  const projectStatusState = resolveProjectStatusPanelState({
    paymentReceivedAt: campaign?.paymentReceivedAt,
    loading: projectJobsLoading,
    error: projectJobsError,
    jobs: projectJobs,
  });

  const [showArrival, setShowArrival] = useState(false);
  const [squishyHasGreeted, setSquishyHasGreeted] = useState(false);

  const squishySnapshot = useMemo(() => {
    const revision = view.revisionTracker;
    return {
      paymentReceivedAt: campaign?.paymentReceivedAt ?? null,
      justArrived: showArrival,
      hasGreeted: squishyHasGreeted,
      campaignStatusLabel: view.statusLabel,
      pendingRequestCount: pendingCount,
      revisionDataReady: revision !== null,
      revisionIncluded: revision?.included ?? 0,
      revisionUsed: revision?.used ?? 0,
      revisionRemaining: revision?.remaining ?? 0,
      projectStatusReady: projectStatusState === "loaded",
      projectStatusError: Boolean(projectJobsError),
      blockingMaterialsCount: campaign?.materialsSummary?.blockingRequiredCount ?? 0,
      waitingOnClientJobCount: projectJobs.filter((job) => job.isWaitingOnClient).length,
      jobStatusLabels: projectJobs.map((job) => `${job.serviceName} — ${job.statusLabel}`),
    };
  }, [
    campaign?.paymentReceivedAt,
    campaign?.materialsSummary?.blockingRequiredCount,
    showArrival,
    squishyHasGreeted,
    view.statusLabel,
    view.revisionTracker,
    pendingCount,
    projectJobs,
    projectJobsError,
    projectStatusState,
  ]);

  useEffect(() => {
    const param = searchParams.get(PROJECT_RECORD_ARRIVAL_PARAM);
    if (!shouldShowProjectRecordArrival(param, campaign?.paymentReceivedAt)) return;
    if (!ready) return;

    setShowArrival(true);
    router.replace(routes.campaignDetails, { scroll: false });
  }, [searchParams, router, ready, campaign?.paymentReceivedAt]);

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
          lead={copy.lead}
          helpCenterFrom="campaign-details"
          aside={
            <CampaignJourneyMap
              activeStep="campaign-details"
              status={view.status}
              hasCampaign={view.hasCampaign}
            />
          }
        />

        {showArrival ? (
          <div className="cd-arrival" role="status" aria-live="polite">
            <p className="cd-arrival__message">{copy.arrival.message}</p>
          </div>
        ) : null}

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
          className="utility-card cd-card--project-status"
          aria-labelledby="cd-project-status-title"
        >
          <h2 id="cd-project-status-title" className="utility-card__title">
            {copy.sections.projectStatus}
          </h2>
          <p className="cd-journey__lead">{statusCopy.lead}</p>
          {projectStatusState.kind === "pending-payment" ? (
            <p className="cd-updates__hint">{statusCopy.pendingPayment}</p>
          ) : projectStatusState.kind === "loading" ? (
            <p className="cd-updates__hint">{statusCopy.loading}</p>
          ) : projectStatusState.kind === "error" ? (
            <p className="cd-updates__hint" role="alert">
              {statusCopy.error}
            </p>
          ) : projectStatusState.kind === "empty" ? (
            <p className="cd-updates__hint">{statusCopy.empty}</p>
          ) : (
            <dl className="cd-overview">
              {projectStatusState.jobs.map((job) => (
                <div key={job.jobId} className="cd-overview__row">
                  <dt className="cd-overview__label">{job.serviceName}</dt>
                  <dd className="cd-overview__value">
                    {job.statusLabel}
                    {job.isWaitingOnClient ? ` — ${statusCopy.waitingOnYou}` : ""}
                    {job.deliveredAt
                      ? ` — ${statusCopy.deliveredOn} ${formatStatusDate(job.deliveredAt)}`
                      : job.clientDeadline
                        ? ` — ${statusCopy.requiredBy} ${formatStatusDate(job.clientDeadline)}`
                        : ""}
                  </dd>
                </div>
              ))}
            </dl>
          )}
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
          {campaign ? (
            <CampaignBriefActions
              campaign={campaign}
              showView={false}
              layout="stack"
              className="cd-vision__brief-actions"
            />
          ) : null}
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

        {view.hasProjectDetailsSummary ? (
          <section
            className="utility-card cd-card--project-details"
            aria-labelledby="cd-project-details-title"
          >
            <h2 id="cd-project-details-title" className="utility-card__title">
              Project Details
            </h2>
            <ProjectDetailsSummaryPanel sections={view.projectDetailsSummary} />
          </section>
        ) : null}

        {view.hasRouteMapClientSummary && view.routeMapClientSummary ? (
          <section
            className="utility-card cd-card--route-map-summary"
            aria-labelledby="cd-route-map-summary-title"
          >
            <h2 id="cd-route-map-summary-title" className="utility-card__title">
              What You Told Us
            </h2>
            <RouteMapClientSummaryPanel summary={view.routeMapClientSummary} />
          </section>
        ) : null}

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

        {campaign && campaign.paymentReceivedAt ? (
          <ProjectRecordSquishy
            campaign={campaign}
            snapshot={squishySnapshot}
            activityEvents={activityEvents}
            onActivityRefresh={refreshActivity}
            onGreeted={() => {
              setSquishyHasGreeted(true);
            }}
          />
        ) : null}

        {campaign && campaign.paymentReceivedAt ? (
          <InformationUpdateEntry campaign={campaign} onSubmitted={() => void refreshActivity()} />
        ) : null}

        <ProjectActivityCard
          events={activityEvents}
          loading={activityLoading}
          error={activityError}
          title={copy.sections.projectActivity}
          emptyCopy={copy.informationUpdate.activityEmpty}
        />

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
