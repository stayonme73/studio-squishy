import { customerVisibilityContinuityV1 as copy } from "@/config/customer-visibility-continuity-v1";
import type { CustomerVisibilityContinuityView } from "@/lib/customer-visibility-continuity";

type Props = {
  view: CustomerVisibilityContinuityView;
};

export default function CustomerVisibilityContinuityPanel({ view }: Props) {
  return (
    <section
      className="sb-visibility-continuity"
      aria-labelledby="sb-visibility-continuity-title"
      data-testid="customer-visibility-continuity"
      data-has-campaign={view.hasCampaign ? "true" : "false"}
      data-who-acts={view.whoActsNext}
      data-has-target={view.hasAuthoritativeTargetDate ? "true" : "false"}
    >
      <p id="sb-visibility-continuity-title" className="sb-visibility-continuity__heading">
        {copy.panelHeading}
      </p>

      <dl className="sb-visibility-continuity__list">
        <div className="sb-visibility-continuity__row">
          <dt>{copy.sections.needed}</dt>
          <dd data-testid="cvc-needed">{view.whatWeNeedFromYou}</dd>
        </div>
        {view.receivedOrCompleteNotes.length > 0 ? (
          <div className="sb-visibility-continuity__row">
            <dt>Recorded or complete</dt>
            <dd data-testid="cvc-received">
              <ul className="sb-visibility-continuity__notes">
                {view.receivedOrCompleteNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
        <div className="sb-visibility-continuity__row">
          <dt>{copy.sections.studioWorking}</dt>
          <dd data-testid="cvc-studio">{view.whatStudioIsDoing}</dd>
        </div>
        <div className="sb-visibility-continuity__row">
          <dt>{copy.sections.nextStep}</dt>
          <dd data-testid="cvc-next">{view.nextStep}</dd>
        </div>
        <div className="sb-visibility-continuity__row">
          <dt>{copy.sections.whoActs}</dt>
          <dd data-testid="cvc-who">{view.whoActsNextLabel}</dd>
        </div>
        <div className="sb-visibility-continuity__row">
          <dt>{copy.sections.target}</dt>
          <dd data-testid="cvc-target">{view.targetOrCheckpoint}</dd>
        </div>
        <div className="sb-visibility-continuity__row">
          <dt>{copy.sections.risk}</dt>
          <dd data-testid="cvc-risk">{view.riskOrBlocker}</dd>
        </div>
      </dl>
    </section>
  );
}
