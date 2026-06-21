import { studioBoard } from "@/config/studio-board";

const { nextStepCard: copy } = studioBoard;

type Props = {
  currentStep: string | null;
  nextMilestone: string | null;
  expectedUpdate: string | null;
  hasCampaign: boolean;
};

export default function NextStepCard({
  currentStep,
  nextMilestone,
  expectedUpdate,
  hasCampaign,
}: Props) {
  return (
    <section className="sb-next-step" aria-labelledby="sb-next-step-title">
      <p id="sb-next-step-title" className="sb-card__tab">
        {copy.heading}
      </p>

      {hasCampaign ? (
        <dl className="sb-next-step__list">
          <div className="sb-next-step__row sb-next-step__row--primary">
            <dt>{copy.currentStep}</dt>
            <dd className="sb-next-step__step">{currentStep}</dd>
          </div>
          {nextMilestone ? (
            <div className="sb-next-step__row">
              <dt>{copy.nextMilestone}</dt>
              <dd>{nextMilestone}</dd>
            </div>
          ) : null}
          {expectedUpdate ? (
            <div className="sb-next-step__row">
              <dt>{copy.expectedUpdate}</dt>
              <dd>{expectedUpdate}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="sb-next-step__empty">{copy.emptyHint}</p>
      )}
    </section>
  );
}
