import {
  draftRoom,
  draftRoomIntakeAnswerSummary,
  type DraftIntakeFormValues,
} from "@/config/draft-room";
import { intakeDesignSystem } from "@/config/intake-design-system";

type Props = {
  values: DraftIntakeFormValues;
  onEditStep: (step: number) => void;
};

function sectionIsEmpty(
  entries: readonly { value: string }[],
  emptyLabel: string,
): boolean {
  return entries.every((entry) => entry.value === emptyLabel || !entry.value.trim());
}

/** Scrollable list of every answer — clients see responses before submit or after. */
export default function DraftIntakeAnswerSummary({ values, onEditStep }: Props) {
  const { review } = draftRoom.intakeForm;
  const sections = draftRoomIntakeAnswerSummary(values);
  const visionStep = intakeDesignSystem.layout.visionStep;

  return (
    <div className="dri-step-content dri-step-content--summary">
      <p className="dri-eyebrow">{review.eyebrow}</p>
      <h3 className="dri-prompt">{review.prompt}</h3>
      <p className="dri-support">{review.support}</p>

      <div className="dri-summary" role="list" aria-label="Your answers">
        {sections.map((section) => {
          const empty = sectionIsEmpty(section.entries, review.emptyAnswer);
          const isVision = section.step === visionStep;

          return (
            <article
              key={section.step}
              className={`dri-summary-section${isVision ? " dri-summary-section--vision" : ""}${empty ? " dri-summary-section--missing" : ""}`}
              role="listitem"
            >
              <div className="dri-summary-section-head">
                <p className="dri-summary-eyebrow">
                  <span className="dri-summary-num">{section.step}</span>
                  {section.eyebrow}
                </p>
                <button
                  type="button"
                  className="dri-summary-edit"
                  onClick={() => onEditStep(section.step)}
                >
                  {review.editLabel}
                </button>
              </div>

              {empty ? (
                <p className="dri-summary-missing" role="status">
                  ⚠ Not Answered
                </p>
              ) : (
                <div className="dri-summary-answers">
                  {section.entries.map((entry, index) => {
                    const isEmpty = entry.value === review.emptyAnswer || !entry.value.trim();
                    return (
                      <div key={`${section.step}-${index}`} className="dri-summary-answer">
                        {entry.label ? <p className="dri-summary-label">{entry.label}</p> : null}
                        <p
                          className={`dri-summary-value${
                            isEmpty ? " dri-summary-value--empty" : ""
                          }`}
                        >
                          {isEmpty ? "⚠ Not Answered" : entry.value}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
