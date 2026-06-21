import { welcomeHallCopy } from "@/config/welcome-hall-copy";

/**
 * Studio Depth — built-in capability wall on the right at the entrance.
 */
export default function StudioDepthWall() {
  const { studioDepth } = welcomeHallCopy;

  return (
    <aside className="studio-depth" aria-label={studioDepth.label}>
      <div className="studio-depth-structure">
        <div className="studio-depth-header">
          <p className="studio-depth-label">{studioDepth.label}</p>
        </div>

        <div className="studio-depth-panel">
          <h2 className="studio-depth-headline">{studioDepth.headline}</h2>

          <ul className="studio-depth-list">
            {studioDepth.capabilities.map((cap) => (
              <li key={cap.name} className="studio-depth-item">
                <span className="studio-depth-item-name">{cap.name}</span>
                <span className="studio-depth-item-detail">{cap.detail}</span>
              </li>
            ))}
          </ul>

          <p className="studio-depth-future">{studioDepth.future}</p>
        </div>
      </div>
    </aside>
  );
}
