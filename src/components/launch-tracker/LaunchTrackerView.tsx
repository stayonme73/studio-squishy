import "./launch-tracker.css";

type Props = {
  html: string;
  loadedAt: string;
};

/** Temporary owner-only view of the Master Launch List. */
export default function LaunchTrackerView({ html, loadedAt }: Props) {
  const loadedLabel = new Date(loadedAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="lt-page">
      <header className="lt-header" data-lt-header="true">
        <p className="lt-header__eyebrow" data-lt-temp-label="true">
          Temporary owner planning view
        </p>
        <h1 className="lt-header__title">Launch Tracker</h1>
        <p className="lt-header__lead">
          Readable owner view of the Master Launch List. Scout updates the markdown document;
          refresh this page to see the latest saved notes. Not the Owner Console.
        </p>
        <p className="lt-header__meta">Document loaded {loadedLabel}</p>
      </header>

      <section
        className="lt-doc utility-card"
        aria-label="Master Launch List"
        // Owner-controlled markdown from the repository — not customer input.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
