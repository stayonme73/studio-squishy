"use client";

import Link from "next/link";

import { c8dFinalSubstanceV1 } from "@/config/c8d-final-substance-v1";
import { buildUnifiedRoomHref } from "@/lib/c8d-unified-room-state";
import {
  resolveFinalRoomSubstance,
  type FinalSubstanceDeliveryInput,
  type FinalSubstanceStagesInput,
} from "@/lib/c8d-final-room-substance";
import { useFinalDelivery } from "@/lib/use-final-delivery";
import { useReviewDeliveryStages } from "@/lib/use-review-delivery-stages";

type Props = {
  campaignId: string;
  jobId?: string | null;
};

function toStagesInput(
  stagesState: ReturnType<typeof useReviewDeliveryStages>["state"],
): FinalSubstanceStagesInput {
  if (stagesState.status === "idle" || stagesState.status === "loading") {
    return { status: "loading" };
  }
  if (stagesState.status === "ready") {
    return {
      status: "ready",
      summary: stagesState.summary,
      jobs: stagesState.jobs,
    };
  }
  if (stagesState.status === "error") return { status: "error" };
  return { status: "unavailable" };
}

function toDeliveryInput(
  deliveryState: ReturnType<typeof useFinalDelivery>["state"],
): FinalSubstanceDeliveryInput {
  if (deliveryState.status === "idle" || deliveryState.status === "loading") {
    return { status: deliveryState.status === "idle" ? "idle" : "loading" };
  }
  if (deliveryState.status === "error") return { status: "error" };
  return { status: "ready", delivery: deliveryState.delivery };
}

/** C8d — compact Final substance from 7A stages + Honest Final Files availability. */
export default function UnifiedRoomFinalSummary({ campaignId, jobId }: Props) {
  const { state: stagesState } = useReviewDeliveryStages(campaignId);
  const { state: deliveryState } = useFinalDelivery(campaignId);

  const substance = resolveFinalRoomSubstance({
    requestedJobId: jobId ?? null,
    stages: toStagesInput(stagesState),
    delivery: toDeliveryInput(deliveryState),
  });

  // Never pass a stale requested jobId into Delivery — only an authorized focused id.
  const deliveryHref = buildUnifiedRoomHref({
    roomState: "delivery",
    jobId: substance.focusedJobId,
  });

  const actionClass =
    substance.customerAction.kind === "action_required"
      ? "c8d-final-summary__value c8d-final-summary__value--action"
      : "c8d-final-summary__value";

  return (
    <section
      className="rd-stage-card c8d-final-summary"
      aria-labelledby="c8d-final-heading"
      data-final-substance="true"
      data-delivery-availability={substance.deliveryAvailability.kind}
      data-customer-action={substance.customerAction.kind}
      data-requested-job-unavailable={
        substance.requestedJobUnavailable ? "true" : undefined
      }
    >
      <h2 id="c8d-final-heading" className="rd-stage-card__heading">
        {substance.heading}
      </h2>
      <p className="rd-stage-card__explanation">{substance.statusExplanation}</p>

      <dl className="c8d-final-summary__facts">
        <div>
          <dt>{c8dFinalSubstanceV1.workReference.label}</dt>
          <dd>{substance.workReference.detail}</dd>
        </div>
        <div>
          <dt>Customer action</dt>
          <dd className={actionClass}>{substance.customerAction.message}</dd>
        </div>
        <div>
          <dt>{substance.whatHappensNext.label}</dt>
          <dd>{substance.whatHappensNext.body}</dd>
        </div>
        <div>
          <dt>{c8dFinalSubstanceV1.deliveryAvailability.label}</dt>
          <dd data-testid="c8d-final-delivery-availability">
            {substance.deliveryAvailability.message}
          </dd>
        </div>
      </dl>

      <p className="rd-stage-card__actions">
        {substance.openDelivery.enabled ? (
          <Link
            className={
              substance.openDelivery.emphasize
                ? "utility-btn utility-btn--primary"
                : "utility-btn utility-btn--secondary"
            }
            href={deliveryHref}
          >
            {substance.openDelivery.label}
          </Link>
        ) : (
          <button type="button" className="utility-btn utility-btn--secondary" disabled>
            {substance.openDelivery.label}
          </button>
        )}
      </p>
    </section>
  );
}
