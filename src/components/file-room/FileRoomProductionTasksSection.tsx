"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { campaignTasksConfig, formatBlockedReasonDisplay } from "@/config/campaign-tasks";
import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import type { FileRoomTaskOperatorContext } from "@/lib/campaign-tasks/file-room-controls-types";
import type { FileRoomQaHistoryEntry } from "@/lib/campaign-tasks/file-room-controls";
import type { TasksPatchBody } from "@/lib/campaign-tasks/actions";
import type { FileRoomProductionTasksView, FileRoomTaskRow } from "@/lib/campaign-tasks/tasks-view";
import type { ProductionRole, QaRecord, TaskWorkflowState } from "@/lib/campaign-tasks/types";

import FileRoomSectionCard from "./FileRoomSectionCard";
import FileRoomQaPanel, { emptyQaForm, qaFormChecks, type QaFormState } from "./FileRoomQaPanel";
import FileRoomTaskHandoffPanel, {
  emptyHandoffForm,
  handoffFormToPayload,
  type HandoffFormState,
  type HandoffPanelMode,
} from "./FileRoomTaskHandoffPanel";

type FileRoomProductionTasksSectionProps = {
  campaignId: string;
  productionTasks: FileRoomProductionTasksView;
  operatorContext: FileRoomTaskOperatorContext;
  showExceptionBadges?: boolean;
};

function formatQaHistoryLine(entry: FileRoomQaHistoryEntry): string {
  const parts = [entry.actionLabel];
  if (entry.categoryLabel) parts.push(entry.categoryLabel);
  parts.push(`by ${entry.actorDisplayName}`);
  if (entry.notesPreview) parts.push(`· ${entry.notesPreview}`);
  return parts.join(" ");
}

function TaskRow({
  campaignId,
  task,
  canOperate,
  operatorContext,
  showExceptionBadges,
}: {
  campaignId: string;
  task: FileRoomTaskRow;
  canOperate: boolean;
  operatorContext: FileRoomTaskOperatorContext;
  showExceptionBadges: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<HandoffPanelMode | null>(null);
  const [qaPanelOpen, setQaPanelOpen] = useState(false);
  const [form, setForm] = useState<HandoffFormState>(emptyHandoffForm());
  const [qaForm, setQaForm] = useState<QaFormState>(() => emptyQaForm(task.phase));

  const [localWorkflow, setLocalWorkflow] = useState(task.workflowState);
  const [localStatusLabel, setLocalStatusLabel] = useState(task.statusLabel);
  const [localClaimVersion, setLocalClaimVersion] = useState(task.claimVersion);
  const [localClaimedBy, setLocalClaimedBy] = useState(task.claimedByDisplayName);
  const [localHandoffCount, setLocalHandoffCount] = useState(task.handoffHistoryCount);
  const [localHandoffSummary, setLocalHandoffSummary] = useState(task.latestHandoffSummary);
  const [localQaSummary, setLocalQaSummary] = useState(task.qaSummary);
  const [localQaHistory, setLocalQaHistory] = useState(task.qaHistory);
  const [localLatestQa, setLocalLatestQa] = useState(task.latestQaHistory);
  const [localBlockedReason, setLocalBlockedReason] = useState(task.blockedReason);

  useEffect(() => {
    setLocalWorkflow(task.workflowState);
    setLocalStatusLabel(task.statusLabel);
    setLocalClaimVersion(task.claimVersion);
    setLocalClaimedBy(task.claimedByDisplayName);
    setLocalHandoffCount(task.handoffHistoryCount);
    setLocalHandoffSummary(task.latestHandoffSummary);
    setLocalQaSummary(task.qaSummary);
    setLocalQaHistory(task.qaHistory);
    setLocalLatestQa(task.latestQaHistory);
    setLocalBlockedReason(task.blockedReason);
  }, [
    task.workflowState,
    task.statusLabel,
    task.claimVersion,
    task.claimedByDisplayName,
    task.handoffHistoryCount,
    task.latestHandoffSummary,
    task.qaSummary,
    task.qaHistory,
    task.latestQaHistory,
    task.blockedReason,
  ]);

  const familyCapableRoles = task.reassignRoles;

  const taskCandidates = useMemo(
    () =>
      operatorContext.reassignCandidates
        .map((candidate) => ({
          ...candidate,
          roles: candidate.roles.filter((role) => familyCapableRoles.includes(role)),
        }))
        .filter((candidate) => candidate.roles.length > 0),
    [operatorContext.reassignCandidates, familyCapableRoles],
  );

  const showHandoffControls =
    canOperate &&
    localWorkflow !== "ready_for_qa" &&
    (task.permissions.canClaim ||
      task.permissions.canRelease ||
      task.permissions.canSubmitHandoff ||
      task.permissions.canReassign);

  const showQaControls =
    canOperate &&
    localWorkflow === "ready_for_qa" &&
    (task.permissions.canQaPass || task.permissions.canQaFail || task.permissions.canQaBlock);

  const showQaHistory = localQaSummary.total > 0;

  const closeHandoffPanel = () => {
    setPanelMode(null);
    setForm(emptyHandoffForm());
  };

  const closeQaPanel = () => {
    setQaPanelOpen(false);
    setQaForm(emptyQaForm(task.phase));
  };

  const openHandoffPanel = (mode: HandoffPanelMode) => {
    setError(null);
    setQaPanelOpen(false);
    setPanelMode(mode);
    setForm(emptyHandoffForm());
  };

  const openQaPanel = () => {
    setError(null);
    closeHandoffPanel();
    setQaPanelOpen(true);
    setQaForm(emptyQaForm(task.phase));
  };

  const handleConflict = (message: string) => {
    setError(message || campaignTasksConfig.conflictMessage);
    closeHandoffPanel();
    closeQaPanel();
    router.refresh();
  };

  const applyQaRecordToLocal = (record: QaRecord) => {
    const entry: FileRoomQaHistoryEntry = {
      id: record.id,
      action: record.action,
      actionLabel: campaignTasksConfig.qaActionLabels[record.action],
      categoryLabel: record.category
        ? record.category in campaignTasksConfig.qaFailCategoryLabels
          ? campaignTasksConfig.qaFailCategoryLabels[
              record.category as keyof typeof campaignTasksConfig.qaFailCategoryLabels
            ]
          : record.category in campaignTasksConfig.qaBlockCategoryLabels
            ? campaignTasksConfig.qaBlockCategoryLabels[
                record.category as keyof typeof campaignTasksConfig.qaBlockCategoryLabels
              ]
            : record.category
        : null,
      actorDisplayName: record.actorDisplayName,
      createdAt: record.createdAt,
      notesPreview: record.notes?.trim() || record.missingFactDescription?.trim() || null,
    };
    setLocalQaHistory((prev) => [...prev, entry]);
    setLocalLatestQa(entry);
    setLocalQaSummary((prev) => ({
      total: prev.total + 1,
      passes: prev.passes + (record.action === "qa_pass" ? 1 : 0),
      fails: prev.fails + (record.action === "qa_fail" ? 1 : 0),
      blocks: prev.blocks + (record.action === "qa_block" ? 1 : 0),
    }));
  };

  const patchTask = async (body: TasksPatchBody) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        error?: string;
        tasks?: Array<{
          id: string;
          workflowState?: TaskWorkflowState;
          status?: string;
          claimedByDisplayName?: string;
          claimedAt?: string;
          claimVersion?: string | null;
          blockedReason?: string;
          workflowBlockedReason?: string;
        }>;
        handoffs?: Array<{ taskId: string; completedSummary: string }>;
        qaRecords?: QaRecord[];
      };

      if (res.status === 409) {
        handleConflict(json.error ?? campaignTasksConfig.conflictMessage);
        return;
      }

      if (!res.ok) {
        throw new Error(json.error ?? `${campaignTasksConfig.updateFailedMessage} (${res.status})`);
      }

      const updated = json.tasks?.find((entry) => entry.id === task.id);
      if (updated) {
        setLocalWorkflow(updated.workflowState ?? localWorkflow);
        if (updated.status) {
          setLocalStatusLabel(
            campaignTasksConfig.effectiveStatusLabels[
              updated.status as keyof typeof campaignTasksConfig.effectiveStatusLabels
            ] ?? updated.status,
          );
        }
        setLocalClaimVersion(updated.claimedAt ?? updated.claimVersion ?? null);
        setLocalClaimedBy(updated.claimedByDisplayName);
        const reason = updated.blockedReason ?? updated.workflowBlockedReason;
        if (reason !== undefined) {
          setLocalBlockedReason(formatBlockedReasonDisplay(reason));
        }
      }

      if (body.action === "qa_fail" && body.category === "production_correction") {
        const routed = json.tasks?.find((entry) => entry.id === task.id);
        if (routed && routed.workflowState === "needs_revision") {
          setLocalWorkflow("needs_revision");
          setLocalStatusLabel(campaignTasksConfig.effectiveStatusLabels.needs_revision);
        }
      }

      const taskHandoffs = (json.handoffs ?? []).filter((entry) => entry.taskId === task.id);
      if (taskHandoffs.length > 0) {
        setLocalHandoffCount(taskHandoffs.length);
        setLocalHandoffSummary(taskHandoffs[taskHandoffs.length - 1]?.completedSummary ?? null);
      }

      const newQaRecords = (json.qaRecords ?? []).filter(
        (entry) => entry.taskId === task.id || entry.routedTaskId === task.id,
      );
      if (newQaRecords.length > 0) {
        applyQaRecordToLocal(newQaRecords[newQaRecords.length - 1]!);
      }

      closeHandoffPanel();
      closeQaPanel();
      router.refresh();
    } catch (patchError) {
      setError(
        patchError instanceof Error ? patchError.message : campaignTasksConfig.updateFailedMessage,
      );
    } finally {
      setBusy(false);
    }
  };

  const claimTask = () =>
    void patchTask({
      action: "claim",
      taskId: task.id,
      from: localWorkflow === "needs_revision" ? "needs_revision" : "unstarted",
      claimVersion: localClaimVersion,
    });

  const confirmHandoffPanel = () => {
    const handoff = handoffFormToPayload(form);

    if (panelMode === "submit") {
      void patchTask({
        action: "submit_for_handoff",
        taskId: task.id,
        from: "in_progress",
        claimVersion: localClaimVersion,
        handoff,
      });
      return;
    }

    if (panelMode === "release") {
      void patchTask({
        action: "release_claim",
        taskId: task.id,
        from: "in_progress",
        claimVersion: localClaimVersion,
        handoff,
      });
      return;
    }

    if (panelMode === "reassign") {
      if (!form.toUserId || !form.toRole) {
        setError("Select staff and role for reassignment.");
        return;
      }
      void patchTask({
        action: "reassign",
        taskId: task.id,
        from: localWorkflow,
        claimVersion: localClaimVersion,
        toUserId: form.toUserId,
        toRole: form.toRole as ProductionRole,
        handoff,
        reason: form.reassignmentReason.trim() || undefined,
        reassignmentFlags: form.reassignmentFlags,
      });
    }
  };

  const confirmQaPass = () => {
    void patchTask({
      action: "qa_pass",
      taskId: task.id,
      from: "ready_for_qa",
      claimVersion: localClaimVersion,
      checks: qaFormChecks(qaForm, task.phase),
      notes: qaForm.notes.trim() || undefined,
    });
  };

  const confirmQaFail = () => {
    if (qaForm.category !== "production_correction" && qaForm.category !== "missing_client_fact") {
      setError("Select a fail category.");
      return;
    }
    if (qaForm.category === "production_correction" && !qaForm.requiredCorrection.trim()) {
      setError("Required correction is needed for production failures.");
      return;
    }
    if (
      qaForm.category === "missing_client_fact" &&
      (!qaForm.missingFactDescription.trim() || !qaForm.missingFactReason.trim())
    ) {
      setError("Missing client fact requires description and reason.");
      return;
    }
    void patchTask({
      action: "qa_fail",
      taskId: task.id,
      from: "ready_for_qa",
      claimVersion: localClaimVersion,
      category: qaForm.category,
      notes:
        qaForm.category === "production_correction"
          ? qaForm.requiredCorrection.trim()
          : qaForm.notes.trim() || undefined,
      missingFactDescription:
        qaForm.category === "missing_client_fact"
          ? qaForm.missingFactDescription.trim()
          : undefined,
      missingFactReason:
        qaForm.category === "missing_client_fact" ? qaForm.missingFactReason.trim() : undefined,
    });
  };

  const confirmQaBlock = () => {
    if (
      qaForm.category !== "compliance_concern" &&
      qaForm.category !== "direction_disagreement"
    ) {
      setError("Select a block category.");
      return;
    }
    void patchTask({
      action: "qa_block",
      taskId: task.id,
      from: "ready_for_qa",
      claimVersion: localClaimVersion,
      category: qaForm.category,
      notes: qaForm.notes.trim() || undefined,
    });
  };

  return (
    <li className={`fr-tasks-row fr-tasks-row--${task.status}`}>
      <div className="fr-tasks-row__head">
        <span className="fr-tasks-row__title">{task.title}</span>
        <span
          className={`fr-tasks-row__status${task.status === "blocked" ? " fr-tasks-row__status--blocked" : ""}`}
        >
          {localStatusLabel}
        </span>
      </div>
      <p className="fr-tasks-row__meta">
        {task.phaseLabel}
        {task.cycleLabel ? ` · ${task.cycleLabel}` : ""}
        {task.dependsOnCount > 0 ? ` · ${task.dependsOnCount} dependency` : ""}
      </p>
      {localClaimedBy ? (
        <p className="fr-tasks-row__meta">
          {campaignTasksConfig.claimedByLabel} {localClaimedBy}
        </p>
      ) : null}
      {localHandoffCount > 0 ? (
        <p className="fr-tasks-row__meta">
          {campaignTasksConfig.handoffHistoryLabel}: {localHandoffCount}
          {localHandoffSummary ? ` · ${localHandoffSummary}` : ""}
        </p>
      ) : null}
      {showQaHistory ? (
        <div className="fr-qa-history" aria-label={campaignTasksConfig.qaHistoryLabel}>
          <p className="fr-tasks-row__meta">
            {campaignTasksConfig.qaHistoryLabel}: {localQaSummary.total}
            {localLatestQa ? ` · ${formatQaHistoryLine(localLatestQa)}` : ""}
          </p>
          {localQaHistory.length > 1 ? (
            <ul className="fr-qa-history__list">
              {localQaHistory.map((entry) => (
                <li key={entry.id} className="fr-qa-history__item">
                  {formatQaHistoryLine(entry)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {localBlockedReason ? (
        <p className="fr-tasks-row__block-reason">{localBlockedReason}</p>
      ) : null}

      {showExceptionBadges && task.openExceptionCount > 0 ? (
        <p className="fr-tasks-row__meta">
          <a className="fr-tasks-row__exception-badge" href="#file-room-exceptions">
            {campaignExceptionsConfig.openExceptionBadge(task.openExceptionCount)}
          </a>
        </p>
      ) : null}

      {showHandoffControls ? (
        <div className="fr-tasks-controls">
          <div className="fr-tasks-controls__actions">
            {task.permissions.canClaim ? (
              <button
                type="button"
                className="utility-btn utility-btn--primary"
                disabled={busy || panelMode !== null}
                onClick={() => void claimTask()}
              >
                {campaignTasksConfig.claimLabel}
              </button>
            ) : null}
            {task.permissions.canSubmitHandoff ? (
              <button
                type="button"
                className="utility-btn utility-btn--primary"
                disabled={busy || panelMode !== null}
                onClick={() => openHandoffPanel("submit")}
              >
                {campaignTasksConfig.submitHandoffLabel}
              </button>
            ) : null}
            {task.permissions.canRelease ? (
              <button
                type="button"
                className="utility-btn"
                disabled={busy || panelMode !== null}
                onClick={() => openHandoffPanel("release")}
              >
                {campaignTasksConfig.releaseLabel}
              </button>
            ) : null}
            {task.permissions.canReassign ? (
              <button
                type="button"
                className="utility-btn"
                disabled={busy || panelMode !== null}
                onClick={() => openHandoffPanel("reassign")}
              >
                {campaignTasksConfig.reassignLabel}
              </button>
            ) : null}
          </div>

          {panelMode ? (
            <FileRoomTaskHandoffPanel
              mode={panelMode}
              form={form}
              busy={busy}
              reassignCandidates={taskCandidates}
              familyCapableRoles={familyCapableRoles}
              onChange={setForm}
              onConfirm={confirmHandoffPanel}
              onCancel={closeHandoffPanel}
            />
          ) : null}
        </div>
      ) : null}

      {showQaControls ? (
        <div className="fr-tasks-controls fr-tasks-controls--qa">
          <div className="fr-tasks-controls__actions">
            <button
              type="button"
              className="utility-btn utility-btn--primary"
              disabled={busy || qaPanelOpen}
              onClick={openQaPanel}
            >
              {campaignTasksConfig.qaReviewLabel}
            </button>
          </div>

          {qaPanelOpen ? (
            <FileRoomQaPanel
              phase={task.phase}
              form={qaForm}
              busy={busy}
              canPass={task.permissions.canQaPass}
              canFail={task.permissions.canQaFail}
              canBlock={task.permissions.canQaBlock}
              onChange={setQaForm}
              onPass={confirmQaPass}
              onFail={confirmQaFail}
              onBlock={confirmQaBlock}
              onCancel={closeQaPanel}
            />
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="fr-tasks-row__meta" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export default function FileRoomProductionTasksSection({
  campaignId,
  productionTasks,
  operatorContext,
  showExceptionBadges = true,
}: FileRoomProductionTasksSectionProps) {
  if (productionTasks.isEmpty) {
    return (
      <FileRoomSectionCard title={campaignTasksConfig.sectionTitle}>
        <p className="fr-tasks-empty__title">{campaignTasksConfig.emptyTitle}</p>
        <p className="fr-tasks-empty__body">{campaignTasksConfig.emptyBody}</p>
      </FileRoomSectionCard>
    );
  }

  return (
    <FileRoomSectionCard title={campaignTasksConfig.sectionTitle}>
      <p className="fr-tasks-lead">{campaignTasksConfig.sectionLead}</p>

      <ul className="fr-tasks-summary" aria-label="Task status summary">
        <li>
          <span className="fr-tasks-summary__label">Ready</span>
          <span className="fr-tasks-summary__value">{productionTasks.readyCount}</span>
        </li>
        <li>
          <span className="fr-tasks-summary__label">Blocked</span>
          <span className="fr-tasks-summary__value">{productionTasks.blockedCount}</span>
        </li>
        <li>
          <span className="fr-tasks-summary__label">Not ready</span>
          <span className="fr-tasks-summary__value">{productionTasks.notReadyCount}</span>
        </li>
      </ul>

      {productionTasks.groups.map((group) => (
        <div key={`${group.familyId}-${group.serviceName}`} className="fr-scope-group">
          <p className="fr-scope-group__name">
            {group.serviceName}
            <span className="fr-tasks-family-label"> · {group.familyLabel}</span>
          </p>
          <ul className="fr-tasks-list">
            {group.tasks.map((task) => (
              <TaskRow
                key={task.id}
                campaignId={campaignId}
                task={task}
                canOperate={operatorContext.canOperate}
                operatorContext={operatorContext}
                showExceptionBadges={showExceptionBadges}
              />
            ))}
          </ul>
        </div>
      ))}
    </FileRoomSectionCard>
  );
}
