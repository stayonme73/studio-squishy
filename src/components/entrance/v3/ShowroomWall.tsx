"use client";

import { welcomeHallV3 } from "@/config/welcome-hall-v3-direction";

type Props = {
  categoryIndex: number | null;
  onCtaClick: () => void;
};

/**
 * INTERACTIVE showroom wall — updates when the tower selects a category.
 *
 * Visual language (not behavior) matches static "Ideas Into Action" readability:
 * big headline · three scan lines · short receive list · CTA.
 *
 * Default state = welcome copy. Tower rotation = category panels (Marketing, etc.).
 */
export default function ShowroomWall({ categoryIndex, onCtaClick }: Props) {
  const isDefault = categoryIndex === null;
  const category = categoryIndex !== null ? welcomeHallV3.towerFaces[categoryIndex] : null;

  return (
    <section className="showroom-wall" aria-label="Team Studio showroom">
      <div className="showroom-wall-frame">
        <div className="showroom-wall-panel" key={isDefault ? "default" : category?.id}>
          {isDefault ? (
            <>
              <p className="showroom-wall-headline">{welcomeHallV3.showroomDefault.headline}</p>
              <ul className="showroom-wall-scan" aria-label="Outcomes">
                {welcomeHallV3.showroomDefault.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="showroom-wall-hint">Turn the tower to explore what Team Studio offers.</p>
            </>
          ) : (
            category && (
              <>
                <p className="showroom-wall-headline">{category.label}</p>
                <ul className="showroom-wall-scan" aria-label={`${category.label} highlights`}>
                  {category.scanLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="showroom-wall-receive-label">You may receive:</p>
                <ul className="showroom-wall-receive">
                  {category.deliverablesPreview.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <button type="button" className="showroom-wall-cta" onClick={onCtaClick}>
                  {welcomeHallV3.wallCta}
                </button>
              </>
            )
          )}
        </div>
      </div>
    </section>
  );
}
