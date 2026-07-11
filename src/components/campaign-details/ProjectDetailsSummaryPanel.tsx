import type { ProjectDetailsSummarySection } from "@/lib/campaign-details-view";
import { isRecordEmptyAnswer } from "@/lib/project-record-client-copy";

type Props = {
  sections: readonly ProjectDetailsSummarySection[];
};

/**
 * Read-only Project Details summary — extracted from the Campaign Record drawer so both
 * the drawer and Project Record render the identical content, not a redesigned copy of it.
 */
export default function ProjectDetailsSummaryPanel({ sections }: Props) {
  return (
    <>
      {sections.map((section) => (
        <article key={section.title} className="cd-vision__section">
          <p className="cd-vision__eyebrow">{section.title}</p>
          <div className="cd-vision__answers">
            {section.items.map((item) => (
              <div key={`${section.title}-${item.label}`} className="cd-vision__answer">
                <p className="cd-vision__label">{item.label}</p>
                <p
                  className={`cd-vision__value${
                    isRecordEmptyAnswer(item.value) ? " cd-vision__value--empty" : ""
                  }`}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </>
  );
}
