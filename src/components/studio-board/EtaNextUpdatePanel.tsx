import { studioBoard, type CampaignStatus } from "@/config/studio-board";
import type { BoardHeaderSnapshot } from "@/lib/studio-board-view";

const { etaPanel: copy } = studioBoard;

type Props = {
  snapshot: BoardHeaderSnapshot;
  statusLabel: string;
  status: CampaignStatus | null;
  estimatedFirstConcepts: string | null;
  hasCampaign: boolean;
};

function statusTone(status: CampaignStatus | null) {
  if (!status) return "";
  if (status === "DELIVERED" || status === "PAYMENT_RECEIVED" || status === "DRAFT_RECEIVED") {
    return " sb-eta-panel__status--success";
  }
  if (status === "BUILDING_CONCEPTS" || status === "READY_FOR_REVIEW") {
    return " sb-eta-panel__status--active";
  }
  return "";
}

export default function EtaNextUpdatePanel({
  snapshot,
  statusLabel,
  status,
  estimatedFirstConcepts,
  hasCampaign,
}: Props) {
  return (
    <section className="sb-eta-panel" aria-labelledby="sb-eta-title">
      <p id="sb-eta-title" className="sb-card__tab">
        {copy.heading}
      </p>

      {hasCampaign ? (
        <dl className="sb-eta-panel__list">
          <div className="sb-eta-panel__row">
            <dt>{copy.currentStatus}</dt>
            <dd className={`sb-eta-panel__status${statusTone(status)}`}>{statusLabel}</dd>
          </div>
          <div className="sb-eta-panel__row">
            <dt>{copy.estimatedCompletion}</dt>
            <dd>{snapshot.estimatedCompletion}</dd>
          </div>
          <div className="sb-eta-panel__row">
            <dt>{copy.estimatedFirstConcepts}</dt>
            <dd>{estimatedFirstConcepts ?? "—"}</dd>
          </div>
          <div className="sb-eta-panel__row">
            <dt>{copy.nextUpdate}</dt>
            <dd>{snapshot.nextUpdate}</dd>
          </div>
        </dl>
      ) : (
        <p className="sb-eta-panel__empty">{copy.emptyHint}</p>
      )}
    </section>
  );
}
