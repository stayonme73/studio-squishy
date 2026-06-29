"use client";

import { campaignExceptionsConfig } from "@/config/campaign-exceptions";
import type { CampaignExceptionKind } from "@/lib/campaign-tasks/exceptions-types";
import type { FileRoomTaskRow } from "@/lib/campaign-tasks/tasks-view";

export type RaiseExceptionFormState = {
  kind: CampaignExceptionKind | "";
  title: string;
  description: string;
  taskId: string;
};

export const emptyRaiseExceptionForm = (): RaiseExceptionFormState => ({
  kind: "",
  title: "",
  description: "",
  taskId: "",
});

type FileRoomExceptionRaisePanelProps = {
  form: RaiseExceptionFormState;
  busy: boolean;
  raiseableKinds: readonly CampaignExceptionKind[];
  tasks: readonly FileRoomTaskRow[];
  onChange: (next: RaiseExceptionFormState) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function FileRoomExceptionRaisePanel({
  form,
  busy,
  raiseableKinds,
  tasks,
  onChange,
  onConfirm,
  onCancel,
}: FileRoomExceptionRaisePanelProps) {
  const canSubmit = Boolean(form.kind && form.title.trim());

  return (
    <div className="fr-exception-panel">
      <label className="fr-exception-panel__field">
        <span>{campaignExceptionsConfig.raiseKindLabel}</span>
        <select
          className="fr-exception-panel__select"
          value={form.kind}
          disabled={busy}
          onChange={(event) =>
            onChange({ ...form, kind: event.target.value as CampaignExceptionKind | "" })
          }
        >
          <option value="">Select type</option>
          {raiseableKinds.map((kind) => (
            <option key={kind} value={kind}>
              {campaignExceptionsConfig.kindLabels[kind]}
            </option>
          ))}
        </select>
      </label>

      <label className="fr-exception-panel__field">
        <span>{campaignExceptionsConfig.raiseTitleLabel}</span>
        <input
          className="fr-exception-panel__input"
          type="text"
          value={form.title}
          disabled={busy}
          placeholder={campaignExceptionsConfig.raiseTitlePlaceholder}
          onChange={(event) => onChange({ ...form, title: event.target.value })}
        />
      </label>

      <label className="fr-exception-panel__field">
        <span>{campaignExceptionsConfig.raiseDescriptionLabel}</span>
        <textarea
          className="fr-exception-panel__textarea"
          value={form.description}
          disabled={busy}
          rows={3}
          placeholder={campaignExceptionsConfig.raiseDescriptionPlaceholder}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
        />
      </label>

      <label className="fr-exception-panel__field">
        <span>{campaignExceptionsConfig.raiseTaskLabel}</span>
        <select
          className="fr-exception-panel__select"
          value={form.taskId}
          disabled={busy}
          onChange={(event) => onChange({ ...form, taskId: event.target.value })}
        >
          <option value="">{campaignExceptionsConfig.raiseTaskNone}</option>
          {tasks.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </label>

      <div className="fr-exception-panel__actions">
        <button
          type="button"
          className="utility-btn utility-btn--primary"
          disabled={busy || !canSubmit}
          onClick={onConfirm}
        >
          {campaignExceptionsConfig.raiseLabel}
        </button>
        <button type="button" className="utility-btn" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
