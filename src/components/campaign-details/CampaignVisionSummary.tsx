import type { DraftIntakeSummarySection } from "@/config/draft-room";
import { draftRoom } from "@/config/draft-room";

type Props = {
  sections: readonly DraftIntakeSummarySection[];
};

/** Read-only vision summary for Campaign Page — no edit controls. */
export default function CampaignVisionSummary({ sections }: Props) {
  const { review } = draftRoom.intakeForm;

  if (sections.length === 0) {
    return <p className="cd-vision__empty">{review.emptyAnswer}</p>;
  }

  return (
    <div className="cd-vision" role="list" aria-label="Vision summary">
      {sections.map((section) => (
        <article key={section.step} className="cd-vision__section" role="listitem">
          <p className="cd-vision__eyebrow">
            <span className="cd-vision__num">{section.step}</span>
            {section.eyebrow}
          </p>
          <div className="cd-vision__answers">
            {section.entries.map((entry, index) => (
              <div key={`${section.step}-${index}`} className="cd-vision__answer">
                {entry.label ? <p className="cd-vision__label">{entry.label}</p> : null}
                <p
                  className={`cd-vision__value${
                    entry.value === review.emptyAnswer ? " cd-vision__value--empty" : ""
                  }`}
                >
                  {entry.value}
                </p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
