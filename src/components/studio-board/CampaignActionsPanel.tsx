import Link from "next/link";

import { studioBoard } from "@/config/studio-board";
import type { BoardCampaignAction } from "@/lib/studio-board-view";

const { campaignActions: copy } = studioBoard;

type Props = {
  actions: readonly BoardCampaignAction[];
  message: string | null;
  currentAction: string | null;
  lastUpdated: string | null;
  hasCampaign: boolean;
};

export default function CampaignActionsPanel({
  actions,
  message,
  currentAction,
  lastUpdated,
  hasCampaign,
}: Props) {
  const actionLabel =
    currentAction ??
    (actions.find((action) => action.isPrimary)?.label ?? actions[0]?.label ?? null);

  return (
    <section className="sb-actions-panel" aria-labelledby="sb-actions-title">
      <p id="sb-actions-title" className="sb-card__tab">
        {copy.heading}
      </p>

      {hasCampaign ? (
        <dl className="sb-actions-panel__list">
          <div className="sb-actions-panel__row sb-actions-panel__row--primary">
            <dt>{copy.currentAction}</dt>
            <dd className="sb-actions-panel__action">{actionLabel ?? copy.noActionsHint}</dd>
          </div>
          <div className="sb-actions-panel__row">
            <dt>{copy.assignedTo}</dt>
            <dd>{copy.assignedTeam}</dd>
          </div>
          <div className="sb-actions-panel__row">
            <dt>{copy.lastUpdated}</dt>
            <dd>{lastUpdated ?? "—"}</dd>
          </div>
        </dl>
      ) : (
        <p className="sb-actions__empty">{copy.noActionsHint}</p>
      )}

      {actions.length > 0 ? (
        <div className="sb-actions__list" role="list">
          {actions.map((action) => (
            <div key={action.id} role="listitem">
              <Link
                href={action.href}
                className={`sb-action${action.isPrimary ? " sb-action--primary" : " sb-action--secondary"}`}
              >
                {action.label} →
              </Link>
            </div>
          ))}
        </div>
      ) : message && !hasCampaign ? (
        <p className="sb-actions__status">{message}</p>
      ) : null}
    </section>
  );
}
