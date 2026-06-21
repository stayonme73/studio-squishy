import { studioBoard, type StudioUpdate } from "@/config/studio-board";
import type { ActivityFeedEntry } from "@/lib/campaign-record";

const { activityFeed: copy, studioNote: noteCopy } = studioBoard;

type Props = {
  entries: readonly ActivityFeedEntry[];
  studioNote?: StudioUpdate | null;
};

/** Timeline + sticky studio note — same card, more personality. */
export default function ActivityFeed({ entries, studioNote }: Props) {
  return (
    <section className="sb-activity" aria-labelledby="sb-activity-title">
      <h2 id="sb-activity-title" className="sb-card__tab">
        {copy.heading}
      </h2>

      <div className="sb-activity__body">
        <aside className={`sb-studio-note${studioNote ? "" : " sb-studio-note--empty"}`}>
          <p className="sb-studio-note__tab">{noteCopy.heading}</p>
          {studioNote ? (
            <>
              <time className="sb-studio-note__date">{studioNote.date}</time>
              <p className="sb-studio-note__text">{studioNote.message}</p>
            </>
          ) : (
            <p className="sb-studio-note__text sb-studio-note__text--empty">{noteCopy.emptyHint}</p>
          )}
        </aside>

        {entries.length > 0 ? (
          <ol className="sb-timeline">
            {entries.map((entry, index) => (
              <li key={`${entry.date}-${entry.message}-${index}`} className="sb-timeline__item">
                <span className="sb-timeline__node" aria-hidden="true" />
                <div className="sb-timeline__content">
                  <div className="sb-timeline__meta">
                    <time className="sb-timeline__date">{entry.date}</time>
                    {entry.time ? <span className="sb-timeline__time">{entry.time}</span> : null}
                  </div>
                  <p className="sb-timeline__message">{entry.message}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="sb-timeline__empty">{copy.emptyHint}</p>
        )}
      </div>
    </section>
  );
}
