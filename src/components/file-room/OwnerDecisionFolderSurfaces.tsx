"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ownerConsole, ownerConsoleCampaignRoute } from "@/config/owner-console";
import { REFUND_REQUEST_CHANNELS } from "@/config/refund-request-channels";
import type { OwnerConsoleDecisionCard } from "@/lib/campaign-tasks/owner-console-view";
import type { OwnerConsoleSequentialItem } from "@/lib/campaign-tasks/owner-console-sequential";
import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";

import type { FileRoomExceptionOperatorContext } from "./FileRoomExceptionAssignPanel";
import { CoordinatorFolderBrief } from "./FileRoomOwnerConsoleSequentialDesk";

type DecisionConfigKey = "deadlineDecision" | "revisionDecision" | "scopeDecision";

const EXCEPTION_CONFIG: Partial<Record<CampaignExceptionKind, DecisionConfigKey>> = {
  deadline_commitment: "deadlineDecision",
  deadline_risk: "deadlineDecision",
  revision_exhausted: "revisionDecision",
  scope_change: "scopeDecision",
};

export function resolveOwnerDecisionConfigKey(
  kind: CampaignExceptionKind | undefined,
): DecisionConfigKey | null {
  if (!kind) return null;
  return EXCEPTION_CONFIG[kind] ?? null;
}

type OwnerDecisionFolderWorkingSurfaceProps = {
  item: OwnerConsoleSequentialItem;
  card: OwnerConsoleDecisionCard;
  operatorContext: FileRoomExceptionOperatorContext;
  configKey: DecisionConfigKey;
  busy: boolean;
  onPrimary: (ownerNotes: string) => void;
  onSecondary?: (ownerNotes: string) => void;
  onHold: (note: string, ownerNotes: string) => void;
  onAskTeam: (note: string, ownerNotes: string, assignToUserId?: string) => void;
  onAskClient?: (clientMessage: string, ownerNotes: string) => void;
  onAskClientInfo?: (clientMessage: string, ownerNotes: string) => void;
  onAskClientApproval?: (clientMessage: string, ownerNotes: string) => void;
  onApplyProjectChange?: (
    change: { kind: "add_service" | "remove_service"; serviceId: string },
    ownerNotes: string,
  ) => void;
  onAssign: (assignToUserId: string, ownerNotes: string, note: string) => void;
};

export function OwnerDecisionFolderWorkingSurface({
  item,
  card,
  operatorContext,
  configKey,
  busy,
  onPrimary,
  onSecondary,
  onHold,
  onAskTeam,
  onAskClient,
  onAskClientInfo,
  onAskClientApproval,
  onApplyProjectChange,
  onAssign,
}: OwnerDecisionFolderWorkingSurfaceProps) {
  const [teamNote, setTeamNote] = useState("");
  const [ownerNotes, setOwnerNotes] = useState("");
  const [clientMessage, setClientMessage] = useState("");
  const [assignToUserId, setAssignToUserId] = useState("");
  const [applyKind, setApplyKind] = useState<"remove_service" | "add_service">("remove_service");
  const [applyServiceId, setApplyServiceId] = useState("");

  useEffect(() => {
    setTeamNote("");
    setOwnerNotes("");
    setClientMessage("");
    setAssignToUserId("");
    setApplyKind("remove_service");
    setApplyServiceId("");
  }, [item.id]);

  const config = ownerConsole[configKey];
  const applyReady = Boolean(card.projectChangeApply);
  const primaryLabel =
    applyReady && configKey === "scopeDecision"
      ? ownerConsole.scopeDecision.applyProjectChangeLabel
      : configKey === "deadlineDecision"
      ? ownerConsole.deadlineDecision.commitLabel
      : configKey === "revisionDecision"
        ? ownerConsole.revisionDecision.allowLabel
        : ownerConsole.scopeDecision.approveLabel;
  const secondaryLabel =
    configKey === "revisionDecision"
      ? ownerConsole.revisionDecision.holdFirmLabel
      : configKey === "scopeDecision"
        ? ownerConsole.scopeDecision.declineLabel
        : undefined;

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
          <dd>{config.decisionQuestion}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>What you review</dt>
          <dd>{config.whatTagiaReviews}</dd>
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
              {config.availableActions.map((action) => (
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
        <label className="fr-owner-sequential__review-gate-label" htmlFor="decision-owner-notes">
          {config.ownerNotesLabel}
        </label>
        <textarea
          id="decision-owner-notes"
          className="fr-owner-sequential__review-gate-textarea"
          rows={2}
          value={ownerNotes}
          disabled={busy}
          placeholder={config.ownerNotesPlaceholder}
          onChange={(event) => setOwnerNotes(event.target.value)}
        />
        <label className="fr-owner-sequential__review-gate-label" htmlFor="decision-team-note">
          {config.teamNoteLabel}
        </label>
        <textarea
          id="decision-team-note"
          className="fr-owner-sequential__review-gate-textarea"
          rows={3}
          value={teamNote}
          disabled={busy}
          placeholder={config.teamNotePlaceholder}
          onChange={(event) => setTeamNote(event.target.value)}
        />
        {(onAskClient || onAskClientInfo || onAskClientApproval) && (
          <>
            <label className="fr-owner-sequential__review-gate-label" htmlFor="decision-client-msg">
              {"clientMessageLabel" in config ? config.clientMessageLabel : "Client message"}
            </label>
            <textarea
              id="decision-client-msg"
              className="fr-owner-sequential__review-gate-textarea"
              rows={3}
              value={clientMessage}
              disabled={busy}
              placeholder={
                "clientMessagePlaceholder" in config ? config.clientMessagePlaceholder : ""
              }
              onChange={(event) => setClientMessage(event.target.value)}
            />
          </>
        )}
        <label className="fr-owner-sequential__review-gate-label" htmlFor="decision-assign-to">
          {config.assignToLabel}
        </label>
        <select
          id="decision-assign-to"
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
      {applyReady && card.projectChangeApply ? (
        <div className="fr-owner-sequential__review-gate-notes">
          <p className="fr-owner-sequential__working-meta">
            Customer consent received for: {card.projectChangeApply.requestSummary}
          </p>
          <label className="fr-owner-sequential__review-gate-label" htmlFor="decision-apply-kind">
            {ownerConsole.scopeDecision.applyKindLabel}
          </label>
          <select
            id="decision-apply-kind"
            className="fr-owner-sequential__review-gate-textarea"
            value={applyKind}
            disabled={busy}
            onChange={(event) =>
              setApplyKind(event.target.value as "remove_service" | "add_service")
            }
          >
            <option value="remove_service">Remove service</option>
            <option value="add_service">Add service</option>
          </select>
          <label className="fr-owner-sequential__review-gate-label" htmlFor="decision-apply-service">
            {ownerConsole.scopeDecision.applyServiceIdLabel}
          </label>
          <input
            id="decision-apply-service"
            className="fr-owner-sequential__review-gate-textarea"
            value={applyServiceId}
            disabled={busy}
            onChange={(event) => setApplyServiceId(event.target.value)}
          />
        </div>
      ) : null}
      <div className="fr-owner-console-actions">
        <button
          type="button"
          className="utility-btn utility-btn--primary"
          disabled={busy}
          onClick={() =>
            applyReady && onApplyProjectChange
              ? onApplyProjectChange({ kind: applyKind, serviceId: applyServiceId.trim() }, ownerNotes)
              : onPrimary(ownerNotes)
          }
        >
          {primaryLabel}
        </button>
        {secondaryLabel && onSecondary && !applyReady ? (
          <button
            type="button"
            className="utility-btn"
            disabled={busy}
            onClick={() => onSecondary(ownerNotes)}
          >
            {secondaryLabel}
          </button>
        ) : null}
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onHold(teamNote, ownerNotes)}
        >
          {config.holdLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onAskTeam(teamNote, ownerNotes, assignToUserId || undefined)}
        >
          {config.askTeamLabel}
        </button>
        {onAskClient ? (
          <button
            type="button"
            className="utility-btn"
            disabled={busy}
            onClick={() => onAskClient(clientMessage, ownerNotes)}
          >
            {"askClientLabel" in config ? config.askClientLabel : "Ask client"}
          </button>
        ) : null}
        {onAskClientInfo ? (
          <button
            type="button"
            className="utility-btn"
            disabled={busy}
            onClick={() => onAskClientInfo(clientMessage, ownerNotes)}
          >
            {ownerConsole.scopeDecision.askClientInfoLabel}
          </button>
        ) : null}
        {onAskClientApproval ? (
          <button
            type="button"
            className="utility-btn"
            disabled={busy}
            onClick={() => onAskClientApproval(clientMessage, ownerNotes)}
          >
            {"askClientApprovalLabel" in config
              ? config.askClientApprovalLabel
              : "Ask client — need approval"}
          </button>
        ) : null}
        <button
          type="button"
          className="utility-btn"
          disabled={busy || !assignToUserId}
          onClick={() => onAssign(assignToUserId, ownerNotes, teamNote)}
        >
          {config.assignLabel}
        </button>
        <Link
          className="utility-btn"
          href={ownerConsoleCampaignRoute(card.campaignId, card.id)}
        >
          {config.openFileRoomLabel}
        </Link>
      </div>
    </article>
  );
}

export function RefundDecisionWorkingSurface({
  item,
  busy,
  onApprove,
  onDeny,
  onHold,
  onAskTeam,
  onAskClient,
}: {
  item: OwnerConsoleSequentialItem;
  busy: boolean;
  onApprove: (reason: string, ownerNotes: string) => void;
  onDeny: (ownerNotes: string) => void;
  onHold: (note: string, ownerNotes: string) => void;
  onAskTeam: (note: string, ownerNotes: string) => void;
  onAskClient: (clientMessage: string, ownerNotes: string) => void;
}) {
  const [teamNote, setTeamNote] = useState("");
  const [ownerNotes, setOwnerNotes] = useState("");
  const [clientMessage, setClientMessage] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const config = ownerConsole.refundDecision;
  const snapshot = item.deskItem?.refundSnapshot;
  const labels = config.snapshotLabels;

  useEffect(() => {
    setTeamNote("");
    setOwnerNotes("");
    setClientMessage("");
    setRefundReason("");
  }, [item.id]);

  return (
    <article className="fr-owner-sequential__working-surface">
      <CoordinatorFolderBrief item={item} />
      <header className="fr-owner-sequential__working-head">
        <p className="fr-owner-sequential__working-campaign">{item.campaignName}</p>
        <h3 className="fr-owner-sequential__working-title">{item.title}</h3>
      </header>
      <dl className="fr-owner-console-card__fields">
        <div className="fr-owner-console-card__field">
          <dt>What you decide</dt>
          <dd>{config.decisionQuestion}</dd>
        </div>
        {snapshot ? (
          <>
            <div className="fr-owner-console-card__field">
              <dt>{labels.clientReason}</dt>
              <dd>{snapshot.reason}</dd>
            </div>
            {snapshot.sourceChannel ? (
              <div className="fr-owner-console-card__field">
                <dt>{labels.requestChannel}</dt>
                <dd>{REFUND_REQUEST_CHANNELS[snapshot.sourceChannel].label}</dd>
              </div>
            ) : null}
            <div className="fr-owner-console-card__field">
              <dt>{labels.requestedOutcome}</dt>
              <dd>{snapshot.requestedOutcome}</dd>
            </div>
            <div className="fr-owner-console-card__field">
              <dt>{labels.policyStatus}</dt>
              <dd>{snapshot.policyStatusLabel}</dd>
            </div>
            <div className="fr-owner-console-card__field">
              <dt>{labels.productionStatus}</dt>
              <dd>
                {snapshot.productionStarted
                  ? config.productionStartedYes
                  : config.productionStartedNo}
              </dd>
            </div>
            <div className="fr-owner-console-card__field">
              <dt>{labels.conceptsOrFiles}</dt>
              <dd>
                {snapshot.receivedConceptsOrFiles
                  ? config.conceptsReceivedYes
                  : config.conceptsReceivedNo}
              </dd>
            </div>
            <div className="fr-owner-console-card__field">
              <dt>{labels.timelineFacts}</dt>
              <dd>{snapshot.timelineFacts}</dd>
            </div>
            {snapshot.missingEvidence ? (
              <div className="fr-owner-console-card__field">
                <dt>{labels.missingEvidence}</dt>
                <dd>{snapshot.missingEvidence}</dd>
              </div>
            ) : null}
            {snapshot.supportingDetails ? (
              <div className="fr-owner-console-card__field">
                <dt>{labels.supportingDetails}</dt>
                <dd>{snapshot.supportingDetails}</dd>
              </div>
            ) : null}
            <div className="fr-owner-console-card__field">
              <dt>{labels.recommendedNextAction}</dt>
              <dd>{snapshot.recommendedNextAction}</dd>
            </div>
          </>
        ) : (
          <div className="fr-owner-console-card__field">
            <dt>What you review</dt>
            <dd>{config.whatTagiaReviews}</dd>
          </div>
        )}
      </dl>
      <div className="fr-owner-sequential__review-gate-notes">
        <label className="fr-owner-sequential__review-gate-label" htmlFor="refund-reason">
          {config.refundReasonLabel}
        </label>
        <textarea
          id="refund-reason"
          className="fr-owner-sequential__review-gate-textarea"
          rows={2}
          value={refundReason}
          disabled={busy}
          placeholder={config.refundReasonPlaceholder}
          onChange={(event) => setRefundReason(event.target.value)}
        />
        <label className="fr-owner-sequential__review-gate-label" htmlFor="refund-owner-notes">
          {config.ownerNotesLabel}
        </label>
        <textarea
          id="refund-owner-notes"
          className="fr-owner-sequential__review-gate-textarea"
          rows={2}
          value={ownerNotes}
          disabled={busy}
          placeholder={config.ownerNotesPlaceholder}
          onChange={(event) => setOwnerNotes(event.target.value)}
        />
        <label className="fr-owner-sequential__review-gate-label" htmlFor="refund-team-note">
          {config.teamNoteLabel}
        </label>
        <textarea
          id="refund-team-note"
          className="fr-owner-sequential__review-gate-textarea"
          rows={3}
          value={teamNote}
          disabled={busy}
          placeholder={config.teamNotePlaceholder}
          onChange={(event) => setTeamNote(event.target.value)}
        />
        <label className="fr-owner-sequential__review-gate-label" htmlFor="refund-client-msg">
          {config.clientMessageLabel}
        </label>
        <textarea
          id="refund-client-msg"
          className="fr-owner-sequential__review-gate-textarea"
          rows={3}
          value={clientMessage}
          disabled={busy}
          placeholder={config.clientMessagePlaceholder}
          onChange={(event) => setClientMessage(event.target.value)}
        />
      </div>
      <div className="fr-owner-console-actions">
        <button
          type="button"
          className="utility-btn utility-btn--primary"
          disabled={busy}
          onClick={() => onApprove(refundReason, ownerNotes)}
        >
          {config.approveLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={() => onDeny(ownerNotes)}>
          {config.denyLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={() => onHold(teamNote, ownerNotes)}>
          {config.holdLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={() => onAskTeam(teamNote, ownerNotes)}>
          {config.askTeamLabel}
        </button>
        <button
          type="button"
          className="utility-btn"
          disabled={busy}
          onClick={() => onAskClient(clientMessage, ownerNotes)}
        >
          {config.askClientLabel}
        </button>
        {item.deskItem ? (
          <Link className="utility-btn" href={item.deskItem.drillDownHref}>
            {config.openProductionWorkspaceLabel}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function HeavyLaneDecisionWorkingSurface({
  item,
  busy,
  onWait,
  onBump,
  onAssign,
}: {
  item: OwnerConsoleSequentialItem;
  busy: boolean;
  onWait: (ownerNotes: string) => void;
  onBump: (ownerNotes: string) => void;
  onAssign: (note: string, ownerNotes: string) => void;
}) {
  const [teamNote, setTeamNote] = useState("");
  const [ownerNotes, setOwnerNotes] = useState("");
  const config = ownerConsole.heavyLaneDecision;

  useEffect(() => {
    setTeamNote("");
    setOwnerNotes("");
  }, [item.id]);

  return (
    <article className="fr-owner-sequential__working-surface">
      <CoordinatorFolderBrief item={item} />
      <header className="fr-owner-sequential__working-head">
        <p className="fr-owner-sequential__working-campaign">{item.campaignName}</p>
        <h3 className="fr-owner-sequential__working-title">{item.title}</h3>
      </header>
      <dl className="fr-owner-console-card__fields">
        <div className="fr-owner-console-card__field">
          <dt>What you decide</dt>
          <dd>{config.decisionQuestion}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>What you review</dt>
          <dd>{config.whatTagiaReviews}</dd>
        </div>
      </dl>
      <div className="fr-owner-sequential__review-gate-notes">
        <label className="fr-owner-sequential__review-gate-label" htmlFor="heavy-owner-notes">
          {config.ownerNotesLabel}
        </label>
        <textarea
          id="heavy-owner-notes"
          className="fr-owner-sequential__review-gate-textarea"
          rows={2}
          value={ownerNotes}
          disabled={busy}
          placeholder={config.ownerNotesPlaceholder}
          onChange={(event) => setOwnerNotes(event.target.value)}
        />
        <label className="fr-owner-sequential__review-gate-label" htmlFor="heavy-team-note">
          {config.teamNoteLabel}
        </label>
        <textarea
          id="heavy-team-note"
          className="fr-owner-sequential__review-gate-textarea"
          rows={3}
          value={teamNote}
          disabled={busy}
          placeholder={config.teamNotePlaceholder}
          onChange={(event) => setTeamNote(event.target.value)}
        />
      </div>
      <div className="fr-owner-console-actions">
        <button type="button" className="utility-btn utility-btn--primary" disabled={busy} onClick={() => onWait(ownerNotes)}>
          {config.waitLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={() => onBump(ownerNotes)}>
          {config.bumpLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={() => onAssign(teamNote, ownerNotes)}>
          {config.assignLabel}
        </button>
      </div>
    </article>
  );
}

export function ComplaintDecisionWorkingSurface({
  item,
  busy,
  onResolve,
  onEscalateRefund,
  onEscalateScope,
  onEscalateRevision,
  onDecline,
  onHold,
  onAskTeam,
  onAskClient,
  onAssign,
}: {
  item: OwnerConsoleSequentialItem;
  busy: boolean;
  onResolve: (clientReply: string, ownerNotes: string) => void;
  onEscalateRefund: (ownerNotes: string) => void;
  onEscalateScope: (ownerNotes: string) => void;
  onEscalateRevision: (ownerNotes: string) => void;
  onDecline: (clientReply: string, ownerNotes: string) => void;
  onHold: (note: string, ownerNotes: string) => void;
  onAskTeam: (note: string, ownerNotes: string) => void;
  onAskClient: (clientMessage: string, ownerNotes: string) => void;
  onAssign: (ownerNotes: string, note: string) => void;
}) {
  const [teamNote, setTeamNote] = useState("");
  const [ownerNotes, setOwnerNotes] = useState("");
  const [clientMessage, setClientMessage] = useState("");
  const config = ownerConsole.complaintDecision;

  useEffect(() => {
    setTeamNote("");
    setOwnerNotes("");
    setClientMessage("");
  }, [item.id]);

  return (
    <article className="fr-owner-sequential__working-surface">
      <CoordinatorFolderBrief item={item} />
      <header className="fr-owner-sequential__working-head">
        <p className="fr-owner-sequential__working-campaign">{item.campaignName}</p>
        <h3 className="fr-owner-sequential__working-title">{item.title}</h3>
        {item.deskItem?.detail ? (
          <p className="fr-owner-sequential__working-meta">{item.deskItem.detail}</p>
        ) : null}
      </header>
      <dl className="fr-owner-console-card__fields">
        <div className="fr-owner-console-card__field">
          <dt>What you decide</dt>
          <dd>{config.decisionQuestion}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>What you review</dt>
          <dd>{config.whatTagiaReviews}</dd>
        </div>
      </dl>
      <div className="fr-owner-sequential__review-gate-notes">
        <label className="fr-owner-sequential__review-gate-label" htmlFor="complaint-client-reply">
          {config.clientMessageLabel}
        </label>
        <textarea
          id="complaint-client-reply"
          className="fr-owner-sequential__review-gate-textarea"
          rows={3}
          value={clientMessage}
          disabled={busy}
          placeholder={config.clientMessagePlaceholder}
          onChange={(event) => setClientMessage(event.target.value)}
        />
        <label className="fr-owner-sequential__review-gate-label" htmlFor="complaint-owner-notes">
          {config.ownerNotesLabel}
        </label>
        <textarea
          id="complaint-owner-notes"
          className="fr-owner-sequential__review-gate-textarea"
          rows={2}
          value={ownerNotes}
          disabled={busy}
          placeholder={config.ownerNotesPlaceholder}
          onChange={(event) => setOwnerNotes(event.target.value)}
        />
        <label className="fr-owner-sequential__review-gate-label" htmlFor="complaint-team-note">
          {config.teamNoteLabel}
        </label>
        <textarea
          id="complaint-team-note"
          className="fr-owner-sequential__review-gate-textarea"
          rows={3}
          value={teamNote}
          disabled={busy}
          placeholder={config.teamNotePlaceholder}
          onChange={(event) => setTeamNote(event.target.value)}
        />
      </div>
      <div className="fr-owner-console-actions">
        <button type="button" className="utility-btn utility-btn--primary" disabled={busy} onClick={() => onResolve(clientMessage, ownerNotes)}>
          {config.resolveLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={() => onEscalateRefund(ownerNotes)}>
          {config.escalateRefundLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={() => onEscalateScope(ownerNotes)}>
          {config.escalateScopeLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={() => onEscalateRevision(ownerNotes)}>
          {config.escalateRevisionLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={() => onDecline(clientMessage, ownerNotes)}>
          {config.declineLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={() => onHold(teamNote, ownerNotes)}>
          {config.holdLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={() => onAskTeam(teamNote, ownerNotes)}>
          {config.askTeamLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={() => onAskClient(clientMessage, ownerNotes)}>
          {config.askClientLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={() => onAssign(ownerNotes, teamNote)}>
          {config.assignLabel}
        </button>
      </div>
    </article>
  );
}
