"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { campaignTasksConfig } from "@/config/campaign-tasks";
import type { FileRoomTaskOperatorContext } from "@/lib/campaign-tasks/file-room-controls-types";
import type { TasksPatchBody } from "@/lib/campaign-tasks/actions";
import type { FileRoomProductionTasksView, FileRoomTaskRow } from "@/lib/campaign-tasks/tasks-view";
import type { ProductionRole, TaskWorkflowState } from "@/lib/campaign-tasks/types";

import FileRoomSectionCard from "./FileRoomSectionCard";
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
};

function TaskRow({
  campaignId,
  task,
  canOperate,
  operatorContext,
}: {
  campaignId: string;
  task: FileRoomTaskRow;
  canOperate: boolean;
  operatorContext: FileRoomTaskOperatorContext;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<HandoffPanelMode | null>(null);
  const [form, setForm] = useState<HandoffFormState>(emptyHandoffForm());

  const [localWorkflow, setLocalWorkflow] = useState(task.workflowState);
  const [localStatusLabel, setLocalStatusLabel] = useState(task.statusLabel);
  const [localClaimVersion, setLocalClaimVersion] = useState(task.claimVersion);
  const [localClaimedBy, setLocalClaimedBy] = useState(task.claimedByDisplayName);
  const [localHandoffCount, setLocalHandoffCount] = useState(task.handoffHistoryCount);
  const [localHandoffSummary, setLocalHandoffSummary] = useState(task.latestHandoffSummary);

  useEffect(() => {
    setLocalWorkflow(task.workflowState);
    setLocalStatusLabel(task.statusLabel);
    setLocalClaimVersion(task.claimVersion);
    setLocalClaimedBy(task.claimedByDisplayName);
    setLocalHandoffCount(task.handoffHistoryCount);
    setLocalHandoffSummary(task.latestHandoffSummary);
  }, [
    task.workflowState,
    task.statusLabel,
    task.claimVersion,
    task.claimedByDisplayName,
    task.handoffHistoryCount,
    task.latestHandoffSummary,
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

  const showControls = canOperate && (
    task.permissions.canClaim ||
    task.permissions.canRelease ||
    task.permissions.canSubmitHandoff ||
    task.permissions.canReassign
  );

  const closePanel = () => {
    setPanelMode(null);
    setForm(emptyHandoffForm());
  };

  const openPanel = (mode: HandoffPanelMode) => {
    setError(null);
    setPanelMode(mode);
    setForm(emptyHandoffForm());
  };

  const handleConflict = (message: string) => {
    setError(message || campaignTasksConfig.conflictMessage);
    closePanel();
    router.refresh();
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
        }>;
        handoffs?: Array<{ taskId: string; completedSummary: string }>;
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
        setLocalClaimVersion(updated.claimedAt ?? updated.claimVersion ?? null);
        setLocalClaimedBy(updated.claimedByDisplayName);
      }

      const taskHandoffs = (json.handoffs ?? []).filter((entry) => entry.taskId === task.id);
      if (taskHandoffs.length > 0) {
        setLocalHandoffCount(taskHandoffs.length);
        setLocalHandoffSummary(taskHandoffs[taskHandoffs.length - 1]?.completedSummary ?? null);
      }

      closePanel();
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

  const confirmPanel = () => {
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
      {task.blockedReason ? (
        <p className="fr-tasks-row__block-reason">{task.blockedReason}</p>
      ) : null}

      {showControls ? (
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
                onClick={() => openPanel("submit")}
              >
                {campaignTasksConfig.submitHandoffLabel}
              </button>
            ) : null}
            {task.permissions.canRelease ? (
              <button
                type="button"
                className="utility-btn"
                disabled={busy || panelMode !== null}
                onClick={() => openPanel("release")}
              >
                {campaignTasksConfig.releaseLabel}
              </button>
            ) : null}
            {task.permissions.canReassign ? (
              <button
                type="button"
                className="utility-btn"
                disabled={busy || panelMode !== null}
                onClick={() => openPanel("reassign")}
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
              onConfirm={confirmPanel}
              onCancel={closePanel}
            />
          ) : null}

          {error ? (
            <p className="fr-tasks-row__meta" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default function FileRoomProductionTasksSection({
  campaignId,
  productionTasks,
  operatorContext,
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
              />
            ))}
          </ul>
        </div>
      ))}
    </FileRoomSectionCard>
  );
}
