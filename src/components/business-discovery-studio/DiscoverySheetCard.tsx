"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import type { DiscoveryTileConfig, DiscoveryTileId } from "@/config/business-discovery-studio";
import {
  formatBusinessTileAnswer,
  parseBusinessTileAnswer,
} from "@/lib/business-discovery-completion";

type Props = {
  tileId: DiscoveryTileId;
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
  tileId,
  config,
  initialValue = "",
  onChange,
  onDone,
  onCancel,
  expanded = true,
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [businessName, setBusinessName] = useState(() =>
    config.secondaryQuestion ? parseBusinessTileAnswer(initialValue).name : initialValue,
  );
  const [businessOffer, setBusinessOffer] = useState(() =>
    config.secondaryQuestion ? parseBusinessTileAnswer(initialValue).offer : "",
  );
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
  const secondaryQuestionId = useId();
  const otherInputId = useId();
  const otherLabel = config.otherLabel ?? DEFAULT_OTHER_LABEL;
  const sanitizedOnMountRef = useRef(false);

  useEffect(() => {
    if (!config.secondaryQuestion || sanitizedOnMountRef.current) return;
    sanitizedOnMountRef.current = true;
    const parsed = parseBusinessTileAnswer(initialValue);
    const cleaned = formatBusinessTileAnswer(parsed.name, parsed.offer);
    if (cleaned !== initialValue) {
      onChange(cleaned);
    }
  }, [config.secondaryQuestion, initialValue, onChange]);

  useEffect(() => {
    setValue(initialValue);
    if (config.secondaryQuestion) {
      const parsed = parseBusinessTileAnswer(initialValue);
      setBusinessName(parsed.name);
      setBusinessOffer(parsed.offer);
    }
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
  }, [initialValue, config.title, config.fieldType, config.options, config.otherLabel, config.secondaryQuestion]);

  const emitChange = (next: string) => {
    setValue(next);
    onChange(next);
  };

  const emitBusinessChange = (name: string, offer: string) => {
    const next = formatBusinessTileAnswer(name, offer);
    setValue(next);
    onChange(next);
  };

  const handleTextChange = (next: string) => {
    emitChange(next);
  };

  const handleBusinessNameChange = (name: string) => {
    setBusinessName(name);
    emitBusinessChange(name, businessOffer);
  };

  const handleBusinessOfferChange = (offer: string) => {
    setBusinessOffer(offer);
    emitBusinessChange(businessName, offer);
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
              : config.fieldType === "text" && config.secondaryQuestion
                ? !businessName.trim() || !businessOffer.trim()
                : !value.trim();

  return (
    <form
      className="bds-sheet"
      data-tile-id={tileId}
      onSubmit={handleSubmit}
      aria-label={config.title}
    >
      <div className="bds-sheet__paper">
        <p className="bds-sheet__title">{config.title}</p>
        {config.fieldType !== "submit" && config.question ? (
          isChipField(config.fieldType) ? (
            <p className="bds-sheet__question" id={questionId}>
              {config.question}
            </p>
          ) : (
            <label className="bds-sheet__question" htmlFor={questionId}>
              {config.question}
            </label>
          )
        ) : null}

        <div className="bds-sheet__body">
          {config.fieldType === "text" && config.secondaryQuestion && (
            <>
              <input
                id={questionId}
                className="bds-sheet__input"
                type="text"
                value={businessName}
                onChange={(event) => handleBusinessNameChange(event.target.value)}
                placeholder={config.placeholder}
                autoFocus={expanded}
              />
              <label className="bds-sheet__question" htmlFor={secondaryQuestionId}>
                {config.secondaryQuestion}
              </label>
              <input
                id={secondaryQuestionId}
                className="bds-sheet__input"
                type="text"
                value={businessOffer}
                onChange={(event) => handleBusinessOfferChange(event.target.value)}
                placeholder={config.secondaryPlaceholder}
              />
            </>
          )}

          {config.fieldType === "text" && !config.secondaryQuestion && (
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
            <>
              {config.description ? (
                <p className="bds-sheet__submit-note">{config.description}</p>
              ) : null}
              {config.postSubmissionNote !== undefined && config.postSubmissionNote ? (
                <p className="bds-sheet__post-submit-note">{config.postSubmissionNote}</p>
              ) : null}
            </>
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
