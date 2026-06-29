"use client";

import { campaignTasksConfig } from "@/config/campaign-tasks";
import type { HandoffPayload, ProductionRole, ReassignmentFlags } from "@/lib/campaign-tasks/types";
import type { ReassignCandidate } from "@/lib/campaign-tasks/file-room-controls-types";

export type HandoffPanelMode = "submit" | "release" | "reassign";

export type HandoffFormState = {
  completedSummary: string;
  sourceContext: string;
  nextSteps: string;
  openQuestions: string;
  risks: string;
  workRef: string;
  internalNotes: string;
  toUserId: string;
  toRole: ProductionRole | "";
  reassignmentReason: string;
  reassignmentFlags: ReassignmentFlags;
};

export const emptyHandoffForm = (): HandoffFormState => ({
  completedSummary: "",
  sourceContext: "",
  nextSteps: "",
  openQuestions: "",
  risks: "",
  workRef: "",
  internalNotes: "",
  toUserId: "",
  toRole: "",
  reassignmentReason: "",
  reassignmentFlags: {},
});

type FileRoomTaskHandoffPanelProps = {
  mode: HandoffPanelMode;
  form: HandoffFormState;
  busy: boolean;
  reassignCandidates: readonly ReassignCandidate[];
  familyCapableRoles: readonly ProductionRole[];
  onChange: (next: HandoffFormState) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

function needsReassignmentReason(flags: ReassignmentFlags): boolean {
  return Boolean(
    flags.changesPriority ||
      flags.changesDeadlineCommitment ||
      flags.changesClientFacingScope ||
      flags.createsMaterialRisk,
  );
}

export function handoffFormToPayload(form: HandoffFormState): HandoffPayload {
  return {
    completedSummary: form.completedSummary,
    sourceContext: form.sourceContext,
    nextSteps: form.nextSteps,
    openQuestions: form.openQuestions.trim() || undefined,
    risks: form.risks.trim() || undefined,
    workRef: form.workRef.trim() || undefined,
    internalNotes: form.internalNotes.trim() || undefined,
  };
}

export default function FileRoomTaskHandoffPanel({
  mode,
  form,
  busy,
  reassignCandidates,
  familyCapableRoles,
  onChange,
  onConfirm,
  onCancel,
}: FileRoomTaskHandoffPanelProps) {
  const confirmLabel =
    mode === "submit"
      ? campaignTasksConfig.confirmSubmitLabel
      : mode === "release"
        ? campaignTasksConfig.confirmReleaseLabel
        : campaignTasksConfig.confirmReassignLabel;

  const selectedCandidate = reassignCandidates.find((entry) => entry.userId === form.toUserId);
  const roleOptions =
    selectedCandidate?.roles.filter((role) => familyCapableRoles.includes(role)) ??
    familyCapableRoles;

  const showReason = mode === "reassign" && needsReassignmentReason(form.reassignmentFlags);

  const updateField = <K extends keyof HandoffFormState>(key: K, value: HandoffFormState[K]) => {
    onChange({ ...form, [key]: value });
  };

  const toggleFlag = (key: keyof ReassignmentFlags) => {
    onChange({
      ...form,
      reassignmentFlags: {
        ...form.reassignmentFlags,
        [key]: !form.reassignmentFlags[key],
      },
    });
  };

  return (
    <div className="fr-tasks-handoff">
      {mode === "reassign" ? (
        <div className="fr-tasks-handoff__reassign">
          <label className="fr-tasks-handoff__field">
            <span className="fr-tasks-row__meta">{campaignTasksConfig.reassignStaffLabel}</span>
            <select
              className="fr-tasks-handoff__select"
              value={form.toUserId}
              disabled={busy}
              onChange={(event) => {
                const toUserId = event.target.value;
                const candidate = reassignCandidates.find((entry) => entry.userId === toUserId);
                onChange({
                  ...form,
                  toUserId,
                  toRole: candidate?.roles[0] ?? "",
                });
              }}
            >
              <option value="">Select staff…</option>
              {reassignCandidates.map((candidate) => (
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
              onChange={(event) => updateField("toRole", event.target.value as ProductionRole)}
            >
              <option value="">Select role…</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {campaignTasksConfig.productionRoleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="fr-tasks-handoff__flags">
            <legend className="fr-tasks-row__meta">Reassignment flags</legend>
            {(Object.keys(campaignTasksConfig.reassignRiskLabels) as (keyof ReassignmentFlags)[]).map(
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
          {showReason ? (
            <label className="fr-tasks-handoff__field">
              <span className="fr-tasks-row__meta">
                {campaignTasksConfig.handoffFieldLabels.reassignmentReason}
              </span>
              <textarea
                className="fr-tasks-handoff__textarea"
                rows={2}
                value={form.reassignmentReason}
                disabled={busy}
                onChange={(event) => updateField("reassignmentReason", event.target.value)}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {(Object.entries(campaignTasksConfig.handoffFieldLabels) as [keyof HandoffPayload | "reassignmentReason", string][])
        .filter(([key]) => key !== "reassignmentReason")
        .map(([key, label]) => {
          const required = key === "completedSummary" || key === "sourceContext" || key === "nextSteps";
          const value = form[key as keyof HandoffFormState] as string;
          return (
            <label key={key} className="fr-tasks-handoff__field">
              <span className="fr-tasks-row__meta">
                {label}
                {required ? " *" : ""}
              </span>
              <textarea
                className="fr-tasks-handoff__textarea"
                rows={key === "completedSummary" ? 2 : 2}
                value={value}
                disabled={busy}
                onChange={(event) => updateField(key as keyof HandoffFormState, event.target.value)}
              />
            </label>
          );
        })}

      <div className="fr-tasks-handoff__actions">
        <button
          type="button"
          className="utility-btn utility-btn--primary"
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={onCancel}>
          {campaignTasksConfig.cancelLabel}
        </button>
      </div>
    </div>
  );
}
