"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useCallback, type ReactNode } from "react";

import CampaignBriefActions from "@/components/campaign-details/CampaignBriefActions";
import CampaignNextAction from "@/components/studio-board/CampaignNextAction";
import CampaignProgressPanel from "@/components/studio-board/CampaignProgressPanel";
import CampaignRecordDrawer from "@/components/studio-board/CampaignRecordDrawer";
import CustomerVisibilityContinuityPanel from "@/components/studio-board/CustomerVisibilityContinuityPanel";
import { clipRepurposingRecordingIsNext } from "@/lib/studio-dispatch/clip-door-facts";
import RouteMapProductionBriefDrawer from "@/components/route-map/RouteMapProductionBriefDrawer";
import MaterialsIntakePanel from "@/components/materials/MaterialsIntakePanel";
import StudioExtrasPanel from "@/components/studio-extras/StudioExtrasPanel";
import StudioBoardMaterialsWorkflow from "@/components/studio-board/StudioBoardMaterialsWorkflow";
import StudioBoardProjectCommunicationSection from "@/components/studio-board/StudioBoardProjectCommunicationSection";
import StudioBoardRefundRequestSection from "@/components/studio-board/StudioBoardRefundRequestSection";
import BoardProjectRecordFacts from "@/components/studio-board/BoardProjectRecordFacts";
import ProjectSnapshotPanel from "@/components/studio-board/ProjectSnapshotPanel";
import StudioBoardDevStatus from "@/components/studio-board/StudioBoardDevStatus";
import ClientAccessStatePanel from "@/components/shared/ClientAccessStatePanel";
import HelpCenterLink from "@/components/shared/HelpCenterLink";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import CustomerSignOutButton from "@/components/auth/CustomerSignOutButton";
import { helpCenter } from "@/config/help-center";
import { studioBoard, studioBoardDraftRoomHref, studioBoardStudioGuideHref } from "@/config/studio-board";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { resolveCustomerVisibilityContinuityView } from "@/lib/customer-visibility-continuity";
import { isIntakeComplete } from "@/lib/studio-board-campaign";
import { isDuplicateStatusAndStage } from "@/lib/studio-board/board-status-mobile-presentation";
import {
  greetingPeriodFromDate,
  resolveAccountPackageView,
  resolveStudioBoardView,
  type GreetingPeriod,
  type StudioBoardDisplayFacts,
} from "@/lib/studio-board-view";
import { speakConversationLine } from "@/lib/studio-conversation-speech";
import {
  consumeStudioVoiceBoardWelcome,
  consumeStudioVoiceReturningWelcome,
} from "@/lib/studio-voice-board-handoff";
import { answerCustomerLifeQuestion } from "@/lib/studio-customer-life/answer-question";
import {
  resolveBoardBoundCustomerDisplayName,
  resolveBoardHeaderGreeting,
} from "@/lib/studio-board-customer-greeting";
import LocalTestFixtureBoardControl from "@/components/studio-board/LocalTestFixtureBoardControl";
import { useCurrentCampaign } from "@/lib/use-current-campaign";
import { useProjectJobStatus } from "@/lib/use-project-job-status";

const {
  empty: emptyCopy,
  currentCampaign: currentCampaignCopy,
  membership: membershipDefaults,
  routes,
} = studioBoard;

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

function BoardMore({
  title,
  children,
  id,
  accessory,
}: {
  title: string;
  children: ReactNode;
  id?: string;
  accessory?: ReactNode;
}) {
  return (
    <details id={id} className="sb-card sb-more bf-material bf-material-paper">
      <summary className="sb-more__summary">
        <span className="sb-more__title">
          {accessory}
          <span>{title}</span>
        </span>
      </summary>
      <div className="sb-more__body">{children}</div>
    </details>
  );
}

function CampaignMetric({
  label,
  value,
  repeat = false,
}: {
  label: string;
  value: ReactNode;
  repeat?: boolean;
}) {
  return (
    <div className={`sb-current-campaign__metric${repeat ? " sb-status-copy-repeat" : ""}`}>
      <span className="sb-current-campaign__label">{label}</span>
      <span className="sb-current-campaign__value">{value}</span>
    </div>
  );
}

type StudioBoardSceneProps = {
  /** Server-gated local/test fixture pickup. Never true in production. */
  showLocalTestFixture?: boolean;
};

/** Studio Board V4 — six-panel dashboard; only panel content changes by status. */
export default function StudioBoardScene({
  showLocalTestFixture = false,
}: StudioBoardSceneProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { campaign, ready, accessState, refresh } = useCurrentCampaign();
  const greetingPeriod = useLiveGreetingPeriod();
  const [recordOpen, setRecordOpen] = useState(false);
  const [productionBriefOpen, setProductionBriefOpen] = useState(false);

  /** Campaign lookup unfinished — never claim no project or empty-state conclusions. */
  const campaignLookupPending = !ready;
  const boardCampaign =
    accessState === "no-active-project" || accessState === "local-unavailable"
      ? null
      : campaign;
  const showNoActiveProject =
    ready && (accessState === "no-active-project" || !boardCampaign);
  const loadingCopy = emptyCopy.loading;
  const { jobs: customerJobs } = useProjectJobStatus(
    boardCampaign?.paymentReceivedAt ? boardCampaign.campaignId : undefined,
  );
  const movedToProduction = customerJobs.some((job) => job.hasProductionStarted);
  /** Session greeting, then bound to the Board campaign so Maya cannot leak onto a fresh project. */
  const [customerDisplayName, setCustomerDisplayName] = useState<string | null>(null);
  const [sessionGreetingResolved, setSessionGreetingResolved] = useState(false);
  const [materialsFacts, setMaterialsFacts] = useState<{
    blockingRequiredCount: number;
    stillNeededLabels: readonly string[];
    receivedLabels: readonly string[];
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

  const boundCustomerDisplayName = useMemo(
    () =>
      resolveBoardBoundCustomerDisplayName({
        sessionDisplayName: customerDisplayName,
        campaign: boardCampaign,
      }),
    [boardCampaign, customerDisplayName],
  );

  const displayFacts = useMemo<StudioBoardDisplayFacts>(() => {
    const blockingRequiredCount =
      materialsFacts?.blockingRequiredCount ??
      boardCampaign?.materialsSummary?.blockingRequiredCount ??
      0;
    return {
      blockingRequiredCount,
      movedToProduction,
      stillNeededLabel: materialsFacts?.stillNeededLabels[0] ?? null,
      customerDisplayName: boundCustomerDisplayName,
      jobs: customerJobs,
    };
  }, [
    boardCampaign?.materialsSummary?.blockingRequiredCount,
    boundCustomerDisplayName,
    customerJobs,
    materialsFacts,
    movedToProduction,
  ]);

  const handleMaterialsFactsChange = useCallback(
    (facts: {
      blockingRequiredCount: number;
      stillNeededLabels: readonly string[];
      receivedLabels?: readonly string[];
    }) => {
      setMaterialsFacts((previous) => {
        const nextLabels = [...facts.stillNeededLabels];
        const nextReceived = [...(facts.receivedLabels ?? [])];
        if (
          previous &&
          previous.blockingRequiredCount === facts.blockingRequiredCount &&
          previous.stillNeededLabels.join("\0") === nextLabels.join("\0") &&
          previous.receivedLabels.join("\0") === nextReceived.join("\0")
        ) {
          return previous;
        }
        return {
          blockingRequiredCount: facts.blockingRequiredCount,
          stillNeededLabels: nextLabels,
          receivedLabels: nextReceived,
        };
      });
    },
    [],
  );

  const view = useMemo(
    () => resolveStudioBoardView(boardCampaign, displayFacts),
    [boardCampaign, displayFacts],
  );
  const visibilityView = useMemo(
    () =>
      resolveCustomerVisibilityContinuityView({
        campaign: boardCampaign,
        displayFacts,
        materialsFacts,
        headerSnapshot: view.headerSnapshot,
        jobs: customerJobs,
      }),
    [boardCampaign, customerJobs, displayFacts, materialsFacts, view.headerSnapshot],
  );
  const account = useMemo(() => resolveAccountPackageView(boardCampaign), [boardCampaign]);
  const boardCondensed = view.hasCampaign && !campaignLookupPending;

  useEffect(() => {
    if (window.location.hash !== "#sb-project-details") return;
    const node = document.getElementById("sb-project-details");
    if (node instanceof HTMLDetailsElement) node.open = true;
    node?.scrollIntoView({ block: "start" });
  }, [boardCondensed]);

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
        displayName: boundCustomerDisplayName,
        greetingPeriod,
        sessionResolved: sessionGreetingResolved && ready,
      }),
    [boundCustomerDisplayName, greetingPeriod, ready, sessionGreetingResolved],
  );

  /* Voice Board handoff — welcome once after Intake → sign-in → Board. */
  useEffect(() => {
    if (!ready) return;
    if (accessState === "auth-required" || accessState === "local-unavailable") return;
    if (consumeStudioVoiceBoardWelcome()) {
      speakConversationLine(conversationRoomGuideV1.boardArrivalWelcomeVoice);
      return;
    }
    if (!consumeStudioVoiceReturningWelcome()) return;
    const returning = answerCustomerLifeQuestion("I am a returning customer.", {
      campaign: boardCampaign,
      account: {
        signedIn: true,
        preferredName: boundCustomerDisplayName,
      },
    });
    speakConversationLine(returning.text);
  }, [accessState, boardCampaign, boundCustomerDisplayName, ready]);

  const greetingLead =
    headerGreeting.kind === "named"
      ? `Good ${headerGreeting.period}, ${headerGreeting.name}`
      : headerGreeting.text;

  if (ready && accessState === "auth-required") {
    return <ClientAccessStatePanel state={accessState} />;
  }

  if (ready && accessState === "denied") {
    return <ClientAccessStatePanel state={accessState} />;
  }

  if (ready && accessState === "local-unavailable") {
    return <ClientAccessStatePanel state={accessState} />;
  }

  if (ready && accessState === "error") {
    return <ClientAccessStatePanel state={accessState} onRetry={() => void refresh()} />;
  }

  return (
    <div className="sb sb--v4" aria-label="Studio Board" aria-busy={!ready}>
      <div className="sb-main">
        <UtilityPageHeader
          backHref={routes.studioLobby}
          backLabel="← Back to Studio Lobby"
          activeNav="studio-board"
          title={greetingLead}
          helpCenterFrom="studio-board"
        />

        <header className="sb-header-v3">
          {showLocalTestFixture ? <LocalTestFixtureBoardControl /> : null}
        </header>

        <div className="sb-page-actions">
          <CustomerSignOutButton className="sb-sign-out" />
        </div>

        <div
          className={`sb-board-layout${
            campaignLookupPending || view.hasCampaign ? "" : " sb-board-layout--no-campaign"
          }${boardCondensed ? " sb-board-layout--condensed" : ""}`}
        >
          {boardCondensed ? (
            <>
              <article
                className="sb-card sb-card--current sb-overview bf-material bf-material-paper"
                aria-labelledby="sb-current-campaign-title"
              >
                <div className="sb-overview__body">
                  <h2 id="sb-current-campaign-title" className="sb-current-campaign__name">
                    {view.campaignTitle}
                    {view.packageLabel ? (
                      <span className="sb-overview__service"> · {view.packageLabel}</span>
                    ) : null}
                  </h2>
                  <p className="sb-overview__status">{view.statusLabel}</p>
                  <div className="sb-overview__next">
                    <p className="sb-overview__kicker">Your next step</p>
                    <CampaignNextAction
                      campaign={boardCampaign}
                      hasCampaign={view.hasCampaign}
                      status={view.status}
                      nextUpdateLabel={view.headerSnapshot?.nextUpdate ?? null}
                      studioGuideHref={studioGuideHref}
                      displayFacts={displayFacts}
                      sourceSearch={`?${searchParams.toString()}`}
                      showStatus={false}
                    />
                  </div>
                  <dl className="sb-overview__facts">
                    <div>
                      <dt>Project Intake</dt>
                      <dd>
                        {clipRepurposingRecordingIsNext(boardCampaign)
                          ? "Saved"
                          : isIntakeComplete(boardCampaign)
                            ? "Finished"
                            : "Not finished"}
                      </dd>
                    </div>
                    <div>
                      <dt>Payment</dt>
                      <dd>{account.paymentStatus}</dd>
                    </div>
                    <div>
                      <dt>{currentCampaignCopy.revisionsRemaining}</dt>
                      <dd>{account.revisionsRemaining}</dd>
                    </div>
                  </dl>
                  <p className="sb-overview__note">
                    Project details, materials, policies, and delivery information available when needed.
                  </p>
                </div>
              </article>

              <BoardMore
                id="sb-project-details"
                title="Project details"
                accessory={
                  <Link
                    href={newCampaignHref}
                    className="sb-more__new"
                    onClick={(event) => event.stopPropagation()}
                  >
                    New
                  </Link>
                }
              >
                {boardCampaign ? <BoardProjectRecordFacts campaign={boardCampaign} /> : null}
                {boardCampaign ? (
                  <CampaignBriefActions
                    campaign={boardCampaign}
                    showView={false}
                    className="sb-current-campaign__brief-actions"
                    layout="stack"
                    currentStatusLabel={view.statusLabel}
                  />
                ) : null}
                <div className="sb-current-campaign__metrics">
                  {view.packageLabel ? (
                    <CampaignMetric label={currentCampaignCopy.package} value={view.packageLabel} />
                  ) : null}
                  {view.campaignProgressLabel ? (
                    <CampaignMetric
                      label={currentCampaignCopy.campaignStage}
                      value={view.campaignProgressLabel}
                      repeat={isDuplicateStatusAndStage(view.statusLabel, view.campaignProgressLabel)}
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
                </div>
                <ProjectSnapshotPanel campaign={boardCampaign} view={view} account={account} />
              </BoardMore>

              <BoardMore title="Materials" id="sb-materials">
                <StudioBoardMaterialsWorkflow
                  campaign={boardCampaign}
                  hasCampaign={Boolean(boardCampaign)}
                  campaignLookupPending={campaignLookupPending}
                  movedToProduction={movedToProduction}
                  onMaterialsFactsChange={handleMaterialsFactsChange}
                  hideGlance={Boolean(boardCampaign?.paymentReceivedAt)}
                />
                {boardCampaign?.paymentReceivedAt ? <MaterialsIntakePanel campaign={boardCampaign} /> : null}
                {boardCampaign?.paymentReceivedAt ? (
                  <StudioExtrasPanel campaignId={boardCampaign.campaignId} placement="board" />
                ) : null}
              </BoardMore>

              <BoardMore title="Progress">
                <CampaignProgressPanel
                  campaign={boardCampaign}
                  steps={view.progressSteps}
                  timeline={view.activityFeed}
                  displayFacts={displayFacts}
                />
              </BoardMore>

              <BoardMore title="Messages">
                <StudioBoardProjectCommunicationSection
                  campaign={boardCampaign}
                  hasCampaign={Boolean(boardCampaign)}
                  campaignLookupPending={campaignLookupPending}
                />
              </BoardMore>

              <BoardMore title="Payment history and policies">
                <StudioBoardRefundRequestSection
                  campaign={boardCampaign}
                  hasCampaign={Boolean(boardCampaign)}
                  campaignLookupPending={campaignLookupPending}
                />
                {view.status === "DRAFT_RECEIVED" || view.status === "PAYMENT_RECEIVED" ? (
                  <HelpCenterLink
                    label={helpCenter.boardLinks.awaitingPayment.label}
                    anchor={helpCenter.boardLinks.awaitingPayment.anchor}
                    from="studio-board"
                    className="sb-help-link"
                  />
                ) : null}
              </BoardMore>
            </>
          ) : (
          <>
          <div className="sb-board-stack sb-board-stack--main">
          <article
            className="sb-card sb-card--current bf-material bf-material-paper"
            aria-labelledby="sb-current-campaign-title"
          >
            <p className="sb-card__tab">{currentCampaignCopy.heading}</p>
            <div className="sb-current-campaign" aria-live="polite">
              {campaignLookupPending ? (
                <>
                  <h2
                    id="sb-current-campaign-title"
                    className="sb-current-campaign__name"
                  >
                    {loadingCopy.campaignNamePlaceholder}
                  </h2>
                  <p className="sb-current-campaign__empty">{loadingCopy.campaignDescription}</p>
                </>
              ) : (
                <>
                  <h2
                    id="sb-current-campaign-title"
                    className={`sb-current-campaign__name${view.hasCampaign ? "" : " sb-current-campaign__name--empty"}`}
                  >
                    {view.hasCampaign
                      ? view.campaignTitle
                      : emptyCopy.campaignNamePlaceholder}
                  </h2>

                  {view.hasCampaign || showNoActiveProject ? (
                    <CustomerVisibilityContinuityPanel view={visibilityView} />
                  ) : null}

                  {view.hasCampaign ? (
                    <CampaignNextAction
                      campaign={boardCampaign}
                      hasCampaign={view.hasCampaign}
                      status={view.status}
                      nextUpdateLabel={view.headerSnapshot?.nextUpdate ?? null}
                      studioGuideHref={studioGuideHref}
                      displayFacts={displayFacts}
                      sourceSearch={`?${searchParams.toString()}`}
                    />
                  ) : null}

                  {view.hasCampaign && boardCampaign ? (
                    <CampaignBriefActions
                      campaign={boardCampaign}
                      onViewBrief={() => router.push(studioBoard.routes.campaignDetails)}
                      className="sb-current-campaign__brief-actions"
                      layout="stack"
                      currentStatusLabel={view.statusLabel}
                    />
                  ) : null}

                  {view.hasCampaign ? (
                    <div className="sb-current-campaign__metrics">
                      {view.packageLabel ? (
                        <CampaignMetric
                          label={currentCampaignCopy.package}
                          value={view.packageLabel}
                        />
                      ) : null}
                      <CampaignMetric
                        label={currentCampaignCopy.status}
                        value={view.statusLabel}
                      />
                      {view.campaignProgressLabel ? (
                        <CampaignMetric
                          label={currentCampaignCopy.campaignStage}
                          value={view.campaignProgressLabel}
                          repeat={isDuplicateStatusAndStage(
                            view.statusLabel,
                            view.campaignProgressLabel,
                          )}
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
                  ) : showNoActiveProject ? (
                    <p className="sb-current-campaign__empty">{emptyCopy.campaignDescription}</p>
                  ) : null}

                  {view.hasCampaign &&
                  (view.status === "DRAFT_RECEIVED" ||
                    view.status === "PAYMENT_RECEIVED") ? (
                    <HelpCenterLink
                      label={helpCenter.boardLinks.awaitingPayment.label}
                      anchor={helpCenter.boardLinks.awaitingPayment.anchor}
                      from="studio-board"
                      className="sb-help-link"
                    />
                  ) : null}

                  {showNoActiveProject ? (
                    <div className="sb-current-campaign__empty-actions">
                      <Link
                        href={newCampaignHref}
                        className="utility-btn utility-btn--primary sb-current-campaign__record"
                      >
                        {emptyCopy.primaryCta}
                      </Link>
                      <Link
                        href={routes.helpCenter}
                        className="utility-btn utility-btn--secondary"
                      >
                        {studioBoard.clientAccess.noActiveProject.secondaryCta}
                      </Link>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </article>

          <article className="sb-card sb-card--project-snapshot bf-material bf-material-paper">
            {campaignLookupPending ? (
              <>
                <p className="sb-card__tab">PROJECT SNAPSHOT</p>
                <p className="sb-project-snapshot__empty">{loadingCopy.snapshotHint}</p>
              </>
            ) : (
              <ProjectSnapshotPanel
                campaign={boardCampaign}
                view={view}
                account={account}
              />
            )}
          </article>

          <StudioBoardRefundRequestSection
            campaign={boardCampaign}
            hasCampaign={Boolean(boardCampaign)}
            campaignLookupPending={campaignLookupPending}
          />

          {boardCampaign?.paymentReceivedAt ? (
            <MaterialsIntakePanel campaign={boardCampaign} />
          ) : null}

          {boardCampaign?.paymentReceivedAt ? (
            <StudioExtrasPanel campaignId={boardCampaign.campaignId} placement="board" />
          ) : null}
          </div>

          <div className="sb-board-stack sb-board-stack--side">
          <article className="sb-card sb-card--progress bf-material bf-material-paper">
            {campaignLookupPending ? (
              <>
                <p className="sb-card__tab">{studioBoard.progressCard.journeyHeading}</p>
                <p className="sb-progress-panel__timeline-empty">{loadingCopy.progressHint}</p>
              </>
            ) : (
              <CampaignProgressPanel
                campaign={boardCampaign}
                steps={view.progressSteps}
                timeline={view.activityFeed}
                displayFacts={displayFacts}
              />
            )}
          </article>

          <StudioBoardMaterialsWorkflow
            campaign={boardCampaign}
            hasCampaign={Boolean(boardCampaign)}
            campaignLookupPending={campaignLookupPending}
            movedToProduction={movedToProduction}
            onMaterialsFactsChange={handleMaterialsFactsChange}
          />

          <StudioBoardProjectCommunicationSection
            campaign={boardCampaign}
            hasCampaign={Boolean(boardCampaign)}
            campaignLookupPending={campaignLookupPending}
          />
          </div>
          </>
          )}
        </div>

        <StudioBoardDevStatus placement="sidebar" />
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
