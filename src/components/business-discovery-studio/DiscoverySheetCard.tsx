"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import type { DiscoveryTileConfig } from "@/config/business-discovery-studio";

type Props = {
  config: DiscoveryTileConfig;
  initialValue?: string;
  onChange: (value: string) => void;
  onDone: () => void;
  onCancel?: () => void;
  expanded?: boolean;
};

type MultiselectOtherState = {
  selected: string[];
  otherSelected: boolean;
  otherText: string;
};

const DEFAULT_OTHER_LABEL = "Other";

function parseMultiselect(value: string, options: readonly string[]): string[] {
  if (!value.trim()) return [];
  return value
    .split(/,\s*/)
    .filter((part) => options.includes(part));
}

function serializeMultiselect(selected: string[]): string {
  return selected.join(", ");
}

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

function isMultiselectValid(selected: string[]): boolean {
  return selected.length > 0;
}

function isMultiselectOtherValid(state: MultiselectOtherState): boolean {
  return (
    state.selected.length > 0 ||
    (state.otherSelected && state.otherText.trim().length > 0)
  );
}

function isChipField(fieldType: DiscoveryTileConfig["fieldType"]): boolean {
  return fieldType === "select" || fieldType === "multiselect" || fieldType === "multiselect-other";
}

export default function DiscoverySheetCard({
  config,
  initialValue = "",
  onChange,
  onDone,
  onCancel,
  expanded = true,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [multiselect, setMultiselect] = useState<string[]>(() =>
    config.fieldType === "multiselect" && config.options
      ? parseMultiselect(initialValue, config.options)
      : [],
  );
  const [multiselectOther, setMultiselectOther] = useState<MultiselectOtherState>(() =>
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
    if (config.fieldType === "multiselect" && config.options) {
      setMultiselect(parseMultiselect(initialValue, config.options));
    }
    if (config.fieldType === "multiselect-other" && config.options) {
      setMultiselectOther(
        parseMultiselectOther(
          initialValue,
          config.options,
          config.otherLabel ?? DEFAULT_OTHER_LABEL,
        ),
      );
    }
  }, [initialValue, config.title, config.fieldType, config.options, config.otherLabel]);

  const emitChange = (next: string) => {
    setValue(next);
    onChange(next);
  };

  const handleTextChange = (next: string) => {
    emitChange(next);
  };

  const handleSelectChip = (option: string) => {
    emitChange(option);
  };

  const toggleMultiselectOption = (option: string) => {
    if (!config.options) return;
    const nextSelected = multiselect.includes(option)
      ? multiselect.filter((item) => item !== option)
      : [...multiselect, option];
    setMultiselect(nextSelected);
    onChange(serializeMultiselect(nextSelected));
  };

  const toggleOther = () => {
    setMultiselectOther((prev) => {
      const next = {
        ...prev,
        otherSelected: !prev.otherSelected,
        otherText: prev.otherSelected ? "" : prev.otherText,
      };
      onChange(serializeMultiselectOther(next, otherLabel));
      return next;
    });
  };

  const toggleMultiselectOtherOption = (option: string) => {
    setMultiselectOther((prev) => {
      const isSelected = prev.selected.includes(option);
      const next = {
        ...prev,
        selected: isSelected
          ? prev.selected.filter((item) => item !== option)
          : [...prev.selected, option],
      };
      onChange(serializeMultiselectOther(next, otherLabel));
      return next;
    });
  };

  const handleOtherTextChange = (otherText: string) => {
    setMultiselectOther((prev) => {
      const next = { ...prev, otherText };
      onChange(serializeMultiselectOther(next, otherLabel));
      return next;
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (config.fieldType === "submit") {
      onChange("submitted");
      onDone();
      return;
    }
    onDone();
  };

  const isDoneDisabled =
    config.fieldType === "submit"
      ? false
      : config.required === false
        ? false
        : config.fieldType === "select"
          ? !value
          : config.fieldType === "multiselect"
            ? !isMultiselectValid(multiselect)
            : config.fieldType === "multiselect-other"
              ? !isMultiselectOtherValid(multiselectOther)
              : !value.trim();

  return (
    <form
      className="bds-sheet"
      onSubmit={handleSubmit}
      aria-label={config.title}
    >
      <div className="bds-sheet__paper">
        <p className="bds-sheet__title">{config.title}</p>
        {isChipField(config.fieldType) ? (
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
              onChange={(event) => handleTextChange(event.target.value)}
              placeholder={config.placeholder}
              autoFocus={expanded}
            />
          )}

          {config.fieldType === "textarea" && (
            <textarea
              id={questionId}
              className="bds-sheet__textarea"
              value={value}
              onChange={(event) => handleTextChange(event.target.value)}
              placeholder={config.placeholder}
              rows={expanded ? 1 : 2}
              autoFocus={expanded}
            />
          )}

          {config.fieldType === "select" && config.options && (
            <div
              className="bds-sheet__chip-grid"
              role="radiogroup"
              aria-labelledby={questionId}
            >
              {config.options.map((option) => {
                const isSelected = value === option;
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
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectChip(option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {config.fieldType === "multiselect" && config.options && (
            <div
              className="bds-sheet__chip-grid"
              role="group"
              aria-labelledby={questionId}
            >
              {config.options.map((option) => {
                const isSelected = multiselect.includes(option);
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
                    onClick={() => toggleMultiselectOption(option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          )}

          {config.fieldType === "multiselect-other" && config.options && (
            <div
              className="bds-sheet__chip-grid"
              role="group"
              aria-labelledby={questionId}
            >
              {config.options.map((option) => {
                const isSelected = multiselectOther.selected.includes(option);
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
                    onClick={() => toggleMultiselectOtherOption(option)}
                  >
                    {option}
                  </button>
                );
              })}
              <button
                type="button"
                className={[
                  "bds-sheet__chip",
                  multiselectOther.otherSelected ? "bds-sheet__chip--selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={multiselectOther.otherSelected}
                onClick={toggleOther}
              >
                {otherLabel}
              </button>
              {multiselectOther.otherSelected && (
                <input
                  id={otherInputId}
                  className="bds-sheet__input bds-sheet__input--other"
                  type="text"
                  value={multiselectOther.otherText}
                  onChange={(event) => handleOtherTextChange(event.target.value)}
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
            disabled={isDoneDisabled}
          >
            {config.fieldType === "submit" ? "Submit" : "Done"}
          </button>
        </div>
      </div>
    </form>
  );
}
