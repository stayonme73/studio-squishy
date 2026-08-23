"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import { contentKindForCategory } from "@/lib/materials/promotion";
import type { TasksPatchBody } from "@/lib/campaign-tasks/patch-types";
import type { CampaignExceptionStatus } from "@/lib/campaign-tasks/exceptions-types";
import type {
  ExceptionFilter,
  FileRoomExceptionOperatorContext,
  FileRoomExceptionsView,
} from "@/lib/campaign-tasks/exceptions-view";
import type { FileRoomTaskRow } from "@/lib/campaign-tasks/tasks-view";

import FileRoomExceptionAssignPanel, {
  emptyAssignExceptionForm,
  type AssignExceptionFormState,
} from "./FileRoomExceptionAssignPanel";
import FileRoomExceptionOwnerApprovalPanel, {
  emptyOwnerApprovalForm,
  type OwnerApprovalFormState,
} from "./FileRoomExceptionOwnerApprovalPanel";
import FileRoomExceptionRowComponent from "./FileRoomExceptionRow";
import FileRoomExceptionRaisePanel, {
  emptyRaiseExceptionForm,
  type RaiseExceptionFormState,
} from "./FileRoomExceptionRaisePanel";
import FileRoomExceptionResolvePanel, {
  emptyResolveExceptionForm,
  type ResolveExceptionFormState,
} from "./FileRoomExceptionResolvePanel";
import FileRoomSectionCard from "./FileRoomSectionCard";

type RowPanelMode = "assign" | "resolve" | "approve" | null;

function isOpenExceptionRowStatus(status: CampaignExceptionStatus): boolean {
  return status !== "resolved" && status !== "cancelled";
}

type FileRoomExceptionsSectionProps = {
  campaignId: string;
  exceptions: FileRoomExceptionsView;
  tasks: readonly FileRoomTaskRow[];
  operatorContext: FileRoomExceptionOperatorContext;
};

export default function FileRoomExceptionsSection({
  campaignId,
  exceptions: initialExceptions,
  tasks,
  operatorContext,
}: FileRoomExceptionsSectionProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<ExceptionFilter>(initialExceptions.filter);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseForm, setRaiseForm] = useState<RaiseExceptionFormState>(emptyRaiseExceptionForm);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [rowPanel, setRowPanel] = useState<RowPanelMode>(null);
  const [assignForm, setAssignForm] = useState<AssignExceptionFormState>(emptyAssignExceptionForm);
  const [resolveForm, setResolveForm] = useState<ResolveExceptionFormState>(
    emptyResolveExceptionForm,
  );
  const [approvalForm, setApprovalForm] = useState<OwnerApprovalFormState | null>(null);
  const [detailsExpandedById, setDetailsExpandedById] = useState<Record<string, boolean>>({});

  const displayRows =
    filter === "open"
      ? initialExceptions.rows.filter((row) => isOpenExceptionRowStatus(row.status))
      : initialExceptions.rows.filter((row) => !isOpenExceptionRowStatus(row.status));

  const resetRowPanels = () => {
    setActiveRowId(null);
    setRowPanel(null);
    setAssignForm(emptyAssignExceptionForm());
    setResolveForm(emptyResolveExceptionForm());
    setApprovalForm(null);
  };

  const patchException = async (body: TasksPatchBody) => {
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
        throw new Error(json.error ?? `${campaignExceptionsConfig.updateFailedMessage} (${res.status})`);
      }

      setRaiseOpen(false);
      setRaiseForm(emptyRaiseExceptionForm());
      resetRowPanels();
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

  const confirmRaise = () => {
    if (!raiseForm.kind || !raiseForm.title.trim()) return;
    void patchException({
      action: "raise_exception",
      kind: raiseForm.kind,
      title: raiseForm.title.trim(),
      description: raiseForm.description.trim() || undefined,
      taskId: raiseForm.taskId || undefined,
    });
  };

  const confirmAssign = (exceptionId: string) => {
    if (!assignForm.assignToUserId) return;
    void patchException({
      action: "assign_exception",
      exceptionId,
      assignToUserId: assignForm.assignToUserId,
      notes: assignForm.notes.trim() || undefined,
    });
  };

  const confirmResolve = (exceptionId: string) => {
    void patchException({
      action: "resolve_exception",
      exceptionId,
      resolutionNotes: resolveForm.resolutionNotes.trim() || undefined,
    });
  };

  const confirmApprove = (exceptionId: string, form: OwnerApprovalFormState) => {
    void patchException({
      action: "approve_client_request",
      exceptionId,
      category: form.category,
      contentKind: contentKindForCategory(form.category),
      clientFacingLabel: form.clientFacingLabel.trim(),
      clientFacingPrompt: form.clientFacingPrompt.trim(),
      whyNeeded: form.whyNeeded.trim(),
      requirementLevel: "required",
    });
  };

  const confirmHold = (exceptionId: string, form: OwnerApprovalFormState) => {
    void patchException({
      action: "assign_exception",
      exceptionId,
      assignToUserId: form.holdAssignToUserId.trim() || undefined,
      notes: form.holdInstruction.trim(),
    });
  };

  const confirmDecline = (exceptionId: string, form: OwnerApprovalFormState) => {
    void patchException({
      action: "decline_promotion",
      exceptionId,
      notes: form.declineReason.trim(),
    });
  };

  const openAssign = (exceptionId: string) => {
    setError(null);
    setRaiseOpen(false);
    setActiveRowId(exceptionId);
    setRowPanel("assign");
    setAssignForm(emptyAssignExceptionForm());
    setApprovalForm(null);
  };

  const openResolve = (exceptionId: string) => {
    setError(null);
    setRaiseOpen(false);
    setActiveRowId(exceptionId);
    setRowPanel("resolve");
    setResolveForm(emptyResolveExceptionForm());
    setApprovalForm(null);
  };

  const openApprove = (row: (typeof displayRows)[number]) => {
    setError(null);
    setRaiseOpen(false);
    setActiveRowId(row.id);
    setRowPanel("approve");
    setApprovalForm(emptyOwnerApprovalForm(row.promotion.defaultWording));
  };

  const closeRowPanel = () => {
    resetRowPanels();
  };

  const toggleDetails = (exceptionId: string) => {
    setDetailsExpandedById((current) => ({
      ...current,
      [exceptionId]: !current[exceptionId],
    }));
  };

  const emptyTitle =
    filter === "open"
      ? campaignExceptionsConfig.emptyOpenTitle
      : campaignExceptionsConfig.emptyResolvedTitle;
  const emptyBody =
    filter === "open"
      ? campaignExceptionsConfig.emptyOpenBody
      : campaignExceptionsConfig.emptyResolvedBody;

  return (
    <FileRoomSectionCard title={campaignExceptionsConfig.sectionTitle}>
      <section id="file-room-exceptions" className="fr-exceptions" aria-label="Campaign exceptions">
        <p className="fr-exceptions__lead">{campaignExceptionsConfig.sectionLead}</p>

        <div className="fr-exceptions__toolbar">
          <div className="fr-exceptions__filters" role="tablist" aria-label="Exception filters">
            <button
              type="button"
              role="tab"
              aria-selected={filter === "open"}
              className={`fr-exceptions__filter${filter === "open" ? " fr-exceptions__filter--active" : ""}`}
              onClick={() => setFilter("open")}
            >
              {campaignExceptionsConfig.filterOpenLabel} ({initialExceptions.openCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === "resolved"}
              className={`fr-exceptions__filter${filter === "resolved" ? " fr-exceptions__filter--active" : ""}`}
              onClick={() => setFilter("resolved")}
            >
              {campaignExceptionsConfig.filterResolvedLabel} ({initialExceptions.resolvedCount})
            </button>
          </div>

          {operatorContext.canRaise ? (
            <button
              type="button"
              className="utility-btn utility-btn--primary"
              disabled={busy || raiseOpen}
              onClick={() => {
                setError(null);
                closeRowPanel();
                setRaiseOpen(true);
                setRaiseForm(emptyRaiseExceptionForm());
              }}
            >
              {campaignExceptionsConfig.raiseLabel}
            </button>
          ) : null}
        </div>

        {raiseOpen ? (
          <FileRoomExceptionRaisePanel
            form={raiseForm}
            busy={busy}
            raiseableKinds={operatorContext.raiseableKinds}
            tasks={tasks}
            onChange={setRaiseForm}
            onConfirm={confirmRaise}
            onCancel={() => {
              setRaiseOpen(false);
              setRaiseForm(emptyRaiseExceptionForm());
            }}
          />
        ) : null}

        {displayRows.length === 0 ? (
          <div className="fr-exceptions__empty">
            <p className="fr-exceptions__empty-title">{emptyTitle}</p>
            <p className="fr-exceptions__empty-body">{emptyBody}</p>
          </div>
        ) : (
          <ul className="fr-exceptions__list">
            {displayRows.map((row) => (
              <FileRoomExceptionRowComponent
                key={row.id}
                row={row}
                busy={busy}
                activePanel={activeRowId === row.id ? rowPanel : null}
                isActiveRow={activeRowId === row.id}
                detailsExpanded={Boolean(detailsExpandedById[row.id])}
                onToggleDetails={() => toggleDetails(row.id)}
                onOpenAssign={() => openAssign(row.id)}
                onOpenResolve={() => openResolve(row.id)}
                onOpenApprove={() => openApprove(row)}
                onClosePanel={closeRowPanel}
                assignPanel={
                  <FileRoomExceptionAssignPanel
                    form={assignForm}
                    busy={busy}
                    operatorContext={operatorContext}
                    onChange={setAssignForm}
                    onConfirm={() => confirmAssign(row.id)}
                    onCancel={closeRowPanel}
                  />
                }
                resolvePanel={
                  <FileRoomExceptionResolvePanel
                    form={resolveForm}
                    busy={busy}
                    onChange={setResolveForm}
                    onConfirm={() => confirmResolve(row.id)}
                    onCancel={closeRowPanel}
                  />
                }
                approvalPanel={
                  approvalForm ? (
                    <FileRoomExceptionOwnerApprovalPanel
                      row={row}
                      form={approvalForm}
                      busy={busy}
                      operatorContext={operatorContext}
                      onChange={setApprovalForm}
                      onApprove={() => confirmApprove(row.id, approvalForm)}
                      onHold={() => confirmHold(row.id, approvalForm)}
                      onDecline={() => confirmDecline(row.id, approvalForm)}
                      onCancel={closeRowPanel}
                    />
                  ) : null
                }
              />
            ))}
          </ul>
        )}

        {error ? (
          <p className="fr-exceptions__error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </FileRoomSectionCard>
  );
}
