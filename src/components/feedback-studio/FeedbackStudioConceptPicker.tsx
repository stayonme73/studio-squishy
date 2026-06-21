import Link from "next/link";

import type { FeedbackConceptPreview } from "@/config/feedback-studio";
import { feedbackStudio } from "@/config/feedback-studio";
import { studioBoard } from "@/config/studio-board";

type Props = {
  concepts: readonly FeedbackConceptPreview[];
  campaignTitle: string;
  selectedOptionTitle: string | null;
  conceptHref: (id: FeedbackConceptPreview["id"]) => string;
};

function conceptOptionTitle(concept: FeedbackConceptPreview) {
  return `Campaign Concept ${concept.id}`;
}

/** Landing — three direction cards with preview teasers. */
export default function FeedbackStudioConceptPicker({
  concepts,
  campaignTitle,
  selectedOptionTitle,
  conceptHref,
}: Props) {
  return (
    <div className="fs-picker">
      <header className="fs-picker__intro">
        <p className="fs-picker__eyebrow">{feedbackStudio.compareHint}</p>
        <h2 className="fs-picker__campaign">{campaignTitle}</h2>
        <p className="fs-picker__lead">{feedbackStudio.pickerLead}</p>
      </header>

      <div className="fs-picker__grid">
        {concepts.map((concept) => {
          const optionTitle = conceptOptionTitle(concept);
          const isSelected = selectedOptionTitle === optionTitle;

          return (
            <article key={concept.id} className={`fs-direction-card fs-direction-card--${concept.hero.accent}`}>
              <div className="fs-direction-card__head">
                <span className="fs-direction-card__badge">{concept.id}</span>
                <div>
                  <h3 className="fs-direction-card__title">{concept.directionLabel}</h3>
                  <p className="fs-direction-card__tagline">{concept.tagline}</p>
                </div>
              </div>

              <div
                className={`fs-direction-card__hero fs-direction-card__hero--${concept.hero.accent}`}
                aria-hidden
              >
                <p className="fs-direction-card__hero-line">{concept.hero.headline}</p>
                <p className="fs-direction-card__hero-sub">{concept.hero.subhead}</p>
              </div>

              <p className="fs-direction-card__summary">{concept.summary}</p>

              <div className="fs-direction-card__previews" aria-label="Preview samples">
                <span className="fs-direction-card__chip">Social</span>
                <span className="fs-direction-card__chip">Email</span>
                <span className="fs-direction-card__chip">SMS</span>
              </div>

              <div className="fs-direction-card__actions">
                <Link href={conceptHref(concept.id)} className="utility-btn utility-btn--primary">
                  {feedbackStudio.openConceptCta}
                </Link>
                {isSelected ? (
                  <p className="fs-direction-card__selected">{feedbackStudio.selectedBadge}</p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <p className="fs-picker__footer">
        <Link href={studioBoard.routes.studioBoard} className="fs-picker__board-link">
          {feedbackStudio.backLabel} →
        </Link>
      </p>
    </div>
  );
}

export { conceptOptionTitle };
