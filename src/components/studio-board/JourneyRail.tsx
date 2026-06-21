import {
  campaignStatusIndex,
  studioBoard,
  type CampaignStatus,
} from "@/config/studio-board";

const { journeyStages } = studioBoard;

export default function JourneyRail({
  status,
  layout = "vertical",
  showHints = false,
  variant = "default",
}: {
  status: CampaignStatus | null;
  layout?: "vertical" | "horizontal";
  showHints?: boolean;
  variant?: "default" | "board";
}) {
  const activeIndex = status ? campaignStatusIndex(status) : -1;
  const variantClass = variant === "board" ? " sb-journey--board" : "";

  return (
    <ol
      className={`sb-journey sb-journey--${layout}${variantClass}`}
      aria-label="Campaign progress"
    >
      {journeyStages.map((stage, index) => {
        const isComplete = activeIndex >= 0 && index < activeIndex;
        const isCurrent = activeIndex === index;
        const state = isCurrent ? "current" : isComplete ? "complete" : "upcoming";

        return (
          <li key={stage.id} className={`sb-journey__step sb-journey__step--${state}`}>
            <span className="sb-journey__dot" aria-hidden>
              {isComplete ? "✓" : null}
            </span>
            <div className="sb-journey__copy">
              <span className="sb-journey__label">{stage.label}</span>
              {layout === "vertical" && showHints && "hint" in stage ? (
                <span className="sb-journey__hint">{stage.hint}</span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
