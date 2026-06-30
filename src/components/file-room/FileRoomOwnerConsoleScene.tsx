"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import { fileRoom, FILE_ROOM_ROUTE } from "@/config/file-room";
import { ownerConsole } from "@/config/owner-console";
import type { TasksPatchBody } from "@/lib/campaign-tasks/actions";
import type {
  OwnerConsoleCampaignContext,
  OwnerConsoleDecisionCard,
  OwnerConsoleView,
} from "@/lib/campaign-tasks/owner-console-view";
import { contentKindForCategory } from "@/lib/materials/promotion";

import FileRoomExceptionAssignPanel, {
  emptyAssignExceptionForm,
  type AssignExceptionFormState,
} from "./FileRoomExceptionAssignPanel";
import FileRoomExceptionOwnerApprovalPanel, {
  emptyOwnerApprovalForm,
  type OwnerApprovalFormState,
} from "./FileRoomExceptionOwnerApprovalPanel";
import FileRoomExceptionResolvePanel, {
  emptyResolveExceptionForm,
  type ResolveExceptionFormState,
} from "./FileRoomExceptionResolvePanel";
import FileRoomOwnerDecisionCard from "./FileRoomOwnerDecisionCard";
import FileRoomSectionCard from "./FileRoomSectionCard";

type RowPanelMode = "assign" | "resolve" | "approve" | null;

type FileRoomOwnerConsoleSceneProps = {
  view: OwnerConsoleView;
  refreshedAt: string;
};

function campaignContextById(
  campaigns: readonly OwnerConsoleCampaignContext[],
): Record<string, OwnerConsoleCampaignContext> {
  return Object.fromEntries(campaigns.map((entry) => [entry.campaignId, entry]));
}

function confirmIrreversible(message: string): boolean {
  if (typeof window === "undefined") return true;
  return window.confirm(message);
}

export default function FileRoomOwnerConsoleScene({
  view,
  refreshedAt,
}: FileRoomOwnerConsoleSceneProps) {
  const router = useRouter();
  const contexts = useMemo(() => campaignContextById(view.campaigns), [view.campaigns]);

  const [selectedId, setSelectedId] = useState<string | null>(
    view.waitingOnOwner[0]?.id ?? null,
  );
  const [rowPanel, setRowPanel] = useState<RowPanelMode>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState<AssignExceptionFormState>(
    emptyAssignExceptionForm(),
  );
  const [resolveForm, setResolveForm] = useState<ResolveExceptionFormState>(
    emptyResolveExceptionForm(),
  );
  const [approvalForm, setApprovalForm] = useState<OwnerApprovalFormState | null>(null);

  const selectedCard: OwnerConsoleDecisionCard | null =
    view.waitingOnOwner.find((card) => card.id === selectedId) ?? null;

  const resetPanels = () => {
    setRowPanel(null);
    setAssignForm(emptyAssignExceptionForm());
    setResolveForm(emptyResolveExceptionForm());
    setApprovalForm(null);
  };

  const selectCard = (card: OwnerConsoleDecisionCard) => {
    setError(null);
    setSelectedId(card.id);
    resetPanels();
  };

  const patchException = async (campaignId: string, body: TasksPatchBody) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(
          json.error ?? `${campaignExceptionsConfig.updateFailedMessage} (${res.status})`,
        );
      }

      resetPanels();
      router.refresh();
    } catch (patchError) {
      setError(
        patchError instanceof Error
          ? patchError.message
          : campaignExceptionsConfig.updateFailedMessage,
      );
    } finally {
      setBusy(false);
    }
  };

  const openAssign = (card: OwnerConsoleDecisionCard) => {
    selectCard(card);
    setRowPanel("assign");
    setAssignForm(emptyAssignExceptionForm());
  };

  const openResolve = (card: OwnerConsoleDecisionCard) => {
    selectCard(card);
    setRowPanel("resolve");
    setResolveForm(emptyResolveExceptionForm());
  };

  const openApprove = (card: OwnerConsoleDecisionCard) => {
    selectCard(card);
    setRowPanel("approve");
    setApprovalForm(emptyOwnerApprovalForm(card.row.promotion.defaultWording));
  };

  const confirmAssign = (card: OwnerConsoleDecisionCard) => {
    if (!assignForm.assignToUserId) return;
    void patchException(card.campaignId, {
      action: "assign_exception",
      exceptionId: card.id,
      assignToUserId: assignForm.assignToUserId,
      notes: assignForm.notes.trim() || undefined,
    });
  };

  const confirmResolve = (card: OwnerConsoleDecisionCard) => {
    if (!confirmIrreversible(ownerConsole.confirmResolve)) return;
    void patchException(card.campaignId, {
      action: "resolve_exception",
      exceptionId: card.id,
      resolutionNotes: resolveForm.resolutionNotes.trim() || undefined,
    });
  };

  const confirmApprove = (card: OwnerConsoleDecisionCard, form: OwnerApprovalFormState) => {
    if (!confirmIrreversible(ownerConsole.confirmApprove)) return;
    void patchException(card.campaignId, {
      action: "approve_client_request",
      exceptionId: card.id,
      category: form.category,
      contentKind: contentKindForCategory(form.category),
      clientFacingLabel: form.clientFacingLabel.trim(),
      clientFacingPrompt: form.clientFacingPrompt.trim(),
      whyNeeded: form.whyNeeded.trim(),
      requirementLevel: "required",
    });
  };

  const confirmHold = (card: OwnerConsoleDecisionCard, form: OwnerApprovalFormState) => {
    void patchException(card.campaignId, {
      action: "assign_exception",
      exceptionId: card.id,
      assignToUserId: form.holdAssignToUserId.trim() || undefined,
      notes: form.holdInstruction.trim(),
    });
  };

  const confirmDecline = (card: OwnerConsoleDecisionCard, form: OwnerApprovalFormState) => {
    if (!confirmIrreversible(ownerConsole.confirmDecline)) return;
    void patchException(card.campaignId, {
      action: "decline_promotion",
      exceptionId: card.id,
      notes: form.declineReason.trim(),
    });
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
            {selectedCard ? (
              <>
                <FileRoomOwnerDecisionCard
                  card={selectedCard}
                  selected
                  onSelect={() => selectCard(selectedCard)}
                />

                {rowPanel === null ? (
                  <div className="fr-owner-console-actions">
                    {selectedCard.row.promotion.showApprovalPanel ? (
                      <button
                        type="button"
                        className="utility-btn utility-btn--primary"
                        disabled={busy}
                        onClick={() => openApprove(selectedCard)}
                      >
                        {campaignExceptionsConfig.promotionPanelTitle}
                      </button>
                    ) : null}
                    {selectedCard.row.permissions.canResolve ? (
                      <button
                        type="button"
                        className="utility-btn utility-btn--primary"
                        disabled={busy}
                        onClick={() => openResolve(selectedCard)}
                      >
                        {campaignExceptionsConfig.resolveLabel}
                      </button>
                    ) : null}
                    {selectedCard.row.permissions.canAssign ? (
                      <button
                        type="button"
                        className="utility-btn"
                        disabled={busy}
                        onClick={() => openAssign(selectedCard)}
                      >
                        {campaignExceptionsConfig.assignLabel}
                      </button>
                    ) : null}
                    <Link
                      className="utility-btn"
                      href={`${FILE_ROOM_ROUTE}/${selectedCard.campaignId}`}
                    >
                      Full File Room
                    </Link>
                  </div>
                ) : null}

                {rowPanel === "assign" && operatorContext ? (
                  <div className="fr-exception-row__panel">
                    <FileRoomExceptionAssignPanel
                      form={assignForm}
                      busy={busy}
                      operatorContext={operatorContext}
                      onChange={setAssignForm}
                      onConfirm={() => confirmAssign(selectedCard)}
                      onCancel={resetPanels}
                    />
                  </div>
                ) : null}

                {rowPanel === "resolve" ? (
                  <div className="fr-exception-row__panel">
                    <FileRoomExceptionResolvePanel
                      form={resolveForm}
                      busy={busy}
                      onChange={setResolveForm}
                      onConfirm={() => confirmResolve(selectedCard)}
                      onCancel={resetPanels}
                    />
                  </div>
                ) : null}

                {rowPanel === "approve" && approvalForm && operatorContext ? (
                  <div className="fr-exception-row__panel">
                    <FileRoomExceptionOwnerApprovalPanel
                      row={selectedCard.row}
                      form={approvalForm}
                      busy={busy}
                      operatorContext={operatorContext}
                      onChange={setApprovalForm}
                      onApprove={() => confirmApprove(selectedCard, approvalForm)}
                      onHold={() => confirmHold(selectedCard, approvalForm)}
                      onDecline={() => confirmDecline(selectedCard, approvalForm)}
                      onCancel={resetPanels}
                    />
                  </div>
                ) : null}
              </>
            ) : (
              <p className="fr-tasks-empty__body">{ownerConsole.selectedCardHint}</p>
            )}

            {error ? (
              <p className="fr-exceptions__error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      )}

      <p className="fr-owner-console-footer">
        <Link href={FILE_ROOM_ROUTE}>← {ownerConsole.allCampaignsLink}</Link>
        <span aria-hidden="true"> · </span>
        <span className="fr-header__meta">{fileRoom.listLead}</span>
      </p>
    </>
  );
}
