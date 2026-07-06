"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import { FILE_ROOM_ROUTE } from "@/config/file-room";
import { ownerConsole, ownerConsoleCampaignRoute } from "@/config/owner-console";
import type { OwnerConsoleScanView } from "@/lib/campaign-tasks/owner-console-scan-view";
import type {
  OwnerConsoleCampaignContext,
  OwnerConsoleDecisionCard,
} from "@/lib/campaign-tasks/owner-console-view";
import type { FileRoomExceptionOperatorContext } from "@/lib/campaign-tasks/exceptions-view";
import type {
  OwnerConsoleSequentialDeskView,
  OwnerConsoleSequentialItem,
  OwnerConsoleTrayId,
} from "@/lib/campaign-tasks/owner-console-sequential";
import {
  resolveOwnerDeskBriefing,
  resolveOwnerDeskGreetingParts,
  resolveOwnerDeskSummary,
} from "@/studio-coordinator";

import {
  FileRoomOwnerConsoleActionBar,
  FileRoomOwnerConsoleDecisionDetail,
  FileRoomOwnerConsoleDecisionPanels,
} from "./FileRoomOwnerConsolePanels";
import type { useOwnerConsoleActions } from "./useOwnerConsoleActions";

type OwnerConsoleActions = ReturnType<typeof useOwnerConsoleActions>;

type FileRoomOwnerConsoleSequentialDeskProps = {
  desk: OwnerConsoleSequentialDeskView;
  scan: OwnerConsoleScanView;
  contexts: Record<string, OwnerConsoleCampaignContext>;
  actions: OwnerConsoleActions;
  ownerDisplayName: string;
  refreshedLabel: string;
};

function trayItemsForCabinet(
  trayId: OwnerConsoleTrayId,
  desk: OwnerConsoleSequentialDeskView,
  scan: OwnerConsoleScanView,
): readonly { id: string; title: string; subtitle: string; href?: string }[] {
  if (trayId === "needs_client") {
    const bucket = scan.buckets.find((entry) => entry.id === "waiting_client");
    return (bucket?.items ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.campaignName,
      href: item.drillDownHref ?? undefined,
    }));
  }

  if (trayId === "recently_handled") {
    const bucket = scan.buckets.find((entry) => entry.id === "recently_resolved");
    return (bucket?.items ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: item.campaignName,
      href: item.drillDownHref ?? undefined,
    }));
  }

  return desk.items
    .filter((item) => item.trayId === trayId)
    .map((item) => ({
      id: item.id,
      title: item.title,
      subtitle: `${item.campaignName} · ${item.subtitle}`,
    }));
}

function CabinetFolderItem({
  trayId,
  title,
  subtitle,
  onClick,
  href,
  static: isStatic,
}: {
  trayId: OwnerConsoleTrayId;
  title: string;
  subtitle: string;
  onClick?: () => void;
  href?: string;
  static?: boolean;
}) {
  const trayClass = trayId.replace(/_/g, "-");
  const className = `fr-owner-sequential__cabinet-folder fr-owner-sequential__cabinet-folder--${trayClass}${isStatic ? " fr-owner-sequential__cabinet-folder--static" : ""}`;
  const inner = (
    <>
      <span className="fr-owner-sequential__cabinet-item-title">{title}</span>
      <span className="fr-owner-sequential__cabinet-item-meta">{subtitle}</span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {inner}
      </button>
    );
  }
  if (href) {
    return (
      <Link className={className} href={href}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

function ClosedFolderCard({
  item,
  onOpen,
}: {
  item: OwnerConsoleSequentialItem;
  onOpen: () => void;
}) {
  const briefing = resolveOwnerDeskBriefing({ currentItem: item });

  return (
    <div
      className={`fr-owner-sequential__folder-closed fr-owner-sequential__folder-closed--${item.trayId.replace(/_/g, "-")}`}
    >
      <span className="fr-owner-sequential__folder-sticker" aria-hidden="true" />
      <div className="fr-owner-sequential__folder-tab" aria-hidden="true">
        <span className="fr-owner-sequential__folder-tab-label">{item.tabLabel}</span>
      </div>
      <div className="fr-owner-sequential__folder-body">
        <p className="fr-owner-sequential__folder-campaign">{item.campaignName}</p>
        <h3 className="fr-owner-sequential__folder-title">{item.title}</h3>
        {briefing ? (
          <p className="fr-owner-sequential__squishy-says">
            <span className="fr-owner-sequential__squishy-says-label">
              {ownerConsole.squishySaysLabel}
            </span>{" "}
            {briefing.squishySays}
          </p>
        ) : (
          <p className="fr-owner-sequential__folder-subtitle">{item.subtitle}</p>
        )}
        <button type="button" className="utility-btn utility-btn--primary" onClick={onOpen}>
          {ownerConsole.reviewFolderLabel}
        </button>
      </div>
    </div>
  );
}

function CoordinatorFolderBrief({
  item,
}: {
  item: OwnerConsoleSequentialItem;
}) {
  const briefing = resolveOwnerDeskBriefing({ currentItem: item });
  if (!briefing) return null;

  return (
    <section className="fr-owner-sequential__coordinator-panel" aria-label="Coordinator briefing">
      <p className="fr-owner-sequential__squishy-says">
        <span className="fr-owner-sequential__squishy-says-label">{ownerConsole.squishySaysLabel}</span>{" "}
        {briefing.squishySays}
      </p>
      <p className="fr-owner-sequential__coordinator-why">{briefing.whyReached}</p>
    </section>
  );
}

function DeskOnlyWorkingSurface({ item }: { item: OwnerConsoleSequentialItem }) {
  const desk = item.deskItem;
  if (!desk) return null;

  return (
    <article className="fr-owner-sequential__working-surface">
      <CoordinatorFolderBrief item={item} />
      <header className="fr-owner-sequential__working-head">
        <p className="fr-owner-sequential__working-campaign">{item.campaignName}</p>
        <h3 className="fr-owner-sequential__working-title">{item.title}</h3>
        <p className="fr-owner-sequential__working-meta">{item.tabLabel}</p>
      </header>
      <dl className="fr-owner-console-card__fields">
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.whatHappened}</dt>
          <dd>{desk.detail}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.whyOwner}</dt>
          <dd>{desk.reasonLabel}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.recommendedNextAction}</dt>
          <dd>{ownerConsole.deskOnlyActionHint}</dd>
        </div>
      </dl>
      <div className="fr-owner-console-actions">
        <Link className="utility-btn utility-btn--primary" href={desk.drillDownHref}>
          {ownerConsole.openWorkspaceLabel}
        </Link>
      </div>
    </article>
  );
}

type ReviewGateWorkingSurfaceProps = {
  item: OwnerConsoleSequentialItem;
  busy: boolean;
  onApproveForReview: () => void;
  onSendBack: (note: string) => void;
  onHold: (note: string) => void;
  onAskTeam: (note: string) => void;
  onAskClient: (clientMessage: string) => void;
};

function ReviewGateWorkingSurface({
  item,
  busy,
  onApproveForReview,
  onSendBack,
  onHold,
  onAskTeam,
  onAskClient,
}: ReviewGateWorkingSurfaceProps) {
  const desk = item.deskItem;
  const [teamNote, setTeamNote] = useState("");
  const [clientMessage, setClientMessage] = useState("");

  useEffect(() => {
    setTeamNote("");
    setClientMessage("");
  }, [item.id]);

  if (!desk) return null;

  const { reviewGate } = ownerConsole;

  return (
    <article className="fr-owner-sequential__working-surface">
      <CoordinatorFolderBrief item={item} />
      <header className="fr-owner-sequential__working-head">
        <p className="fr-owner-sequential__working-campaign">{item.campaignName}</p>
        <h3 className="fr-owner-sequential__working-title">{item.title}</h3>
        <p className="fr-owner-sequential__working-meta">{item.tabLabel}</p>
      </header>
      <dl className="fr-owner-console-card__fields">
        <div className="fr-owner-console-card__field">
          <dt>What you decide</dt>
          <dd>{reviewGate.decisionQuestion}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>What you review</dt>
          <dd>{reviewGate.whatTagiaReviews}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.whatHappened}</dt>
          <dd>{desk.detail}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.whyOwner}</dt>
          <dd>{desk.reasonLabel}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.availableActions}</dt>
          <dd>
            <ul className="fr-owner-console-card__action-list">
              {reviewGate.availableActions.map((action) => (
                <li key={action.id}>
                  <strong>{action.label}</strong>
                  {" — "}
                  {action.whereAfter}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
      <div className="fr-owner-sequential__review-gate-notes">
        <label className="fr-owner-sequential__review-gate-label" htmlFor="review-gate-team-note">
          {reviewGate.teamNoteLabel}
        </label>
        <textarea
          id="review-gate-team-note"
          className="fr-owner-sequential__review-gate-textarea"
          rows={3}
          value={teamNote}
          disabled={busy}
          placeholder={reviewGate.teamNotePlaceholder}
          onChange={(event) => setTeamNote(event.target.value)}
        />
        <label
          className="fr-owner-sequential__review-gate-label"
          htmlFor="review-gate-client-message"
        >
          {reviewGate.clientMessageLabel}
        </label>
        <textarea
          id="review-gate-client-message"
          className="fr-owner-sequential__review-gate-textarea"
          rows={3}
          value={clientMessage}
          disabled={busy}
          placeholder={reviewGate.clientMessagePlaceholder}
          onChange={(event) => setClientMessage(event.target.value)}
        />
      </div>
      <div className="fr-owner-console-actions">
        <button
          type="button"
          className="utility-btn utility-btn--primary"
          disabled={busy}
          onClick={onApproveForReview}
        >
          {reviewGate.approveForReviewLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onSendBack(teamNote)}
        >
          {reviewGate.sendBackLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onHold(teamNote)}
        >
          {reviewGate.holdLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onAskTeam(teamNote)}
        >
          {reviewGate.askTeamLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onAskClient(clientMessage)}
        >
          {reviewGate.askClientLabel}
        </button>
        <Link className="utility-btn" href={desk.drillDownHref}>
          {reviewGate.openProductionWorkspaceLabel}
        </Link>
      </div>
    </article>
  );
}

function ReleaseGateWorkingSurface({
  item,
  busy,
  onRelease,
  onSendBack,
  onHold,
  onAskTeam,
}: {
  item: OwnerConsoleSequentialItem;
  busy: boolean;
  onRelease: () => void;
  onSendBack: (note: string) => void;
  onHold: (note: string) => void;
  onAskTeam: (note: string) => void;
}) {
  const desk = item.deskItem;
  const [teamNote, setTeamNote] = useState("");

  useEffect(() => {
    setTeamNote("");
  }, [item.id]);

  if (!desk) return null;

  const { releaseGate } = ownerConsole;

  return (
    <article className="fr-owner-sequential__working-surface">
      <CoordinatorFolderBrief item={item} />
      <header className="fr-owner-sequential__working-head">
        <p className="fr-owner-sequential__working-campaign">{item.campaignName}</p>
        <h3 className="fr-owner-sequential__working-title">{item.title}</h3>
        <p className="fr-owner-sequential__working-meta">{item.tabLabel}</p>
      </header>
      <dl className="fr-owner-console-card__fields">
        <div className="fr-owner-console-card__field">
          <dt>What you decide</dt>
          <dd>{releaseGate.decisionQuestion}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>What you review</dt>
          <dd>{releaseGate.whatTagiaReviews}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.whatHappened}</dt>
          <dd>{desk.detail}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.whyOwner}</dt>
          <dd>{desk.reasonLabel}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.availableActions}</dt>
          <dd>
            <ul className="fr-owner-console-card__action-list">
              {releaseGate.availableActions.map((action) => (
                <li key={action.id}>
                  <strong>{action.label}</strong>
                  {" — "}
                  {action.whereAfter}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
      <div className="fr-owner-sequential__review-gate-notes">
        <label className="fr-owner-sequential__review-gate-label" htmlFor="release-gate-team-note">
          {releaseGate.teamNoteLabel}
        </label>
        <textarea
          id="release-gate-team-note"
          className="fr-owner-sequential__review-gate-textarea"
          rows={3}
          value={teamNote}
          disabled={busy}
          placeholder={releaseGate.teamNotePlaceholder}
          onChange={(event) => setTeamNote(event.target.value)}
        />
      </div>
      <div className="fr-owner-console-actions">
        <button
          type="button"
          className="utility-btn utility-btn--primary"
          disabled={busy}
          onClick={onRelease}
        >
          {releaseGate.releaseLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onSendBack(teamNote)}
        >
          {releaseGate.sendBackLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onHold(teamNote)}
        >
          {releaseGate.holdLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onAskTeam(teamNote)}
        >
          {releaseGate.askTeamLabel}
        </button>
        <Link className="utility-btn" href={desk.drillDownHref}>
          {releaseGate.openProductionWorkspaceLabel}
        </Link>
      </div>
    </article>
  );
}

function ComplianceHoldWorkingSurface({
  item,
  card,
  operatorContext,
  busy,
  onClear,
  onHold,
  onAskTeam,
  onAssign,
}: {
  item: OwnerConsoleSequentialItem;
  card: OwnerConsoleDecisionCard;
  operatorContext: FileRoomExceptionOperatorContext;
  busy: boolean;
  onClear: (ownerNotes: string) => void;
  onHold: (note: string, ownerNotes: string) => void;
  onAskTeam: (note: string, ownerNotes: string, assignToUserId?: string) => void;
  onAssign: (assignToUserId: string, ownerNotes: string, note: string) => void;
}) {
  const [teamNote, setTeamNote] = useState("");
  const [ownerNotes, setOwnerNotes] = useState("");
  const [assignToUserId, setAssignToUserId] = useState("");

  useEffect(() => {
    setTeamNote("");
    setOwnerNotes("");
    setAssignToUserId("");
  }, [item.id]);

  const { complianceHold } = ownerConsole;

  return (
    <article className="fr-owner-sequential__working-surface">
      <CoordinatorFolderBrief item={item} />
      <header className="fr-owner-sequential__working-head">
        <p className="fr-owner-sequential__working-campaign">{item.campaignName}</p>
        <h3 className="fr-owner-sequential__working-title">{item.title}</h3>
        <p className="fr-owner-sequential__working-meta">{item.tabLabel}</p>
      </header>
      <dl className="fr-owner-console-card__fields">
        <div className="fr-owner-console-card__field">
          <dt>What you decide</dt>
          <dd>{complianceHold.decisionQuestion}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>What you review</dt>
          <dd>{complianceHold.whatTagiaReviews}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.whatHappened}</dt>
          <dd>{card.whatHappened}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.whyOwner}</dt>
          <dd>{card.whyOwner}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.availableActions}</dt>
          <dd>
            <ul className="fr-owner-console-card__action-list">
              {complianceHold.availableActions.map((action) => (
                <li key={action.id}>
                  <strong>{action.label}</strong>
                  {" — "}
                  {action.whereAfter}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
      <div className="fr-owner-sequential__review-gate-notes">
        <label className="fr-owner-sequential__review-gate-label" htmlFor="compliance-owner-notes">
          {complianceHold.ownerNotesLabel}
        </label>
        <textarea
          id="compliance-owner-notes"
          className="fr-owner-sequential__review-gate-textarea"
          rows={2}
          value={ownerNotes}
          disabled={busy}
          placeholder={complianceHold.ownerNotesPlaceholder}
          onChange={(event) => setOwnerNotes(event.target.value)}
        />
        <label className="fr-owner-sequential__review-gate-label" htmlFor="compliance-team-note">
          {complianceHold.teamNoteLabel}
        </label>
        <textarea
          id="compliance-team-note"
          className="fr-owner-sequential__review-gate-textarea"
          rows={3}
          value={teamNote}
          disabled={busy}
          placeholder={complianceHold.teamNotePlaceholder}
          onChange={(event) => setTeamNote(event.target.value)}
        />
        <label className="fr-owner-sequential__review-gate-label" htmlFor="compliance-assign-to">
          {complianceHold.assignToLabel}
        </label>
        <select
          id="compliance-assign-to"
          className="fr-owner-sequential__review-gate-textarea"
          value={assignToUserId}
          disabled={busy}
          onChange={(event) => setAssignToUserId(event.target.value)}
        >
          <option value="">Select assignee (optional for Ask team)</option>
          {operatorContext.assignCandidates.map((candidate) => (
            <option key={candidate.userId} value={candidate.userId}>
              {candidate.displayName}
              {candidate.isOwner ? " (Owner)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="fr-owner-console-actions">
        <button
          type="button"
          className="utility-btn utility-btn--primary"
          disabled={busy}
          onClick={() => onClear(ownerNotes)}
        >
          {complianceHold.clearLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onHold(teamNote, ownerNotes)}
        >
          {complianceHold.holdLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onAskTeam(teamNote, ownerNotes, assignToUserId || undefined)}
        >
          {complianceHold.askTeamLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy || !assignToUserId}
          onClick={() => onAssign(assignToUserId, ownerNotes, teamNote)}
        >
          {complianceHold.assignLabel}
        </button>
        <Link
          className="utility-btn"
          href={ownerConsoleCampaignRoute(card.campaignId, card.id)}
        >
          {complianceHold.openFileRoomLabel}
        </Link>
      </div>
    </article>
  );
}

function DirectionDisagreementWorkingSurface({
  item,
  card,
  operatorContext,
  busy,
  onConfirmDirection,
  onHold,
  onAskTeam,
  onAssign,
}: {
  item: OwnerConsoleSequentialItem;
  card: OwnerConsoleDecisionCard;
  operatorContext: FileRoomExceptionOperatorContext;
  busy: boolean;
  onConfirmDirection: (ownerNotes: string) => void;
  onHold: (note: string, ownerNotes: string) => void;
  onAskTeam: (note: string, ownerNotes: string, assignToUserId?: string) => void;
  onAssign: (assignToUserId: string, ownerNotes: string, note: string) => void;
}) {
  const [teamNote, setTeamNote] = useState("");
  const [ownerNotes, setOwnerNotes] = useState("");
  const [assignToUserId, setAssignToUserId] = useState("");

  useEffect(() => {
    setTeamNote("");
    setOwnerNotes("");
    setAssignToUserId("");
  }, [item.id]);

  const { directionDisagreement } = ownerConsole;

  return (
    <article className="fr-owner-sequential__working-surface">
      <CoordinatorFolderBrief item={item} />
      <header className="fr-owner-sequential__working-head">
        <p className="fr-owner-sequential__working-campaign">{item.campaignName}</p>
        <h3 className="fr-owner-sequential__working-title">{item.title}</h3>
        <p className="fr-owner-sequential__working-meta">{item.tabLabel}</p>
      </header>
      <dl className="fr-owner-console-card__fields">
        <div className="fr-owner-console-card__field">
          <dt>What you decide</dt>
          <dd>{directionDisagreement.decisionQuestion}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>What you review</dt>
          <dd>{directionDisagreement.whatTagiaReviews}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.whatHappened}</dt>
          <dd>{card.whatHappened}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.whyOwner}</dt>
          <dd>{card.whyOwner}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{ownerConsole.fieldLabels.availableActions}</dt>
          <dd>
            <ul className="fr-owner-console-card__action-list">
              {directionDisagreement.availableActions.map((action) => (
                <li key={action.id}>
                  <strong>{action.label}</strong>
                  {" — "}
                  {action.whereAfter}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
      <div className="fr-owner-sequential__review-gate-notes">
        <label className="fr-owner-sequential__review-gate-label" htmlFor="direction-owner-notes">
          {directionDisagreement.ownerNotesLabel}
        </label>
        <textarea
          id="direction-owner-notes"
          className="fr-owner-sequential__review-gate-textarea"
          rows={2}
          value={ownerNotes}
          disabled={busy}
          placeholder={directionDisagreement.ownerNotesPlaceholder}
          onChange={(event) => setOwnerNotes(event.target.value)}
        />
        <label className="fr-owner-sequential__review-gate-label" htmlFor="direction-team-note">
          {directionDisagreement.teamNoteLabel}
        </label>
        <textarea
          id="direction-team-note"
          className="fr-owner-sequential__review-gate-textarea"
          rows={3}
          value={teamNote}
          disabled={busy}
          placeholder={directionDisagreement.teamNotePlaceholder}
          onChange={(event) => setTeamNote(event.target.value)}
        />
        <label className="fr-owner-sequential__review-gate-label" htmlFor="direction-assign-to">
          {directionDisagreement.assignToLabel}
        </label>
        <select
          id="direction-assign-to"
          className="fr-owner-sequential__review-gate-textarea"
          value={assignToUserId}
          disabled={busy}
          onChange={(event) => setAssignToUserId(event.target.value)}
        >
          <option value="">Select assignee (optional for Ask team)</option>
          {operatorContext.assignCandidates.map((candidate) => (
            <option key={candidate.userId} value={candidate.userId}>
              {candidate.displayName}
              {candidate.isOwner ? " (Owner)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="fr-owner-console-actions">
        <button
          type="button"
          className="utility-btn utility-btn--primary"
          disabled={busy}
          onClick={() => onConfirmDirection(ownerNotes)}
        >
          {directionDisagreement.confirmDirectionLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onHold(teamNote, ownerNotes)}
        >
          {directionDisagreement.holdLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onAskTeam(teamNote, ownerNotes, assignToUserId || undefined)}
        >
          {directionDisagreement.askTeamLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy || !assignToUserId}
          onClick={() => onAssign(assignToUserId, ownerNotes, teamNote)}
        >
          {directionDisagreement.assignLabel}
        </button>
        <Link
          className="utility-btn"
          href={ownerConsoleCampaignRoute(card.campaignId, card.id)}
        >
          {directionDisagreement.openFileRoomLabel}
        </Link>
      </div>
    </article>
  );
}

function DeskWorkingSurface({
  item,
  busy,
  actions,
}: {
  item: OwnerConsoleSequentialItem;
  busy: boolean;
  actions: OwnerConsoleActions;
}) {
  if (item.deskItem?.reason === "approval_before_review") {
    return (
      <ReviewGateWorkingSurface
        item={item}
        busy={busy}
        onApproveForReview={() => void actions.confirmApproveForReview(item)}
        onSendBack={(note) => void actions.confirmSendBackForReview(item, note)}
        onHold={(note) => void actions.confirmHoldReviewGate(item, note)}
        onAskTeam={(note) => void actions.confirmAskTeamReviewGate(item, note)}
        onAskClient={(clientMessage) => void actions.confirmAskClientReviewGate(item, clientMessage)}
      />
    );
  }

  if (item.deskItem?.reason === "approval_before_delivery") {
    return (
      <ReleaseGateWorkingSurface
        item={item}
        busy={busy}
        onRelease={() => void actions.confirmReleaseToClient(item)}
        onSendBack={(note) => void actions.confirmSendBackForRelease(item, note)}
        onHold={(note) => void actions.confirmHoldReleaseGate(item, note)}
        onAskTeam={(note) => void actions.confirmAskTeamReleaseGate(item, note)}
      />
    );
  }

  return <DeskOnlyWorkingSurface item={item} />;
}

export default function FileRoomOwnerConsoleSequentialDesk({
  desk,
  scan,
  contexts,
  actions,
  ownerDisplayName,
  refreshedLabel,
}: FileRoomOwnerConsoleSequentialDeskProps) {
  const [currentItemId, setCurrentItemId] = useState<string | null>(desk.items[0]?.id ?? null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [cabinetTrayId, setCabinetTrayId] = useState<OwnerConsoleTrayId | null>(null);

  useEffect(() => {
    if (desk.items.length === 0) {
      setCurrentItemId(null);
      setFolderOpen(false);
      return;
    }
    const stillExists = desk.items.some((entry) => entry.id === currentItemId);
    if (!stillExists) {
      setCurrentItemId(desk.items[0]?.id ?? null);
      setFolderOpen(false);
      actions.resetPanels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when queue changes after owner action
  }, [desk.items, currentItemId]);

  const currentItem = useMemo(
    () => desk.items.find((entry) => entry.id === currentItemId) ?? desk.items[0] ?? null,
    [desk.items, currentItemId],
  );

  const selectedCard: OwnerConsoleDecisionCard | null = currentItem?.exceptionCard ?? null;
  const operatorContext = selectedCard
    ? contexts[selectedCard.campaignId]?.operatorContext
    : undefined;

  const openFolder = () => {
    actions.setError(null);
    actions.resetPanels();
    setFolderOpen(true);
  };

  const closeFolder = () => {
    actions.resetPanels();
    setFolderOpen(false);
  };

  const jumpToItem = (itemId: string) => {
    setCurrentItemId(itemId);
    setCabinetTrayId(null);
    setFolderOpen(false);
    actions.resetPanels();
  };

  const greeting = useMemo(
    () =>
      resolveOwnerDeskGreetingParts({
        ownerDisplayName,
        desk,
        currentItem,
        isEmpty: desk.isEmpty,
      }),
    [ownerDisplayName, desk, currentItem],
  );

  const deskSummary = useMemo(() => resolveOwnerDeskSummary(desk), [desk]);

  const shellClassName = [
    "fr-owner-sequential",
    folderOpen && selectedCard && actions.rowPanel === null ? "fr-owner-sequential--dock" : "",
    folderOpen && selectedCard && actions.rowPanel !== null ? "fr-owner-sequential--panel" : "",
    cabinetTrayId ? "fr-owner-sequential--cabinet" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName}>
      <header className="fr-owner-sequential__header">
        <div className="fr-owner-sequential__header-main">
          <p className="fr-owner-sequential__coordinator-attribution">{ownerConsole.coordinatorName}</p>
          <p className="fr-owner-sequential__greeting">
            Good {greeting.period},{" "}
            <span className="fr-owner-sequential__owner-name">{greeting.ownerDisplayName}</span>.
          </p>
          <p className="fr-owner-sequential__briefing">{greeting.briefing}</p>
          <div className="fr-owner-sequential__desk-summary" aria-label={ownerConsole.todaysDeskLabel}>
            <h2 className="fr-owner-sequential__desk-summary-title">{ownerConsole.todaysDeskLabel}</h2>
            <p className="fr-owner-sequential__desk-summary-folders">
              {ownerConsole.foldersOnDeskLabel(deskSummary.folderCount)}
            </p>
            {deskSummary.breakdownLines.length > 0 ? (
              <ul className="fr-owner-sequential__desk-summary-breakdown">
                {deskSummary.breakdownLines.map((line) => (
                  <li key={line.label}>
                    {line.count} {line.label}
                  </li>
                ))}
              </ul>
            ) : null}
            {!desk.isEmpty ? (
              <p className="fr-owner-sequential__desk-summary-estimate">
                {deskSummary.estimatedReviewLabel}
              </p>
            ) : null}
          </div>
        </div>
        <p className="fr-header__meta fr-owner-sequential__refreshed">
          {ownerConsole.refreshedLabel} {refreshedLabel}
        </p>
      </header>

      <aside className="fr-owner-sequential__cabinet" aria-label={ownerConsole.fileCabinetLabel}>
        <p className="fr-owner-sequential__cabinet-label">{ownerConsole.fileCabinetLabel}</p>
        <ul className="fr-owner-sequential__tray-list">
          {desk.trays.map((tray) => (
            <li key={tray.id}>
              <button
                type="button"
                className={`fr-owner-sequential__tray fr-owner-sequential__tray--${tray.id.replace(/_/g, "-")}${cabinetTrayId === tray.id ? " fr-owner-sequential__tray--active" : ""}`}
                onClick={() => setCabinetTrayId((prev) => (prev === tray.id ? null : tray.id))}
              >
                <span>{tray.shortLabel}</span>
                <span className="fr-owner-sequential__tray-count">{tray.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div
        className={[
          "fr-owner-sequential__workspace",
          cabinetTrayId && !desk.isEmpty ? "fr-owner-sequential__workspace--split" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {desk.isEmpty && !cabinetTrayId ? (
          <section className="fr-owner-sequential__empty">
            <p className="fr-owner-sequential__empty-title">{ownerConsole.emptyDeskTitle}</p>
            <p className="fr-owner-sequential__empty-body">{ownerConsole.emptyDeskBody}</p>
            {desk.needsClientCount > 0 ? (
              <button
                type="button"
                className="utility-btn"
                onClick={() => setCabinetTrayId("needs_client")}
              >
                Needs Client ({desk.needsClientCount})
              </button>
            ) : null}
          </section>
        ) : null}

        {!desk.isEmpty && currentItem && !folderOpen ? (
          <section className="fr-owner-sequential__desk" aria-label={ownerConsole.currentFolderLabel}>
            <p className="fr-owner-sequential__desk-label">{ownerConsole.currentFolderLabel}</p>
            <ClosedFolderCard item={currentItem} onOpen={openFolder} />
          </section>
        ) : null}

        {!desk.isEmpty && currentItem && folderOpen ? (
          <section className="fr-owner-sequential__desk fr-owner-sequential__desk--open">
            <div className="fr-owner-sequential__working-scroll">
              <button type="button" className="fr-owner-sequential__close" onClick={closeFolder}>
                {ownerConsole.closeFolderLabel}
              </button>

              {selectedCard?.row.kind === "compliance_hold" && operatorContext ? (
                <ComplianceHoldWorkingSurface
                  item={currentItem}
                  card={selectedCard}
                  operatorContext={operatorContext}
                  busy={actions.busy}
                  onClear={(ownerNotes) =>
                    actions.confirmClearComplianceHold(selectedCard, ownerNotes)
                  }
                  onHold={(note, ownerNotes) =>
                    actions.confirmHoldComplianceHold(selectedCard, note, ownerNotes)
                  }
                  onAskTeam={(note, ownerNotes, assignToUserId) =>
                    actions.confirmAskTeamComplianceHold(
                      selectedCard,
                      note,
                      ownerNotes,
                      assignToUserId,
                    )
                  }
                  onAssign={(assignToUserId, ownerNotes, note) =>
                    actions.confirmAssignComplianceHold(
                      selectedCard,
                      assignToUserId,
                      ownerNotes,
                      note,
                    )
                  }
                />
              ) : selectedCard?.row.kind === "direction_disagreement" && operatorContext ? (
                <DirectionDisagreementWorkingSurface
                  item={currentItem}
                  card={selectedCard}
                  operatorContext={operatorContext}
                  busy={actions.busy}
                  onConfirmDirection={(ownerNotes) =>
                    actions.confirmDirectionDisagreement(selectedCard, ownerNotes)
                  }
                  onHold={(note, ownerNotes) =>
                    actions.confirmHoldDirectionDisagreement(selectedCard, note, ownerNotes)
                  }
                  onAskTeam={(note, ownerNotes, assignToUserId) =>
                    actions.confirmAskTeamDirectionDisagreement(
                      selectedCard,
                      note,
                      ownerNotes,
                      assignToUserId,
                    )
                  }
                  onAssign={(assignToUserId, ownerNotes, note) =>
                    actions.confirmAssignDirectionDisagreement(
                      selectedCard,
                      assignToUserId,
                      ownerNotes,
                      note,
                    )
                  }
                />
              ) : selectedCard && operatorContext ? (
                <>
                  <CoordinatorFolderBrief item={currentItem} />
                  <FileRoomOwnerConsoleDecisionDetail selectedCard={selectedCard} />

                  {actions.rowPanel === null ? (
                    <FileRoomOwnerConsoleActionBar
                      selectedCard={selectedCard}
                      busy={actions.busy}
                      showDrillDownLink
                      drillDownHref={ownerConsoleCampaignRoute(
                        selectedCard.campaignId,
                        selectedCard.id,
                      )}
                      fileRoomHref={`${FILE_ROOM_ROUTE}/${selectedCard.campaignId}`}
                      onOpenApprove={() => actions.openApprove(selectedCard)}
                      onOpenResolve={actions.openResolve}
                      onOpenAssign={actions.openAssign}
                    />
                  ) : null}

                  <FileRoomOwnerConsoleDecisionPanels
                    selectedCard={selectedCard}
                    rowPanel={actions.rowPanel}
                    busy={actions.busy}
                    operatorContext={operatorContext}
                    assignForm={actions.assignForm}
                    resolveForm={actions.resolveForm}
                    approvalForm={actions.approvalForm}
                    reassign={null}
                    onAssignChange={actions.setAssignForm}
                    onResolveChange={actions.setResolveForm}
                    onApprovalChange={actions.setApprovalForm}
                    onConfirmAssign={() => actions.confirmAssign(selectedCard)}
                    onConfirmResolve={() => actions.confirmResolve(selectedCard)}
                    onApprove={() =>
                      actions.approvalForm &&
                      actions.confirmApprove(selectedCard, actions.approvalForm)
                    }
                    onHold={() =>
                      actions.approvalForm && actions.confirmHold(selectedCard, actions.approvalForm)
                    }
                    onDecline={() =>
                      actions.approvalForm &&
                      actions.confirmDecline(selectedCard, actions.approvalForm)
                    }
                    onReassign={(body) => void actions.patchTasks(selectedCard.campaignId, body)}
                    onCancel={actions.resetPanels}
                  />
                </>
              ) : (
                <DeskWorkingSurface item={currentItem} busy={actions.busy} actions={actions} />
              )}
            </div>
          </section>
        ) : null}

        {cabinetTrayId ? (
          <section className="fr-owner-sequential__cabinet-panel" aria-label="Tray browse">
            <div className="fr-owner-sequential__cabinet-panel-head">
              <h3>{desk.trays.find((tray) => tray.id === cabinetTrayId)?.label}</h3>
              <button type="button" className="utility-btn" onClick={() => setCabinetTrayId(null)}>
                {ownerConsole.fileCabinetCloseLabel}
              </button>
            </div>
            <ul className="fr-owner-sequential__cabinet-items">
              {trayItemsForCabinet(cabinetTrayId, desk, scan).map((entry) => {
                const isJumpable = desk.items.some((item) => item.id === entry.id);
                return (
                  <li key={entry.id}>
                    {isJumpable ? (
                      <CabinetFolderItem
                        trayId={cabinetTrayId}
                        title={entry.title}
                        subtitle={entry.subtitle}
                        onClick={() => jumpToItem(entry.id)}
                      />
                    ) : entry.href ? (
                      <CabinetFolderItem
                        trayId={cabinetTrayId}
                        title={entry.title}
                        subtitle={entry.subtitle}
                        href={entry.href}
                      />
                    ) : (
                      <CabinetFolderItem
                        trayId={cabinetTrayId}
                        title={entry.title}
                        subtitle={entry.subtitle}
                        static
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      {actions.error ? (
        <p className="fr-exceptions__error" role="alert">
          {actions.error}
        </p>
      ) : null}
      {actions.statusMessage ? (
        <p className="fr-banner" role="status">
          {actions.statusMessage}
        </p>
      ) : null}
    </div>
  );
}
