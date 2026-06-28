import type { CampaignProgressStep } from "@/lib/studio-board-view";

type FileRoomStatusRailProps = {
  steps: readonly CampaignProgressStep[];
};

export default function FileRoomStatusRail({ steps }: FileRoomStatusRailProps) {
  return (
    <nav aria-label="Campaign status">
      <ul className="fr-status-rail">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`fr-status-rail__item fr-status-rail__item--${step.state}`}
          >
            <span className="fr-status-rail__dot" aria-hidden />
            <div>
              <p className="fr-status-rail__label">{step.label}</p>
              {step.detail ? <p className="fr-status-rail__detail">{step.detail}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}
