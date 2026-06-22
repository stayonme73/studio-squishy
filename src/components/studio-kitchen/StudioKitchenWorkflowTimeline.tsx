import Link from "next/link";

import StudioKitchenBucketBadge from "@/components/studio-kitchen/StudioKitchenBucketBadge";
import StudioKitchenClientContactBlock from "@/components/studio-kitchen/StudioKitchenClientContactBlock";
import StudioKitchenDeliverablesCell from "@/components/studio-kitchen/StudioKitchenDeliverablesCell";
import StudioKitchenPriorityBadge from "@/components/studio-kitchen/StudioKitchenPriorityBadge";
import {
  kitchenFormatRevisionStatus,
  kitchenIsClientDelayed,
  kitchenRemainingRevisions,
  kitchenStageDefinitions,
  studioKitchen,
  type KitchenCampaign,
  type KitchenStageId,
} from "@/config/studio-kitchen";
import {
  formatKitchenDaysInStage,
  formatKitchenWaitingDays,
  type KitchenCampaignWithBucket,
  type KitchenStageRow,
} from "@/lib/studio-kitchen-view";

type Props = {
  campaign: KitchenCampaign;
  stages: KitchenStageRow[];
};

function stageDefinition(stageId: KitchenStageId) {
  return kitchenStageDefinitions.find((s) => s.id === stageId);
}

function TimestampBlock({ label, timestamp }: { label: string; timestamp: { date: string; time: string } }) {
  return (
    <div className="sk-ts">
      <p className="sk-ts__label">{label}</p>
      <p className="sk-ts__date">{timestamp.date}</p>
      <p className="sk-ts__time">{timestamp.time}</p>
    </div>
  );
}

export default function StudioKitchenWorkflowTimeline({ campaign, stages }: Props) {
  const { detail } = studioKitchen;

  return (
    <section className="sk-workflow-timeline utility-card" aria-labelledby="sk-workflow-title">
      <h2 id="sk-workflow-title" className="sk-workflow-timeline__title">
        {detail.workflowTitle}
      </h2>

      <ol className="sk-workflow-timeline__list">
        {stages.map((stage, index) => {
          const def = stageDefinition(stage.stageId);
          const isCurrent = stage.state === "current";
          const isCompleted = stage.state === "completed";
          const action = def?.action;

          return (
            <li
              key={stage.stageId}
              className={`sk-workflow-step sk-workflow-step--${stage.state}`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <div className="sk-workflow-step__marker" aria-hidden="true">
                <span className="sk-workflow-step__num">{index + 1}</span>
              </div>

              <div className="sk-workflow-step__body">
                <header className="sk-workflow-step__head">
                  <h3 className="sk-workflow-step__title">{stage.title}</h3>
                  <span className={`sk-workflow-step__badge sk-workflow-step__badge--${stage.state}`}>
                    {isCompleted ? "Completed" : isCurrent ? "Current" : "Pending"}
                  </span>
                </header>

                <p className="sk-workflow-step__summary">{stage.summary}</p>

                {(isCurrent || isCompleted) && (
                  <dl className="sk-workflow-step__meta">
                    <div className="sk-workflow-step__meta-row">
                      <dt>Status</dt>
                      <dd>{isCurrent ? campaign.statusLabel : "Completed"}</dd>
                    </div>
                    <div className="sk-workflow-step__meta-row">
                      <dt>Assigned</dt>
                      <dd>{campaign.assignedTo}</dd>
                    </div>
                    <div className="sk-workflow-step__meta-row">
                      <dt>{detail.waitingLabel}</dt>
                      <dd>{campaign.waitingOn}</dd>
                    </div>
                    {isCurrent ? (
                      <>
                        <div className="sk-workflow-step__meta-row">
                          <dt>{detail.daysLabel}</dt>
                          <dd>{formatKitchenWaitingDays(campaign.daysInStage)}</dd>
                        </div>
                        <div className="sk-workflow-step__meta-row">
                          <dt>Stage Entered</dt>
                          <dd>
                            {campaign.stageEnteredAt.date} · {campaign.stageEnteredAt.time}
                          </dd>
                        </div>
                      </>
                    ) : null}
                  </dl>
                )}

                {isCurrent && campaign.reviewNoticeSent ? (
                  <TimestampBlock label="Review Notice Sent" timestamp={campaign.reviewNoticeSent} />
                ) : null}

                {isCurrent && campaign.selectedDirection ? (
                  <div className="sk-workflow-step__note">
                    <span className="sk-workflow-step__note-label">Selected Direction</span>
                    <span>{campaign.selectedDirection}</span>
                  </div>
                ) : null}

                {(isCurrent || campaign.revisionsUsed > 0) && (
                  <div className="sk-workflow-step__revision">
                    <div className="sk-workflow-step__meta-row">
                      <span className="sk-workflow-step__note-label">{detail.revisionStatusLabel}</span>
                      <span>{kitchenFormatRevisionStatus(campaign)}</span>
                    </div>
                    {kitchenRemainingRevisions(campaign) > 0 ? (
                      <div className="sk-workflow-step__meta-row">
                        <span className="sk-workflow-step__note-label">{detail.revisionRemainingLabel}</span>
                        <span>{kitchenRemainingRevisions(campaign)}</span>
                      </div>
                    ) : null}
                  </div>
                )}

                {isCurrent && action ? (
                  <div className="sk-workflow-step__actions">
                    {action.href && !action.phase1Stub ? (
                      <Link href={action.href} className="utility-btn utility-btn--primary sk-workflow-step__btn">
                        {action.label}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="utility-btn utility-btn--primary sk-workflow-step__btn sk-workflow-step__btn--stub"
                        aria-disabled="true"
                        title="Phase 2 — automation not wired yet"
                      >
                        {action.label}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function StudioKitchenCampaignMeta({ campaign }: { campaign: KitchenCampaignWithBucket }) {
  const { detail, table } = studioKitchen;
  const clientDelayed = kitchenIsClientDelayed(campaign);

  return (
    <section className="sk-campaign-meta utility-card" aria-label="Campaign overview">
      <div className="sk-campaign-meta__badges">
        <StudioKitchenPriorityBadge priority={campaign.priority} />
        <StudioKitchenBucketBadge bucketId={campaign.bucketId} />
        {clientDelayed ? (
          <span className="sk-badge sk-badge--client-delayed">{table.clientDelayedBadge}</span>
        ) : null}
      </div>

      <dl className="sk-campaign-meta__grid">
        <div>
          <dt>{detail.nextActionLabel}</dt>
          <dd>{campaign.nextAction}</dd>
        </div>
        <div>
          <dt>{detail.waitingLabel}</dt>
          <dd>{campaign.waitingOn}</dd>
        </div>
        <div>
          <dt>{detail.revisionStatusLabel}</dt>
          <dd>{kitchenFormatRevisionStatus(campaign)}</dd>
        </div>
        <div>
          <dt>{detail.daysLabel}</dt>
          <dd>{formatKitchenDaysInStage(campaign.daysInStage)}</dd>
        </div>
        <div>
          <dt>{detail.stageEnteredLabel}</dt>
          <dd>
            {campaign.stageEnteredAt.date}
            <br />
            {campaign.stageEnteredAt.time}
          </dd>
        </div>
        <div>
          <dt>Assigned To</dt>
          <dd>{campaign.assignedTo}</dd>
        </div>
        <div>
          <dt>Last Updated</dt>
          <dd>
            {campaign.lastUpdated.date}
            <br />
            {campaign.lastUpdated.time}
          </dd>
        </div>
      </dl>

      <div className="sk-campaign-meta__deliverables">
        <h3 className="sk-campaign-meta__subhead">{detail.deliverablesTitle}</h3>
        <StudioKitchenDeliverablesCell deliverables={campaign.deliverables} />
      </div>

      {campaign.reviewNoticeSent || campaign.lastContactDate ? (
        <div className="sk-campaign-meta__client">
          <h3 className="sk-campaign-meta__subhead">{detail.clientContactTitle}</h3>
          <StudioKitchenClientContactBlock campaign={campaign} />
        </div>
      ) : null}
    </section>
  );
}
