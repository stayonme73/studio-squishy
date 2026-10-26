import type { CampaignProgressStep } from "@/lib/studio-board-view";

/** Campaign Details — production progress only (same Board source-of-truth). */
export default function CampaignJourneyHero({
  steps,
}: {
  steps: readonly CampaignProgressStep[];
}) {
  return (
    <ol className="cd-journey" aria-label="Project journey">
      {steps.map((step) => (
        <li key={step.id} className={`cd-journey__step cd-journey__step--${step.state}`}>
          <span className="cd-journey__dot" aria-hidden>
            {step.state === "complete" ? "✓" : null}
          </span>
          <div className="cd-journey__copy">
            <span className="cd-journey__label">{step.label}</span>
            {step.detail ? <span className="cd-journey__hint">{step.detail}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
