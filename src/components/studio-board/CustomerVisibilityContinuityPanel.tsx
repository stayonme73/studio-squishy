import { customerVisibilityContinuityV1 as copy } from "@/config/customer-visibility-continuity-v1";
import type { CustomerVisibilityContinuityView } from "@/lib/customer-visibility-continuity";
import {
  isDuplicateStatusNextStep,
  isEmptyStatusRisk,
} from "@/lib/studio-board/board-status-mobile-presentation";

type Props = {
  view: CustomerVisibilityContinuityView;
};

export default function CustomerVisibilityContinuityPanel({ view }: Props) {
  const overlappingNext = isDuplicateStatusNextStep(view.nextStep, view.whatStudioIsDoing);
  const hideStudioWorking =
    overlappingNext && view.nextStep.trim().length > view.whatStudioIsDoing.trim().length;
  const hideNextStep = overlappingNext && !hideStudioWorking;

  return (
    <section
      className="sb-visibility-continuity"
      aria-labelledby={view.statusLabel ? "sb-visibility-continuity-title" : undefined}
      aria-label={view.statusLabel ? undefined : copy.panelHeading}
      data-testid="customer-visibility-continuity"
      data-has-campaign={view.hasCampaign ? "true" : "false"}
      data-who-acts={view.whoActsNext}
      data-has-target={view.hasAuthoritativeTargetDate ? "true" : "false"}
    >
      <dl className="sb-visibility-continuity__list">
        {view.statusLabel ? (
          <div className="sb-visibility-continuity__row">
            <dt id="sb-visibility-continuity-title">{copy.panelHeading}</dt>
            <dd data-testid="cvc-status">{view.statusLabel}</dd>
          </div>
        ) : null}
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
        {hideStudioWorking ? null : (
          <div className="sb-visibility-continuity__row">
            <dt>{copy.sections.studioWorking}</dt>
            <dd data-testid="cvc-studio">{view.whatStudioIsDoing}</dd>
          </div>
        )}
        {hideNextStep ? null : (
          <div className="sb-visibility-continuity__row">
            <dt>{copy.sections.nextStep}</dt>
            <dd data-testid="cvc-next">{view.nextStep}</dd>
          </div>
        )}
        <div className="sb-visibility-continuity__row">
          <dt>{copy.sections.whoActs}</dt>
          <dd data-testid="cvc-who">{view.whoActsNextLabel}</dd>
        </div>
        <div
          className={`sb-visibility-continuity__row${
            view.hasAuthoritativeTargetDate ? "" : " sb-status-copy-repeat"
          }`}
        >
          <dt>{copy.sections.target}</dt>
          <dd data-testid="cvc-target">{view.targetOrCheckpoint}</dd>
        </div>
        <div
          className={`sb-visibility-continuity__row${
            isEmptyStatusRisk(view.riskOrBlocker) ? " sb-status-copy-repeat" : ""
          }`}
        >
          <dt>{copy.sections.risk}</dt>
          <dd data-testid="cvc-risk">{view.riskOrBlocker}</dd>
        </div>
      </dl>
    </section>
  );
}
