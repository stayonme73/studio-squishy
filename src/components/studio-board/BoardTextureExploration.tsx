import Link from "next/link";

type ExplorationId = "a" | "b" | "c";

const explorations: {
  id: ExplorationId;
  label: string;
  title: string;
  feel: string;
  inspirationMaterial: "paper" | "vellum" | "cork";
}[] = [
  {
    id: "a",
    label: "Exploration A",
    title: "Premium Paper + Vellum",
    feel: "Modern · Architectural · Elegant · Thoughtful",
    inspirationMaterial: "vellum",
  },
  {
    id: "b",
    label: "Exploration B",
    title: "Premium Paper + Refined Cork",
    feel: "Creative · Warm · Human · Studio energy",
    inspirationMaterial: "cork",
  },
  {
    id: "c",
    label: "Exploration C",
    title: "Premium Paper throughout",
    feel: "Elevated · Timeless · Sophisticated · Unified",
    inspirationMaterial: "paper",
  },
];

function materialClass(material: "paper" | "vellum" | "cork") {
  return `bf-material bf-material-${material}`;
}

function CampaignSwatch() {
  return (
    <article className={`btx-campaign ${materialClass("paper")}`}>
      <span className="btx-campaign__badge">Current Campaign</span>
      <h2 className="btx-campaign__name">Grand Opening</h2>
      <p className="btx-campaign__progress">Campaign in Progress</p>
      <p className="btx-campaign__status-label">Status</p>
      <p className="btx-campaign__status">Building Concepts</p>
      <span className="btx-campaign__cta">View Details →</span>
    </article>
  );
}

function PhilosophySwatch({ material }: { material: "paper" | "vellum" | "cork" }) {
  return (
    <aside className={`btx-philosophy ${materialClass(material)}`} aria-label="Studio inspiration">
      <p className="btx-philosophy__label">Today&apos;s Inspiration</p>
      <p className="btx-philosophy__quote">
        Great ideas
        <br />
        take shape
        <br />
        in the Studio.
      </p>
      <svg
        className="btx-philosophy__heart"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden
      >
        <path d="M12 20.5s-6.5-4.2-8.5-8.2C2.2 9.1 3.6 6 6.5 6c1.7 0 3.2 1 4 2.5.8-1.5 2.3-2.5 4-2.5 2.9 0 4.3 3.1 3 6.3-2 4-8.5 8.2-8.5 8.2z" />
      </svg>
    </aside>
  );
}

/** Side-by-side texture swatches — does not change the live Studio Board. */
export default function BoardTextureExploration() {
  return (
    <div className="btx">
      <Link href="/studio-board" className="btx-back">
        ← Back to Studio Board
      </Link>

      <header className="btx-header">
        <h1>Board Family — Texture Exploration</h1>
        <p>
          Three swatches only. Same layout language — different surface materials. Current Campaign
          always uses Premium Paper. Today&apos;s Inspiration varies so you can choose with your
          eyes, not a debate.
        </p>
      </header>

      <div className="btx-grid">
        {explorations.map((item) => (
          <section key={item.id} className="btx-col" aria-labelledby={`btx-${item.id}-title`}>
            <div className="btx-col__head">
              <p className="btx-col__label">{item.label}</p>
              <h2 id={`btx-${item.id}-title`} className="btx-col__title">
                {item.title}
              </h2>
              <p className="btx-col__feel">{item.feel}</p>
            </div>

            <div className="btx-swatches">
              <div>
                <h3>Current Campaign tile</h3>
                <CampaignSwatch />
              </div>
              <div>
                <h3>Today&apos;s Inspiration</h3>
                <PhilosophySwatch material={item.inspirationMaterial} />
              </div>
            </div>
          </section>
        ))}
      </div>

      <p className="btx-footnote">
        Skyline hero, sidebar, and live board layout are unchanged. Pick A, B, or C — or mix (e.g.
        Paper tiles + Cork inspiration). Tell Scout which swatch wins.
      </p>
    </div>
  );
}
