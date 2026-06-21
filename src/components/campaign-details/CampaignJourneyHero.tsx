import {
  campaignStatusIndex,
  studioBoard,
  type CampaignStatus,
} from "@/config/studio-board";

const { journeyStages } = studioBoard;

/** Campaign Details — hero-sized vertical journey (“Where am I?”). */
export default function CampaignJourneyHero({ status }: { status: CampaignStatus | null }) {
  const activeIndex = status ? campaignStatusIndex(status) : -1;

  return (
    <ol className="cd-journey" aria-label="Campaign journey">
      {journeyStages.map((stage, index) => {
        const isComplete = activeIndex >= 0 && index < activeIndex;
        const isCurrent = activeIndex === index;
        const state = isCurrent ? "current" : isComplete ? "complete" : "upcoming";

        return (
          <li key={stage.id} className={`cd-journey__step cd-journey__step--${state}`}>
            <span className="cd-journey__dot" aria-hidden>
              {isComplete ? "✓" : null}
            </span>
            <div className="cd-journey__copy">
              <span className="cd-journey__label">{stage.label}</span>
              {"hint" in stage ? <span className="cd-journey__hint">{stage.hint}</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
