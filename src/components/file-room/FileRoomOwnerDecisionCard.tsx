"use client";

import { ownerConsole } from "@/config/owner-console";
import type { OwnerConsoleDecisionCard } from "@/lib/campaign-tasks/owner-console-view";

type FileRoomOwnerDecisionCardProps = {
  card: OwnerConsoleDecisionCard;
  selected: boolean;
  compact?: boolean;
  onSelect: () => void;
};

export default function FileRoomOwnerDecisionCard({
  card,
  selected,
  compact = false,
  onSelect,
}: FileRoomOwnerDecisionCardProps) {
  const { fieldLabels } = ownerConsole;

  if (compact) {
    return (
      <button
        type="button"
        className={`fr-owner-console-queue__item${selected ? " fr-owner-console-queue__item--selected" : ""}`}
        onClick={onSelect}
      >
        <span className="fr-owner-console-queue__campaign">{card.campaignName}</span>
        <span className="fr-owner-console-queue__title">{card.row.title}</span>
        <span className="fr-owner-console-queue__meta">
          {card.row.kindLabel} · {card.ageLabel}
        </span>
      </button>
    );
  }

  return (
    <article className="fr-owner-console-card" aria-labelledby={`owner-card-${card.id}`}>
      <header className="fr-owner-console-card__head">
        <div>
          <p className="fr-owner-console-card__campaign">
            {ownerConsole.campaignLabel}: {card.campaignName}
            {card.businessLabel ? ` · ${card.businessLabel}` : null}
          </p>
          <h3 id={`owner-card-${card.id}`} className="fr-owner-console-card__title">
            {card.row.title}
          </h3>
        </div>
        <p className="fr-owner-console-card__age">
          {ownerConsole.ageLabel}: {card.ageLabel}
        </p>
      </header>

      <dl className="fr-owner-console-card__fields">
        <div className="fr-owner-console-card__field">
          <dt>{fieldLabels.whatHappened}</dt>
          <dd>{card.whatHappened}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{fieldLabels.whyOwner}</dt>
          <dd>{card.whyOwner}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{fieldLabels.recommendedNextAction}</dt>
          <dd>{card.recommendedNextAction}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{fieldLabels.impactIfNoAction}</dt>
          <dd>{card.impactIfNoAction}</dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{fieldLabels.availableActions}</dt>
          <dd>
            {card.availableActions.length > 0
              ? card.availableActions.map((action) => action.label).join(" · ")
              : "No actions available"}
          </dd>
        </div>
        <div className="fr-owner-console-card__field">
          <dt>{fieldLabels.whereWorkGoesAfter}</dt>
          <dd>{card.whereWorkGoesAfter}</dd>
        </div>
      </dl>

      {card.row.taskTitle ? (
        <p className="fr-owner-console-card__meta">
          Linked task: {card.row.taskTitle}
          {card.row.assigneeDisplayName
            ? ` · Assigned to ${card.row.assigneeDisplayName}`
            : null}
        </p>
      ) : null}
    </article>
  );
}
