"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import type { DiscoveryTileConfig } from "@/config/business-discovery-studio";

type Props = {
  config: DiscoveryTileConfig;
  initialValue?: string;
  onSave: (value: string) => void;
  onCancel?: () => void;
  expanded?: boolean;
};

type MultiselectOtherState = {
  selected: string[];
  otherSelected: boolean;
  otherText: string;
};

const DEFAULT_OTHER_LABEL = "Other";

function parseMultiselectOther(
  value: string,
  options: readonly string[],
  otherLabel = DEFAULT_OTHER_LABEL,
): MultiselectOtherState {
  const selected: string[] = [];
  let otherSelected = false;
  let otherText = "";

  if (!value.trim()) {
    return { selected, otherSelected, otherText };
  }

  for (const part of value.split(/,\s*/)) {
    const otherPrefix = `${otherLabel}: `;
    if (part.startsWith(otherPrefix)) {
      otherSelected = true;
      otherText = part.slice(otherPrefix.length).trim();
    } else if (options.includes(part)) {
      selected.push(part);
    } else if (part === otherLabel) {
      otherSelected = true;
    } else {
      otherSelected = true;
      otherText = part;
    }
  }

  return { selected, otherSelected, otherText };
}

function serializeMultiselectOther(
  state: MultiselectOtherState,
  otherLabel = DEFAULT_OTHER_LABEL,
): string {
  const parts = [...state.selected];
  const trimmedOther = state.otherText.trim();
  if (state.otherSelected && trimmedOther) {
    parts.push(`${otherLabel}: ${trimmedOther}`);
  }
  return parts.join(", ");
}

function isMultiselectOtherValid(
  state: MultiselectOtherState,
): boolean {
  return (
    state.selected.length > 0 ||
    (state.otherSelected && state.otherText.trim().length > 0)
  );
}

export default function DiscoverySheetCard({
  config,
  initialValue = "",
  onSave,
  onCancel,
  expanded = true,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [multiselect, setMultiselect] = useState<MultiselectOtherState>(() =>
    config.fieldType === "multiselect-other" && config.options
      ? parseMultiselectOther(
          initialValue,
          config.options,
          config.otherLabel ?? DEFAULT_OTHER_LABEL,
        )
      : { selected: [], otherSelected: false, otherText: "" },
  );
  const questionId = useId();
  const otherInputId = useId();
  const otherLabel = config.otherLabel ?? DEFAULT_OTHER_LABEL;

  useEffect(() => {
    setValue(initialValue);
    if (config.fieldType === "multiselect-other" && config.options) {
      setMultiselect(
        parseMultiselectOther(
          initialValue,
          config.options,
          config.otherLabel ?? DEFAULT_OTHER_LABEL,
        ),
      );
    }
  }, [initialValue, config.title, config.fieldType, config.options, config.otherLabel]);

  const toggleOption = (option: string) => {
    setMultiselect((prev) => {
      const isSelected = prev.selected.includes(option);
      return {
        ...prev,
        selected: isSelected
          ? prev.selected.filter((item) => item !== option)
          : [...prev.selected, option],
      };
    });
  };

  const toggleOther = () => {
    setMultiselect((prev) => ({
      ...prev,
      otherSelected: !prev.otherSelected,
      otherText: prev.otherSelected ? "" : prev.otherText,
    }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (config.fieldType === "submit") {
      onSave("submitted");
      return;
    }
    if (config.fieldType === "multiselect-other") {
      if (!isMultiselectOtherValid(multiselect)) return;
      onSave(serializeMultiselectOther(multiselect, otherLabel));
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  const isSaveDisabled =
    config.fieldType === "submit"
      ? false
      : config.fieldType === "select"
        ? !value
        : config.fieldType === "multiselect-other"
          ? !isMultiselectOtherValid(multiselect)
          : !value.trim();

  return (
    <form
      className="bds-sheet"
      onSubmit={handleSubmit}
      aria-label={config.title}
    >
      <div className="bds-sheet__paper">
        <p className="bds-sheet__title">{config.title}</p>
        {config.fieldType === "multiselect-other" ? (
          <p className="bds-sheet__question" id={questionId}>
            {config.question}
          </p>
        ) : (
          <label className="bds-sheet__question" htmlFor={questionId}>
            {config.question}
          </label>
        )}

        <div className="bds-sheet__body">
          {config.fieldType === "text" && (
            <input
              id={questionId}
              className="bds-sheet__input"
              type="text"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={config.placeholder}
              autoFocus={expanded}
            />
          )}

          {config.fieldType === "textarea" && (
            <textarea
              id={questionId}
              className="bds-sheet__textarea"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={config.placeholder}
              rows={expanded ? 1 : 2}
              autoFocus={expanded}
            />
          )}

          {config.fieldType === "select" && (
            <div className="bds-sheet__select-wrap">
              <select
                id={questionId}
                className="bds-sheet__select"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                autoFocus={expanded}
              >
                <option value="" disabled>
                  Choose one…
                </option>
                {config.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}

          {config.fieldType === "multiselect-other" && config.options && (
            <div
              className="bds-sheet__chip-grid"
              role="group"
              aria-labelledby={questionId}
            >
              {config.options.map((option) => {
                const isSelected = multiselect.selected.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    className={[
                      "bds-sheet__chip",
                      isSelected ? "bds-sheet__chip--selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-pressed={isSelected}
                    onClick={() => toggleOption(option)}
                  >
                    {option}
                  </button>
                );
              })}
              <button
                type="button"
                className={[
                  "bds-sheet__chip",
                  multiselect.otherSelected ? "bds-sheet__chip--selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={multiselect.otherSelected}
                onClick={toggleOther}
              >
                {otherLabel}
              </button>
              {multiselect.otherSelected && (
                <input
                  id={otherInputId}
                  className="bds-sheet__input bds-sheet__input--other"
                  type="text"
                  value={multiselect.otherText}
                  onChange={(event) =>
                    setMultiselect((prev) => ({
                      ...prev,
                      otherText: event.target.value,
                    }))
                  }
                  placeholder={config.otherPlaceholder ?? "Specify…"}
                  autoFocus={expanded}
                />
              )}
            </div>
          )}

          {config.fieldType === "submit" && (
            <p className="bds-sheet__submit-note">
              All discovery tiles are complete. Submit when you&apos;re ready.
            </p>
          )}
        </div>

        <div className="bds-sheet__actions">
          {onCancel && config.fieldType !== "submit" && (
            <button
              type="button"
              className="bds-sheet__btn bds-sheet__btn--ghost"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="bds-sheet__btn bds-sheet__btn--primary"
            disabled={isSaveDisabled}
          >
            {config.fieldType === "submit" ? "Submit" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}
