"use client";

import { useEffect, useMemo, useState } from "react";

import styles from "@/components/studio-conversation-room/discovery/discovery-tablet.module.css";
import {
  formatBusinessTileAnswer,
  parseBusinessTileAnswer,
  parseMultiselect,
} from "@/lib/business-discovery-completion";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";
import {
  discoveryTabletStepConfig,
  isDiscoveryTabletStepComplete,
  type DiscoveryDeadlineInformation,
  type DiscoveryTabletStepId,
} from "@/lib/studio-conversation-discovery";

export type DiscoveryStepFormProps = {
  stepId: DiscoveryTabletStepId;
  answers: DiscoveryAnswers;
  deadline: DiscoveryDeadlineInformation | null;
  interactive: boolean;
  onSave: (value: string) => void;
  onBack?: () => void;
  onSkipOptional?: () => void;
  canGoBack?: boolean;
  saveLabel?: string;
  className?: string;
  /** Visual surface — Presentation uses light-on-glass tokens. */
  surface?: "tablet" | "presentation";
};

function serializeMultiselect(selected: string[]): string {
  return selected.join(", ");
}

/**
 * Shared Discovery answer controls — used by Voice tablet or Customer Presentation,
 * never both interactive at once (Conversation Driver).
 */
export default function DiscoveryStepForm({
  stepId,
  answers,
  deadline,
  interactive,
  onSave,
  onBack,
  onSkipOptional,
  canGoBack = false,
  saveLabel = "Save & continue",
  className,
  surface = "tablet",
}: DiscoveryStepFormProps) {
  const config = discoveryTabletStepConfig[stepId];
  const stored =
    stepId === "project-deadline"
      ? (deadline?.answer ?? "")
      : (answers[stepId] ?? "");

  const [textValue, setTextValue] = useState(stored);
  const [businessName, setBusinessName] = useState(
    () => parseBusinessTileAnswer(stored).name,
  );
  const [businessOffer, setBusinessOffer] = useState(
    () => parseBusinessTileAnswer(stored).offer,
  );
  const [selected, setSelected] = useState<string[]>(() =>
    config.fieldType === "multiselect" && config.options
      ? parseMultiselect(stored, config.options)
      : stored
        ? [stored]
        : [],
  );

  useEffect(() => {
    setTextValue(stored);
    setBusinessName(parseBusinessTileAnswer(stored).name);
    setBusinessOffer(parseBusinessTileAnswer(stored).offer);
    if (config.fieldType === "multiselect" && config.options) {
      setSelected(parseMultiselect(stored, config.options));
    } else if (config.fieldType === "select") {
      setSelected(stored ? [stored] : []);
    } else {
      setSelected([]);
    }
  }, [stepId, stored, config.fieldType, config.options]);

  const composedValue = useMemo(() => {
    if (config.secondaryQuestion) {
      return formatBusinessTileAnswer(businessName, businessOffer);
    }
    if (config.fieldType === "multiselect") {
      return serializeMultiselect(selected);
    }
    if (config.fieldType === "select") {
      return selected[0] ?? "";
    }
    return textValue;
  }, [
    businessName,
    businessOffer,
    config.fieldType,
    config.secondaryQuestion,
    selected,
    textValue,
  ]);

  const canSave = isDiscoveryTabletStepComplete(
    stepId,
    stepId === "project-deadline"
      ? answers
      : { ...answers, [stepId]: composedValue },
    stepId === "project-deadline"
      ? { answer: composedValue }
      : deadline,
  );

  return (
    <div
      className={[styles.fieldStack, className ?? ""].filter(Boolean).join(" ")}
      data-interactive={interactive ? "true" : "false"}
      data-surface={surface}
      aria-disabled={interactive ? undefined : true}
    >
      {config.secondaryQuestion ? (
        <>
          <label className={styles.label} htmlFor={`discovery-name-${stepId}`}>
            {config.question}
          </label>
          <input
            id={`discovery-name-${stepId}`}
            className={styles.input}
            value={businessName}
            placeholder={config.placeholder}
            disabled={!interactive}
            onChange={(event) => setBusinessName(event.target.value)}
          />
          <label className={styles.label} htmlFor={`discovery-offer-${stepId}`}>
            {config.secondaryQuestion}
          </label>
          <input
            id={`discovery-offer-${stepId}`}
            className={styles.input}
            value={businessOffer}
            placeholder={config.secondaryPlaceholder}
            disabled={!interactive}
            onChange={(event) => setBusinessOffer(event.target.value)}
          />
        </>
      ) : null}

      {!config.secondaryQuestion && config.fieldType === "textarea" ? (
        <textarea
          className={styles.textarea}
          value={textValue}
          placeholder={config.placeholder}
          disabled={!interactive}
          onChange={(event) => setTextValue(event.target.value)}
          aria-label={config.question}
        />
      ) : null}

      {!config.secondaryQuestion && config.fieldType === "text" ? (
        <input
          className={styles.input}
          value={textValue}
          placeholder={config.placeholder}
          disabled={!interactive}
          onChange={(event) => setTextValue(event.target.value)}
          aria-label={config.question}
        />
      ) : null}

      {(config.fieldType === "select" || config.fieldType === "multiselect") &&
      config.options ? (
        <div className={styles.chips} role="group" aria-label={config.question}>
          {config.options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                className={styles.chip}
                data-selected={isSelected ? "true" : "false"}
                disabled={!interactive}
                onClick={() => {
                  if (!interactive) return;
                  if (config.fieldType === "select") {
                    setSelected([option]);
                    return;
                  }
                  setSelected((prev) =>
                    prev.includes(option)
                      ? prev.filter((item) => item !== option)
                      : [...prev, option],
                  );
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      ) : null}

      {interactive ? (
        <div className={styles.actions}>
          {onBack ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={onBack}
              disabled={!canGoBack}
            >
              Back
            </button>
          ) : null}
          {!config.required && onSkipOptional ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={onSkipOptional}
            >
              Skip
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={!canSave && config.required}
            onClick={() => onSave(composedValue)}
          >
            {saveLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
