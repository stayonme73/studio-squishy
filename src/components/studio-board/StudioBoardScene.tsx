"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import AccountPackageCard from "@/components/studio-board/AccountPackageCard";
import CampaignBriefActions from "@/components/campaign-details/CampaignBriefActions";
import CampaignProgressPanel from "@/components/studio-board/CampaignProgressPanel";
import CampaignRecordDrawer from "@/components/studio-board/CampaignRecordDrawer";
import DeliverablesProgress from "@/components/studio-board/DeliverablesProgress";
import IdeaWall from "@/components/studio-board/IdeaWall";
import InspirationTicker from "@/components/studio-board/InspirationTicker";
import StudioCreativeWall from "@/components/studio-board/StudioCreativeWall";
import StudioNotePanel from "@/components/studio-board/StudioNotePanel";
import StudioBoardDevStatus from "@/components/studio-board/StudioBoardDevStatus";
import HelpCenterLink from "@/components/shared/HelpCenterLink";
import { helpCenter } from "@/config/help-center";
import { studioBoard, studioBoardDraftRoomHref, studioBoardStudioGuideHref } from "@/config/studio-board";
import {
  greetingPeriodFromDate,
  resolveAccountPackageView,
  resolveStudioBoardView,
  type GreetingPeriod,
} from "@/lib/studio-board-view";
import { useCurrentCampaign } from "@/lib/use-current-campaign";

const {
  assets,
  sidebar,
  userName,
  empty: emptyCopy,
  currentCampaign: currentCampaignCopy,
  deliverablesCard: deliverablesCardCopy,
  membership: membershipDefaults,
  routes,
} = studioBoard;

type SidebarIconName =
  | "hall"
  | "board"
  | "new"
  | "help"
  | "guide"
  | "record"
  | "review"
  | "delivery";

function useLiveGreetingPeriod() {
  const [period, setPeriod] = useState<GreetingPeriod | null>(null);

  useEffect(() => {
    setPeriod(greetingPeriodFromDate());
    const interval = window.setInterval(() => setPeriod(greetingPeriodFromDate()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return period;
}

function SidebarIcon({ name }: { name: SidebarIconName }) {
  switch (name) {
    case "hall":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M5 20V9l7-5 7 5v11" strokeLinejoin="round" />
          <path d="M9 20v-6h6v6" strokeLinejoin="round" />
        </svg>
      );
    case "board":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" />
        </svg>
      );
    case "new":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" strokeLinecap="round" />
        </svg>
      );
    case "help":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.25a2.75 2.75 0 0 1 4.75 1.75c0 1.75-2.25 2-2.25 3.75" strokeLinecap="round" />
          <circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="none" />
        </svg>
      );
    case "guide":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M5 5.5h5.5v13H5a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
          <path d="M10.5 5.5H19a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-8.5" strokeLinejoin="round" />
          <path d="M8 9h2M8 12.5h2M14 9h3M14 12.5h3" strokeLinecap="round" />
        </svg>
      );
    case "record":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M6 4h9l3 3v13H6V4Z" strokeLinejoin="round" />
          <path d="M15 4v4h4" strokeLinejoin="round" />
          <path d="M9 12h6M9 16h6" strokeLinecap="round" />
        </svg>
      );
    case "review":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 10h8M8 14h5" strokeLinecap="round" />
        </svg>
      );
    case "delivery":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M4 8h16v10H4V8Z" strokeLinejoin="round" />
          <path d="M4 12h16M9 8V5h6v3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

type SidebarNavAccent = "board" | "record" | "review" | "delivery" | "help";

function NavItem({
  href,
  active,
  accent,
  icon,
  children,
}: {
  href?: string;
  active?: boolean;
  accent?: SidebarNavAccent;
  icon: SidebarIconName;
  children: ReactNode;
}) {
  const className = [
    "sb-nav__item",
    active ? "sb-nav__item--active" : "sb-nav__item--link",
    accent ? `sb-nav__item--accent-${accent}` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      <span className="sb-nav__icon" aria-hidden>
        <SidebarIcon name={icon} />
      </span>
      <span className="sb-nav__label">{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <span className={className}>{content}</span>;
}

function CampaignMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="sb-current-campaign__metric">
      <span className="sb-current-campaign__label">{label}</span>
      <span className="sb-current-campaign__value">{value}</span>
    </div>
  );
}

/** Studio Board V4 — four primary panels plus dedicated Studio Note column. */
export default function StudioBoardScene() {
  const searchParams = useSearchParams();
  const { campaign, ready } = useCurrentCampaign();
  const greetingPeriod = useLiveGreetingPeriod();
  const [recordOpen, setRecordOpen] = useState(false);

  const view = useMemo(() => resolveStudioBoardView(campaign), [campaign]);
  const account = useMemo(() => resolveAccountPackageView(campaign), [campaign]);

  const draftRoomHref = useMemo(
    () => studioBoardDraftRoomHref(campaign?.packageId ?? membershipDefaults.packageId),
    [campaign?.packageId],
  );

  const studioGuideHref = useMemo(
    () => studioBoardStudioGuideHref(campaign?.packageId ?? membershipDefaults.packageId),
    [campaign?.packageId],
  );

  useEffect(() => {
    if (searchParams.get("record") === "open") setRecordOpen(true);
  }, [searchParams]);

  return (
    <div className="sb sb--v4" aria-label="Studio Board" aria-busy={!ready}>
      <aside className="sb-sidebar">
        <div className="sb-brand">
          <p className="sb-brand__the">the</p>
          <div className="sb-brand__lockup">
            <span className="sb-brand__icon" aria-hidden>
              <svg viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 4v2M16 26v2M4 16h2M26 16h2M7.05 7.05l1.42 1.42M23.53 23.53l1.42 1.42M7.05 24.95l1.42-1.42M23.53 8.47l1.42-1.42"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M16 9c-3.2 0-5.5 2.2-5.5 5.2 0 2.1 1.2 3.4 2.4 4.3V20a3.6 3.6 0 0 0 6.2 0v-1.5c1.2-.9 2.4-2.2 2.4-4.3C21.5 11.2 19.2 9 16 9Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path d="M16 17.5v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="16" cy="13.5" r="1.15" fill="currentColor" />
              </svg>
            </span>
            <div className="sb-brand__stack">
              <p className="sb-brand__name">STUDIO</p>
              <p className="sb-brand__by">BY SPARK</p>
            </div>
          </div>
        </div>

        <nav className="sb-nav" aria-label="Studio navigation">
          <NavItem href={routes.welcomeHall} icon="hall">
            {sidebar.welcomeHall}
          </NavItem>
          <NavItem active accent="board" icon="board">
            {sidebar.studioBoard}
          </NavItem>
          <NavItem href={draftRoomHref} icon="new">
            {sidebar.newCampaign}
          </NavItem>
          <NavItem href={studioGuideHref} icon="guide">
            {sidebar.studioGuide}
          </NavItem>
          <NavItem href={routes.helpCenter} icon="help" accent="help">
            {sidebar.helpCenter}
          </NavItem>
          <NavItem href={routes.campaignDetails} icon="record" accent="record">
            {sidebar.campaignRecord}
          </NavItem>
          <NavItem href={routes.feedbackStudio} icon="review" accent="review">
            {sidebar.reviewRoom}
          </NavItem>
          <NavItem href={routes.deliverables} icon="delivery" accent="delivery">
            {sidebar.finalDelivery}
          </NavItem>
        </nav>

        <div className="sb-sidebar-lower">
          <IdeaWall />
          <StudioBoardDevStatus placement="sidebar" />
        </div>
      </aside>

      <div className="sb-main">
        <header className="sb-header-v3">
          <div className="sb-header-v3__row">
            <div className="sb-header-v3__copy">
              <h1 className="sb-header-v3__title">Studio Board</h1>
              {greetingPeriod ? (
                <p className="sb-header-v3__greeting">
                  Good {greetingPeriod}, <span className="sb-header-v3__name">{userName}</span>
                </p>
              ) : (
                <p className="sb-header-v3__greeting sb-header-v3__greeting--loading" aria-busy="true" />
              )}
            </div>
            <InspirationTicker />
          </div>
        </header>

        <div className="sb-board-layout">
          <div className="sb-grid sb-grid--v4">
            <article
              className="sb-card sb-card--current bf-material bf-material-paper"
              aria-labelledby="sb-current-campaign-title"
            >
              <p className="sb-card__tab">{currentCampaignCopy.heading}</p>
              <div className="sb-current-campaign" aria-live="polite">
                <h2
                  id="sb-current-campaign-title"
                  className={`sb-current-campaign__name${view.hasCampaign ? "" : " sb-current-campaign__name--empty"}`}
                >
                  {view.hasCampaign ? view.campaignTitle : emptyCopy.campaignNamePlaceholder}
                </h2>

                {view.hasCampaign ? (
                  <div className="sb-current-campaign__metrics">
                    {view.packageLabel ? (
                      <CampaignMetric label={currentCampaignCopy.package} value={view.packageLabel} />
                    ) : null}
                    <CampaignMetric label={currentCampaignCopy.status} value={view.statusLabel} />
                    {view.campaignProgressLabel ? (
                      <CampaignMetric
                        label={currentCampaignCopy.campaignStage}
                        value={view.campaignProgressLabel}
                      />
                    ) : null}
                    <CampaignMetric
                      label={currentCampaignCopy.campaignsRemaining}
                      value={account.campaignsRemaining}
                    />
                    <CampaignMetric
                      label={currentCampaignCopy.emailsRemaining}
                      value={account.emailsRemaining}
                    />
                    <CampaignMetric label={currentCampaignCopy.smsRemaining} value={account.smsRemaining} />
                    <CampaignMetric
                      label={currentCampaignCopy.revisionsRemaining}
                      value={account.revisionsRemaining}
                    />
                  </div>
                ) : (
                  <p className="sb-current-campaign__empty">{emptyCopy.campaignDescription}</p>
                )}

                {view.hasCampaign && campaign ? (
                  <CampaignBriefActions
                    campaign={campaign}
                    onViewBrief={() => setRecordOpen(true)}
                    className="sb-current-campaign__brief-actions"
                    layout="stack"
                  />
                ) : null}

                {view.hasCampaign &&
                (view.status === "DRAFT_RECEIVED" || view.status === "PAYMENT_RECEIVED") ? (
                  <HelpCenterLink
                    label={helpCenter.boardLinks.awaitingPayment.label}
                    anchor={helpCenter.boardLinks.awaitingPayment.anchor}
                    from="studio-board"
                    className="sb-help-link"
                  />
                ) : null}

                {!view.hasCampaign ? (
                  <Link href={draftRoomHref} className="utility-btn utility-btn--primary sb-current-campaign__record">
                    {emptyCopy.primaryCta}
                  </Link>
                ) : null}
              </div>
            </article>

            <article className="sb-card sb-card--progress bf-material bf-material-paper">
              <CampaignProgressPanel steps={view.progressSteps} timeline={view.activityFeed} />
            </article>

            <article
              className="sb-card sb-card--deliverables bf-material bf-material-paper"
              aria-labelledby="sb-deliverables-title"
            >
              <p className="sb-card__tab">{deliverablesCardCopy.heading}</p>
              <h2 id="sb-deliverables-title" className="sr-only">
                {deliverablesCardCopy.heading}
              </h2>
              <DeliverablesProgress items={view.deliverablesProgress} campaignStatus={view.status} />
            </article>

            <article className="sb-card sb-card--account bf-material bf-material-paper">
              <AccountPackageCard account={account} />
            </article>
          </div>

          <aside className="sb-board-note-column" aria-label="Studio communication">
            <article className="sb-card sb-card--studio-note bf-material bf-material-paper">
              <StudioNotePanel note={view.studioNote} />
            </article>
            <StudioCreativeWall src={assets.creativeWall} />
          </aside>
        </div>
      </div>

      <CampaignRecordDrawer open={recordOpen} onClose={() => setRecordOpen(false)} />
    </div>
  );
}
