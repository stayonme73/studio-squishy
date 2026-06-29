"use client";

import { campaignTasksConfig } from "@/config/campaign-tasks";
import { requiredChecksForPhase } from "@/lib/campaign-tasks/qa-checklists";
import type { QaBlockCategory, QaFailCategory, TaskPhase } from "@/lib/campaign-tasks/types";

export type QaDispositionCategory =
  | "production_correction"
  | "missing_client_fact"
  | "compliance_concern"
  | "direction_disagreement";

export type QaFormState = {
  checkedItems: Record<string, boolean>;
  category: QaDispositionCategory | "";
  requiredCorrection: string;
  missingFactDescription: string;
  missingFactReason: string;
  notes: string;
};

export const emptyQaForm = (phase: TaskPhase): QaFormState => {
  const checks = requiredChecksForPhase(phase);
  const checkedItems: Record<string, boolean> = {};
  for (const item of checks) {
    checkedItems[item] = false;
  }
  return {
    checkedItems,
    category: "",
    requiredCorrection: "",
    missingFactDescription: "",
    missingFactReason: "",
    notes: "",
  };
};

type FileRoomQaPanelProps = {
  phase: TaskPhase;
  form: QaFormState;
  busy: boolean;
  canPass: boolean;
  canFail: boolean;
  canBlock: boolean;
  onChange: (next: QaFormState) => void;
  onPass: () => void;
  onFail: () => void;
  onBlock: () => void;
  onCancel: () => void;
};

const FAIL_CATEGORIES: readonly QaFailCategory[] = ["production_correction", "missing_client_fact"];
const BLOCK_CATEGORIES: readonly QaBlockCategory[] = [
  "compliance_concern",
  "direction_disagreement",
];

function isFailCategory(category: string): category is QaFailCategory {
  return (FAIL_CATEGORIES as readonly string[]).includes(category);
}

function isBlockCategory(category: string): category is QaBlockCategory {
  return (BLOCK_CATEGORIES as readonly string[]).includes(category);
}

export function qaFormChecks(form: QaFormState, phase: TaskPhase): string[] {
  return requiredChecksForPhase(phase).filter((item) => form.checkedItems[item]);
}

export default function FileRoomQaPanel({
  phase,
  form,
  busy,
  canPass,
  canFail,
  canBlock,
  onChange,
  onPass,
  onFail,
  onBlock,
  onCancel,
}: FileRoomQaPanelProps) {
  const checklistItems = requiredChecksForPhase(phase);
  const allChecksComplete =
    checklistItems.length === 0 || checklistItems.every((item) => form.checkedItems[item]);

  const categoryIsFail = form.category !== "" && isFailCategory(form.category);
  const categoryIsBlock = form.category !== "" && isBlockCategory(form.category);

  const toggleCheck = (item: string) => {
    onChange({
      ...form,
      checkedItems: { ...form.checkedItems, [item]: !form.checkedItems[item] },
    });
  };

  const updateField = <K extends keyof QaFormState>(key: K, value: QaFormState[K]) => {
    onChange({ ...form, [key]: value });
  };

  return (
    <div className="fr-qa-panel">
      <fieldset className="fr-qa-panel__checklist">
        <legend className="fr-tasks-row__meta">QA checklist</legend>
        {checklistItems.map((item) => (
          <label key={item} className="fr-qa-panel__checkbox">
            <input
              type="checkbox"
              checked={Boolean(form.checkedItems[item])}
              disabled={busy}
              onChange={() => toggleCheck(item)}
            />
            {campaignTasksConfig.qaChecklistLabels[
              item as keyof typeof campaignTasksConfig.qaChecklistLabels
            ] ?? item}
          </label>
        ))}
      </fieldset>

      <label className="fr-qa-panel__field">
        <span className="fr-tasks-row__meta">{campaignTasksConfig.qaCategoryLabel}</span>
        <select
          className="fr-qa-panel__select"
          value={form.category}
          disabled={busy}
          onChange={(event) =>
            updateField("category", event.target.value as QaDispositionCategory | "")
          }
        >
          <option value="">Select if failing or blocking…</option>
          <optgroup label="Fail — return for correction">
            {(Object.entries(campaignTasksConfig.qaFailCategoryLabels) as [QaFailCategory, string][])
              .filter(([key]) => key !== "scope_change")
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </optgroup>
          <optgroup label="Block — hold production">
            {(
              Object.entries(campaignTasksConfig.qaBlockCategoryLabels) as [
                QaBlockCategory,
                string,
              ][]
            ).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      {form.category === "production_correction" ? (
        <label className="fr-qa-panel__field">
          <span className="fr-tasks-row__meta">
            {campaignTasksConfig.requiredCorrectionLabel} *
          </span>
          <textarea
            className="fr-qa-panel__textarea"
            rows={2}
            value={form.requiredCorrection}
            disabled={busy}
            onChange={(event) => updateField("requiredCorrection", event.target.value)}
          />
        </label>
      ) : null}

      {form.category === "missing_client_fact" ? (
        <>
          <label className="fr-qa-panel__field">
            <span className="fr-tasks-row__meta">
              {campaignTasksConfig.missingFactDescriptionLabel} *
            </span>
            <input
              className="fr-qa-panel__input"
              type="text"
              value={form.missingFactDescription}
              disabled={busy}
              onChange={(event) => updateField("missingFactDescription", event.target.value)}
            />
          </label>
          <label className="fr-qa-panel__field">
            <span className="fr-tasks-row__meta">
              {campaignTasksConfig.missingFactReasonLabel} *
            </span>
            <textarea
              className="fr-qa-panel__textarea"
              rows={2}
              value={form.missingFactReason}
              disabled={busy}
              onChange={(event) => updateField("missingFactReason", event.target.value)}
            />
          </label>
        </>
      ) : null}

      <label className="fr-qa-panel__field">
        <span className="fr-tasks-row__meta">{campaignTasksConfig.qaNotesLabel}</span>
        <textarea
          className="fr-qa-panel__textarea"
          rows={2}
          value={form.notes}
          disabled={busy}
          onChange={(event) => updateField("notes", event.target.value)}
        />
      </label>

      <p className="fr-qa-panel__scope-note">{campaignTasksConfig.scopeChangeHelperText}</p>

      <div className="fr-qa-panel__actions">
        {canPass ? (
          <button
            type="button"
            className="utility-btn utility-btn--primary"
            disabled={busy || !allChecksComplete}
            onClick={onPass}
          >
            {campaignTasksConfig.qaPassLabel}
          </button>
        ) : null}
        {canFail ? (
          <button
            type="button"
            className="utility-btn"
            disabled={busy || !categoryIsFail}
            onClick={onFail}
          >
            {campaignTasksConfig.qaFailLabel}
          </button>
        ) : null}
        {canBlock ? (
          <button
            type="button"
            className="utility-btn"
            disabled={busy || !categoryIsBlock}
            onClick={onBlock}
          >
            {campaignTasksConfig.qaBlockLabel}
          </button>
        ) : null}
        <button type="button" className="utility-btn" disabled={busy} onClick={onCancel}>
          {campaignTasksConfig.cancelLabel}
        </button>
      </div>
    </div>
  );
}
