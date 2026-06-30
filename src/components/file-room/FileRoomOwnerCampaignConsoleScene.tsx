"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { fileRoom, FILE_ROOM_ROUTE } from "@/config/file-room";
import { ownerConsole, OWNER_CONSOLE_ROUTE, ownerConsoleCampaignRoute } from "@/config/owner-console";
import type { OwnerConsoleCampaignDetailView } from "@/lib/campaign-tasks/owner-console-campaign-view";
import type { OwnerConsoleDecisionCard } from "@/lib/campaign-tasks/owner-console-view";

import {
  FileRoomOwnerConsoleActionBar,
  FileRoomOwnerConsoleContextRail,
  FileRoomOwnerConsoleDecisionDetail,
  FileRoomOwnerConsoleDecisionPanels,
} from "./FileRoomOwnerConsolePanels";
import FileRoomOwnerDecisionCard from "./FileRoomOwnerDecisionCard";
import FileRoomSectionCard from "./FileRoomSectionCard";
import { useOwnerConsoleActions } from "./useOwnerConsoleActions";

type FileRoomOwnerCampaignConsoleSceneProps = {
  view: OwnerConsoleCampaignDetailView;
  refreshedAt: string;
};

export default function FileRoomOwnerCampaignConsoleScene({
  view,
  refreshedAt,
}: FileRoomOwnerCampaignConsoleSceneProps) {
  const router = useRouter();
  const actions = useOwnerConsoleActions();
  const [selectedId, setSelectedId] = useState<string | null>(view.selectedItemId);

  const selectedCard: OwnerConsoleDecisionCard | null =
    view.waitingOnOwner.find((card) => card.id === selectedId) ??
    view.selectedCard ??
    null;

  const selectCard = (card: OwnerConsoleDecisionCard) => {
    actions.setError(null);
    setSelectedId(card.id);
    actions.resetPanels();
    router.replace(ownerConsoleCampaignRoute(view.campaignId, card.id), { scroll: false });
  };

  const refreshedLabel = new Date(refreshedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <>
      <Link className="fr-back-link" href={OWNER_CONSOLE_ROUTE}>
        ← {ownerConsole.backToStudioQueue}
      </Link>

      <header className="fr-owner-console-header">
        <div>
          <h2 className="fr-owner-console-header__title">{view.campaignName}</h2>
          <p className="fr-header__meta">
            {view.businessLabel} · {ownerConsole.campaignDrillDownLead}
          </p>
        </div>
        <p className="fr-header__meta">
          {view.waitingOnOwner.length} waiting · {ownerConsole.refreshedLabel} {refreshedLabel}
        </p>
      </header>

      {view.waitingOnOwner.length === 0 ? (
        <FileRoomSectionCard title={ownerConsole.waitingSectionTitle}>
          <div className="fr-exceptions__empty">
            <p className="fr-exceptions__empty-title">{ownerConsole.waitingEmptyTitle}</p>
            <p className="fr-exceptions__empty-body">{ownerConsole.waitingEmptyBody}</p>
          </div>
        </FileRoomSectionCard>
      ) : (
        <div className="fr-owner-console-grid fr-owner-console-grid--campaign">
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
            {selectedCard ? (
              <>
                <FileRoomOwnerConsoleDecisionDetail selectedCard={selectedCard} />

                {actions.rowPanel === null ? (
                  <FileRoomOwnerConsoleActionBar
                    selectedCard={selectedCard}
                    busy={actions.busy}
                    fileRoomHref={view.fileRoomHref}
                    onOpenApprove={() => actions.openApprove(selectedCard)}
                    onOpenResolve={actions.openResolve}
                    onOpenAssign={actions.openAssign}
                  />
                ) : null}

                <FileRoomOwnerConsoleDecisionPanels
                  selectedCard={selectedCard}
                  rowPanel={actions.rowPanel}
                  busy={actions.busy}
                  operatorContext={view.operatorContext}
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
                  onReassign={(body) => void actions.patchTasks(view.campaignId, body)}
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

          <div className="fr-owner-console-grid__context">
            <FileRoomOwnerConsoleContextRail
              linkedTask={view.linkedTask}
              linkedServiceName={view.linkedServiceName}
              linkedMaterials={view.linkedMaterials}
              qaHistory={view.qaHistory}
              productionSummary={view.productionSummary}
              officeLinks={view.officeLinks}
              fileRoomHref={view.fileRoomHref}
            />
          </div>
        </div>
      )}

      <p className="fr-owner-console-footer">
        <Link href={OWNER_CONSOLE_ROUTE}>← {ownerConsole.backToStudioQueue}</Link>
        <span aria-hidden="true"> · </span>
        <Link href={FILE_ROOM_ROUTE}>{ownerConsole.allCampaignsLink}</Link>
        <span aria-hidden="true"> · </span>
        <span className="fr-header__meta">{fileRoom.listLead}</span>
      </p>
    </>
  );
}
