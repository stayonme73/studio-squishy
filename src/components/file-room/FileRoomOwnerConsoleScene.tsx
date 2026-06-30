"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { fileRoom, FILE_ROOM_ROUTE } from "@/config/file-room";
import { ownerConsole, ownerConsoleCampaignRoute } from "@/config/owner-console";
import type { OwnerConsoleScanView } from "@/lib/campaign-tasks/owner-console-scan-view";
import type {
  OwnerConsoleCampaignContext,
  OwnerConsoleDecisionCard,
  OwnerConsoleView,
} from "@/lib/campaign-tasks/owner-console-view";

import {
  FileRoomOwnerConsoleActionBar,
  FileRoomOwnerConsoleDecisionDetail,
  FileRoomOwnerConsoleDecisionPanels,
} from "./FileRoomOwnerConsolePanels";
import FileRoomOwnerConsoleScanSection from "./FileRoomOwnerConsoleScanSection";
import FileRoomOwnerDecisionCard from "./FileRoomOwnerDecisionCard";
import FileRoomSectionCard from "./FileRoomSectionCard";
import { useOwnerConsoleActions } from "./useOwnerConsoleActions";

type FileRoomOwnerConsoleSceneProps = {
  view: OwnerConsoleView;
  scan: OwnerConsoleScanView;
  refreshedAt: string;
};

function campaignContextById(
  campaigns: readonly OwnerConsoleCampaignContext[],
): Record<string, OwnerConsoleCampaignContext> {
  return Object.fromEntries(campaigns.map((entry) => [entry.campaignId, entry]));
}

export default function FileRoomOwnerConsoleScene({
  view,
  scan,
  refreshedAt,
}: FileRoomOwnerConsoleSceneProps) {
  const contexts = useMemo(() => campaignContextById(view.campaigns), [view.campaigns]);
  const actions = useOwnerConsoleActions();

  const [selectedId, setSelectedId] = useState<string | null>(
    view.waitingOnOwner[0]?.id ?? null,
  );

  const selectedCard: OwnerConsoleDecisionCard | null =
    view.waitingOnOwner.find((card) => card.id === selectedId) ?? null;

  const selectCard = (card: OwnerConsoleDecisionCard) => {
    actions.setError(null);
    setSelectedId(card.id);
    actions.resetPanels();
  };

  const operatorContext = selectedCard
    ? contexts[selectedCard.campaignId]?.operatorContext
    : undefined;

  const refreshedLabel = new Date(refreshedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <>
      <header className="fr-owner-console-header">
        <div>
          <h2 className="fr-owner-console-header__title">{ownerConsole.pageTitle}</h2>
          <p className="fr-header__meta">{ownerConsole.pageLead}</p>
        </div>
        <p className="fr-header__meta">
          {view.waitingCount} waiting · {view.campaignCount} campaign
          {view.campaignCount === 1 ? "" : "s"} · {ownerConsole.refreshedLabel} {refreshedLabel}
        </p>
      </header>

      {view.isEmpty ? (
        <FileRoomSectionCard title={ownerConsole.waitingSectionTitle}>
          <div className="fr-exceptions__empty">
            <p className="fr-exceptions__empty-title">{ownerConsole.waitingEmptyTitle}</p>
            <p className="fr-exceptions__empty-body">{ownerConsole.waitingEmptyBody}</p>
            <Link className="fr-back-link" href={FILE_ROOM_ROUTE}>
              ← {ownerConsole.allCampaignsLink}
            </Link>
          </div>
        </FileRoomSectionCard>
      ) : (
        <div className="fr-owner-console-grid">
          <div className="fr-owner-console-grid__queue">
            <FileRoomSectionCard title={ownerConsole.waitingSectionTitle}>
              <ul className="fr-owner-console-queue" aria-label="Waiting on Owner">
                {view.waitingOnOwner.map((card) => (
                  <li key={card.id}>
                    <FileRoomOwnerDecisionCard
                      card={card}
                      selected={card.id === selectedId}
                      compact
                      onSelect={() => selectCard(card)}
                    />
                  </li>
                ))}
              </ul>
            </FileRoomSectionCard>
          </div>

          <div className="fr-owner-console-grid__detail">
            {selectedCard && operatorContext ? (
              <>
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
              <p className="fr-tasks-empty__body">{ownerConsole.selectedCardHint}</p>
            )}

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
        </div>
      )}

      <FileRoomOwnerConsoleScanSection scan={scan} />

      <p className="fr-owner-console-footer">
        <Link href={FILE_ROOM_ROUTE}>← {ownerConsole.allCampaignsLink}</Link>
        <span aria-hidden="true"> · </span>
        <span className="fr-header__meta">{fileRoom.listLead}</span>
      </p>
    </>
  );
}
