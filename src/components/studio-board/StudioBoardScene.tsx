"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";

import CampaignBriefActions from "@/components/campaign-details/CampaignBriefActions";
import CampaignNextAction from "@/components/studio-board/CampaignNextAction";
import CampaignProgressPanel from "@/components/studio-board/CampaignProgressPanel";
import CampaignRecordDrawer from "@/components/studio-board/CampaignRecordDrawer";
import RouteMapProductionBriefDrawer from "@/components/route-map/RouteMapProductionBriefDrawer";
import StudioBoardMaterialsWorkflow from "@/components/studio-board/StudioBoardMaterialsWorkflow";
import ProjectSnapshotPanel from "@/components/studio-board/ProjectSnapshotPanel";
import StudioBoardDevStatus from "@/components/studio-board/StudioBoardDevStatus";
import ClientAccessStatePanel from "@/components/shared/ClientAccessStatePanel";
import HelpCenterLink from "@/components/shared/HelpCenterLink";
import CustomerSignOutButton from "@/components/auth/CustomerSignOutButton";
import { helpCenter } from "@/config/help-center";
import { studioBoard, studioBoardDraftRoomHref, studioBoardStudioGuideHref } from "@/config/studio-board";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import {
  greetingPeriodFromDate,
  resolveAccountPackageView,
  resolveStudioBoardView,
  type GreetingPeriod,
  type StudioBoardDisplayFacts,
} from "@/lib/studio-board-view";
import { speakConversationLine } from "@/lib/studio-conversation-speech";
import { consumeStudioVoiceBoardWelcome } from "@/lib/studio-voice-board-handoff";
import { resolveBoardHeaderGreeting } from "@/lib/studio-board-customer-greeting";
import { useCurrentCampaign } from "@/lib/use-current-campaign";

const {
  brand,
  sidebar,
  empty: emptyCopy,
  currentCampaign: currentCampaignCopy,
  membership: membershipDefaults,
  routes,
} = studioBoard;

type SidebarIconName =
  | "board"
  | "new"
  | "help"
  | "record"
  | "review"
  | "delivery";

/** Client-only period — never gates the greeting to an empty shell. */
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
          <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "delivery":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
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
  actionHint,
  onClick,
}: {
  href?: string;
  active?: boolean;
  accent?: SidebarNavAccent;
  icon: SidebarIconName;
  children: ReactNode;
  actionHint?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  const className = [
    "sb-nav__item",
    active ? "sb-nav__item--active" : "sb-nav__item--link",
    accent ? `sb-nav__item--accent-${accent}` : "",
    actionHint ? "sb-nav__item--action" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      <span className="sb-nav__icon" aria-hidden>
        <SidebarIcon name={icon} />
      </span>
      <span className="sb-nav__label-wrap">
        <span className="sb-nav__label">{children}</span>
        {actionHint ? <span className="sb-nav__action-hint">{actionHint}</span> : null}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
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

/** Studio Board V4 — six-panel dashboard; only panel content changes by status. */
export default function StudioBoardScene() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { campaign, ready, accessState, refresh } = useCurrentCampaign();
  const greetingPeriod = useLiveGreetingPeriod();
  const [recordOpen, setRecordOpen] = useState(false);
  const [productionBriefOpen, setProductionBriefOpen] = useState(false);

  const boardCampaign = accessState === "no-active-project" ? null : campaign;
  const [movedToProduction, setMovedToProduction] = useState(false);
  /** Session greeting — independent of campaign claim/load. */
  const [customerDisplayName, setCustomerDisplayName] = useState<string | null>(null);
  const [sessionGreetingResolved, setSessionGreetingResolved] = useState(false);
  const [materialsFacts, setMaterialsFacts] = useState<{
    blockingRequiredCount: number;
    stillNeededLabels: readonly string[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/session", { credentials: "include" })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setCustomerDisplayName(null);
          return;
        }
        const body = (await response.json().catch(() => ({}))) as {
          user?: { displayName?: string | null } | null;
        };
        setCustomerDisplayName(
          typeof body.user?.displayName === "string" ? body.user.displayName : null,
        );
      })
      .catch(() => {
        if (!cancelled) setCustomerDisplayName(null);
      })
      .finally(() => {
        if (!cancelled) setSessionGreetingResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!boardCampaign?.campaignId || !boardCampaign.paymentReceivedAt) {
      setMovedToProduction(false);
      return;
    }

    let cancelled = false;
    void fetch(`/api/campaigns/${encodeURIComponent(boardCampaign.campaignId)}/project-status`)
      .then(async (response) => {
        if (!response.ok) return;
        const payload = (await response.json()) as {
          jobs?: ReadonlyArray<{ hasProductionStarted?: boolean }>;
        };
        if (cancelled) return;
        setMovedToProduction(Boolean(payload.jobs?.some((job) => job.hasProductionStarted)));
      })
      .catch(() => {
        if (!cancelled) setMovedToProduction(false);
      });

    return () => {
      cancelled = true;
    };
  }, [boardCampaign?.campaignId, boardCampaign?.paymentReceivedAt]);

  const displayFacts = useMemo<StudioBoardDisplayFacts>(() => {
    const blockingRequiredCount =
      materialsFacts?.blockingRequiredCount ??
      boardCampaign?.materialsSummary?.blockingRequiredCount ??
      0;
    return {
      blockingRequiredCount,
      movedToProduction,
      stillNeededLabel: materialsFacts?.stillNeededLabels[0] ?? null,
      customerDisplayName,
    };
  }, [
    boardCampaign?.materialsSummary?.blockingRequiredCount,
    customerDisplayName,
    materialsFacts,
    movedToProduction,
  ]);

  const handleMaterialsFactsChange = useCallback(
    (facts: { blockingRequiredCount: number; stillNeededLabels: readonly string[] }) => {
      setMaterialsFacts((previous) => {
        const nextLabels = [...facts.stillNeededLabels];
        if (
          previous &&
          previous.blockingRequiredCount === facts.blockingRequiredCount &&
          previous.stillNeededLabels.join("\0") === nextLabels.join("\0")
        ) {
          return previous;
        }
        return {
          blockingRequiredCount: facts.blockingRequiredCount,
          stillNeededLabels: nextLabels,
        };
      });
    },
    [],
  );

  const view = useMemo(
    () => resolveStudioBoardView(boardCampaign, displayFacts),
    [boardCampaign, displayFacts],
  );
  const account = useMemo(() => resolveAccountPackageView(boardCampaign), [boardCampaign]);

  const newCampaignHref = studioBoardDraftRoomHref();

  const studioGuideHref = useMemo(
    () => studioBoardStudioGuideHref(campaign?.packageId ?? membershipDefaults.packageId),
    [campaign?.packageId],
  );

  useEffect(() => {
    if (searchParams.get("record") === "open") setRecordOpen(true);
    if (process.env.NODE_ENV === "development" && searchParams.get("productionBrief") === "open") {
      setProductionBriefOpen(true);
    }
  }, [searchParams]);

  const headerGreeting = useMemo(
    () =>
      resolveBoardHeaderGreeting({
        displayName: customerDisplayName,
        greetingPeriod,
        sessionResolved: sessionGreetingResolved,
      }),
    [customerDisplayName, greetingPeriod, sessionGreetingResolved],
  );

  /* Voice Board handoff — welcome once after Intake → sign-in → Board. */
  useEffect(() => {
    if (!ready) return;
    if (accessState === "auth-required") return;
    if (!consumeStudioVoiceBoardWelcome()) return;
    speakConversationLine(conversationRoomGuideV1.boardArrivalWelcomeVoice);
  }, [ready, accessState]);

  if (ready && accessState === "auth-required") {
    return <ClientAccessStatePanel state={accessState} />;
  }

  if (ready && accessState === "denied") {
    return <ClientAccessStatePanel state={accessState} />;
  }

  if (ready && accessState === "error") {
    return <ClientAccessStatePanel state={accessState} onRetry={() => void refresh()} />;
  }

  return (
    <div className="sb sb--v4" aria-label="Studio Board" aria-busy={!ready}>
      <aside className="sb-sidebar">
        <div className="sb-brand">
          <p className="sb-brand__the">{brand.theLabel}</p>
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
              <p className="sb-brand__name">{brand.nameLabel}</p>
            </div>
          </div>
        </div>

        <nav className="sb-nav" aria-label="Studio navigation">
          <NavItem active accent="board" icon="board">
            {sidebar.studioBoard}
          </NavItem>
          <NavItem
            href={routes.feedbackStudio}
            icon="review"
            accent="review"
            active={view.hasCampaign && view.status === "READY_FOR_REVIEW"}
          >
            {sidebar.reviewRoom}
          </NavItem>
          <NavItem
            href={routes.deliverables}
            icon="delivery"
            accent="delivery"
            active={view.hasCampaign && view.status === "DELIVERED"}
          >
            {sidebar.finalDelivery}
          </NavItem>
          <NavItem href={routes.helpCenter} icon="help" accent="help">
            {sidebar.helpCenter}
          </NavItem>
          <NavItem href={newCampaignHref} icon="new">
            {sidebar.newCampaign}
          </NavItem>
          {/* Phone: fills the open slot under Help Center; desktop: last sidebar action. */}
          <CustomerSignOutButton className="sb-sign-out" />
        </nav>

        <div className="sb-sidebar-lower">
          <StudioBoardDevStatus placement="sidebar" />
        </div>
      </aside>

      <div className="sb-main">
        <header className="sb-header-v3">
          <div className="sb-header-v3__row">
            <div className="sb-header-v3__copy">
              <h1 className="sb-header-v3__title">Studio Board</h1>
              {headerGreeting.kind === "named" ? (
                <p className="sb-header-v3__greeting">
                  Good {headerGreeting.period},{" "}
                  <span className="sb-header-v3__name">{headerGreeting.name}</span>
                </p>
              ) : (
                <p
                  className="sb-header-v3__greeting"
                  aria-busy={headerGreeting.busy || undefined}
                >
                  {headerGreeting.text}
                </p>
              )}
            </div>
          </div>
        </header>

        <div
          className={`sb-board-layout${view.hasCampaign ? "" : " sb-board-layout--no-campaign"}`}
        >
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
                <CampaignNextAction
                  campaign={boardCampaign}
                  hasCampaign={view.hasCampaign}
                  status={view.status}
                  nextUpdateLabel={view.headerSnapshot?.nextUpdate ?? null}
                  studioGuideHref={studioGuideHref}
                  displayFacts={displayFacts}
                />
              ) : null}

              {view.hasCampaign && boardCampaign ? (
                <CampaignBriefActions
                  campaign={boardCampaign}
                  onViewBrief={() => router.push(studioBoard.routes.campaignDetails)}
                  className="sb-current-campaign__brief-actions"
                  layout="stack"
                />
              ) : null}

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
                  {!boardCampaign?.approvedStudioPlan ? (
                    <>
                      <CampaignMetric
                        label={currentCampaignCopy.campaignsRemaining}
                        value={account.campaignsRemaining}
                      />
                      <CampaignMetric
                        label={currentCampaignCopy.emailsRemaining}
                        value={account.emailsRemaining}
                      />
                      <CampaignMetric
                        label={currentCampaignCopy.smsRemaining}
                        value={account.smsRemaining}
                      />
                    </>
                  ) : null}
                  <CampaignMetric
                    label={currentCampaignCopy.revisionsRemaining}
                    value={account.revisionsRemaining}
                  />
                </div>
              ) : (
                <p className="sb-current-campaign__empty">{emptyCopy.campaignDescription}</p>
              )}

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
                <div className="sb-current-campaign__empty-actions">
                  <Link href={newCampaignHref} className="utility-btn utility-btn--primary sb-current-campaign__record">
                    {emptyCopy.primaryCta}
                  </Link>
                  <Link href={routes.helpCenter} className="utility-btn utility-btn--secondary">
                    {studioBoard.clientAccess.noActiveProject.secondaryCta}
                  </Link>
                </div>
              ) : null}
            </div>
          </article>

          <article className="sb-card sb-card--progress bf-material bf-material-paper">
            <CampaignProgressPanel
              campaign={boardCampaign}
              steps={view.progressSteps}
              timeline={view.activityFeed}
              displayFacts={displayFacts}
            />
          </article>

          <article className="sb-card sb-card--project-snapshot bf-material bf-material-paper">
            <ProjectSnapshotPanel campaign={boardCampaign} view={view} account={account} />
          </article>

          <StudioBoardMaterialsWorkflow
            campaign={boardCampaign}
            hasCampaign={Boolean(boardCampaign)}
            movedToProduction={movedToProduction}
            onMaterialsFactsChange={handleMaterialsFactsChange}
          />
        </div>
      </div>

      <CampaignRecordDrawer open={recordOpen} onClose={() => setRecordOpen(false)} />
      <RouteMapProductionBriefDrawer
        campaign={boardCampaign}
        open={productionBriefOpen}
        onClose={() => setProductionBriefOpen(false)}
      />
    </div>
  );
}
