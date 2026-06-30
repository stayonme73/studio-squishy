"use client";

import { useState } from "react";

import { campaignTasksConfig } from "@/config/campaign-tasks";
import { ownerConsole } from "@/config/owner-console";
import type { OwnerConsoleReassignContext } from "@/lib/campaign-tasks/owner-console-campaign-view";
import type { TasksPatchBody } from "@/lib/campaign-tasks/actions";

import { emptyHandoffForm, type HandoffFormState } from "./FileRoomTaskHandoffPanel";

type FileRoomOwnerConsoleReassignPanelProps = {
  reassign: OwnerConsoleReassignContext;
  busy: boolean;
  onConfirm: (body: TasksPatchBody) => void;
  onCancel: () => void;
};

export default function FileRoomOwnerConsoleReassignPanel({
  reassign,
  busy,
  onConfirm,
  onCancel,
}: FileRoomOwnerConsoleReassignPanelProps) {
  const [form, setForm] = useState<HandoffFormState>(emptyHandoffForm());

  const selectedCandidate = reassign.candidates.find((entry) => entry.userId === form.toUserId);
  const roleOptions =
    selectedCandidate?.roles.filter((role) => reassign.reassignRoles.includes(role)) ??
    reassign.reassignRoles;

  const updateField = <K extends keyof HandoffFormState>(key: K, value: HandoffFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFlag = (key: keyof HandoffFormState["reassignmentFlags"]) => {
    setForm((prev) => ({
      ...prev,
      reassignmentFlags: {
        ...prev.reassignmentFlags,
        [key]: !prev.reassignmentFlags[key],
      },
    }));
  };

  const needsReason = Boolean(
    form.reassignmentFlags.changesPriority ||
      form.reassignmentFlags.changesDeadlineCommitment ||
      form.reassignmentFlags.changesClientFacingScope ||
      form.reassignmentFlags.createsMaterialRisk,
  );

  const canSubmit =
    form.toUserId.length > 0 &&
    form.toRole.length > 0 &&
    form.completedSummary.trim().length > 0 &&
    form.sourceContext.trim().length > 0 &&
    form.nextSteps.trim().length > 0 &&
    (!needsReason || form.reassignmentReason.trim().length > 0);

  const handleConfirm = () => {
    if (!canSubmit || !form.toRole) return;
    const handoff: {
      completedSummary: string;
      sourceContext: string;
      nextSteps: string;
      workVersionId?: string;
    } = {
      completedSummary: form.completedSummary.trim(),
      sourceContext: form.sourceContext.trim(),
      nextSteps: form.nextSteps.trim(),
    };
    if (reassign.workVersionId) {
      handoff.workVersionId = reassign.workVersionId;
    }
    onConfirm({
      action: "reassign",
      taskId: reassign.taskId,
      from: reassign.workflowState,
      claimVersion: reassign.claimVersion,
      toUserId: form.toUserId,
      toRole: form.toRole,
      handoff,
      reason: form.reassignmentReason.trim() || undefined,
      reassignmentFlags: form.reassignmentFlags,
    });
  };

  return (
    <div className="fr-tasks-handoff">
      <p className="fr-header__meta">{ownerConsole.reassignLead}</p>

      <section className="fr-tasks-handoff__context" aria-label={ownerConsole.reassignContextTitle}>
        <h4 className="fr-tasks-handoff__context-heading">{ownerConsole.reassignContextTitle}</h4>
        <ul className="fr-kv-list">
          <li className="fr-kv-list__row">
            <span className="fr-kv-list__label">Task</span>
            <p className="fr-kv-list__value">
              {reassign.taskTitle}
              <span className="fr-tasks-row__meta"> · {reassign.taskId}</span>
            </p>
          </li>
          <li className="fr-kv-list__row">
            <span className="fr-kv-list__label">{ownerConsole.reassignRequiredRoleLabel}</span>
            <p className="fr-kv-list__value">{reassign.requiredRoleLabel}</p>
          </li>
          <li className="fr-kv-list__row">
            <span className="fr-kv-list__label">{ownerConsole.reassignClaimantLabel}</span>
            <p className="fr-kv-list__value">
              {reassign.claimedByDisplayName ?? ownerConsole.reassignUnclaimedLabel}
            </p>
          </li>
          {reassign.reassignReason ? (
            <li className="fr-kv-list__row">
              <span className="fr-kv-list__label">{ownerConsole.reassignWhyLabel}</span>
              <p className="fr-kv-list__value">{reassign.reassignReason}</p>
            </li>
          ) : null}
        </ul>
      </section>

      <label className="fr-tasks-handoff__field">
        <span className="fr-tasks-row__meta">{campaignTasksConfig.reassignStaffLabel}</span>
        <select
          className="fr-tasks-handoff__select"
          value={form.toUserId}
          disabled={busy}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, toUserId: event.target.value, toRole: "" }))
          }
        >
          <option value="">Select staff…</option>
          {reassign.candidates.map((candidate) => (
            <option key={candidate.userId} value={candidate.userId}>
              {candidate.displayName}
            </option>
          ))}
        </select>
      </label>

      <label className="fr-tasks-handoff__field">
        <span className="fr-tasks-row__meta">{campaignTasksConfig.reassignRoleLabel}</span>
        <select
          className="fr-tasks-handoff__select"
          value={form.toRole}
          disabled={busy || !form.toUserId}
          onChange={(event) =>
            updateField("toRole", event.target.value as HandoffFormState["toRole"])
          }
        >
          <option value="">Select role…</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {campaignTasksConfig.productionRoleLabels[role]}
            </option>
          ))}
        </select>
      </label>

      <label className="fr-tasks-handoff__field">
        <span className="fr-tasks-row__meta">
          {campaignTasksConfig.handoffFieldLabels.completedSummary} *
        </span>
        <textarea
          className="fr-tasks-handoff__textarea"
          rows={3}
          disabled={busy}
          value={form.completedSummary}
          onChange={(event) => updateField("completedSummary", event.target.value)}
        />
      </label>

      <fieldset className="fr-tasks-handoff__flags">
        <legend className="fr-tasks-row__meta">Reassignment flags</legend>
        {(Object.keys(campaignTasksConfig.reassignRiskLabels) as (keyof HandoffFormState["reassignmentFlags"])[]).map(
          (key) => (
            <label key={key} className="fr-tasks-handoff__checkbox">
              <input
                type="checkbox"
                checked={Boolean(form.reassignmentFlags[key])}
                disabled={busy}
                onChange={() => toggleFlag(key)}
              />
              {campaignTasksConfig.reassignRiskLabels[key]}
            </label>
          ),
        )}
      </fieldset>

      {needsReason ? (
        <label className="fr-tasks-handoff__field">
          <span className="fr-tasks-row__meta">
            {campaignTasksConfig.handoffFieldLabels.reassignmentReason}
          </span>
          <textarea
            className="fr-tasks-handoff__textarea"
            rows={2}
            disabled={busy}
            value={form.reassignmentReason}
            onChange={(event) => updateField("reassignmentReason", event.target.value)}
          />
        </label>
      ) : null}

      <div className="fr-tasks-handoff__actions">
        <button
          type="button"
          className="utility-btn utility-btn--primary"
          disabled={busy || !canSubmit}
          onClick={handleConfirm}
        >
          {campaignTasksConfig.confirmReassignLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={onCancel}>
          {campaignTasksConfig.cancelLabel}
        </button>
      </div>
    </div>
  );
}
