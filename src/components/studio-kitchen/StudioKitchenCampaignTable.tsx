"use client";

import { Fragment } from "react";

import StudioKitchenBucketBadge from "@/components/studio-kitchen/StudioKitchenBucketBadge";
import StudioKitchenClientContactBlock from "@/components/studio-kitchen/StudioKitchenClientContactBlock";
import StudioKitchenDeliverablesCell from "@/components/studio-kitchen/StudioKitchenDeliverablesCell";
import StudioKitchenPriorityBadge from "@/components/studio-kitchen/StudioKitchenPriorityBadge";
import {
  kitchenFormatRevisionStatus,
  kitchenIsClientDelayed,
  kitchenStageTitle,
  studioKitchen,
} from "@/config/studio-kitchen";
import {
  formatKitchenDaysInStage,
  type KitchenCampaignWithBucket,
  type KitchenTableGroup,
} from "@/lib/studio-kitchen-view";

type Props = {
  tableGroups: KitchenTableGroup[];
  onOpenCampaign: (campaignId: string) => void;
};

function CampaignRow({
  campaign,
  onOpenCampaign,
}: {
  campaign: KitchenCampaignWithBucket;
  onOpenCampaign: (campaignId: string) => void;
}) {
  const { table } = studioKitchen;
  const clientDelayed = kitchenIsClientDelayed(campaign);

  return (
    <tr>
      <td>
        <StudioKitchenPriorityBadge priority={campaign.priority} />
      </td>
      <td>
        <StudioKitchenBucketBadge bucketId={campaign.bucketId} />
      </td>
      <td className="sk-table__name">{campaign.campaignName}</td>
      <td>{campaign.clientName}</td>
      <td>
        <div className="sk-table__stage-cell">
          <span>{kitchenStageTitle(campaign.currentStageId)}</span>
          {clientDelayed ? (
            <span className="sk-badge sk-badge--client-delayed">{table.clientDelayedBadge}</span>
          ) : null}
        </div>
      </td>
      <td className="sk-table__next-action">{campaign.nextAction}</td>
      <td>
        <StudioKitchenDeliverablesCell deliverables={campaign.deliverables} compact />
      </td>
      <td className="sk-table__revision">{kitchenFormatRevisionStatus(campaign)}</td>
      <td>
        <StudioKitchenClientContactBlock campaign={campaign} />
      </td>
      <td>{campaign.waitingOn}</td>
      <td>{formatKitchenDaysInStage(campaign.daysInStage)}</td>
      <td className="sk-table__updated">
        <span>{campaign.stageEnteredAt.date}</span>
        <span className="sk-table__updated-time">{campaign.stageEnteredAt.time}</span>
      </td>
      <td className="sk-table__updated">
        <span>{campaign.lastUpdated.date}</span>
        <span className="sk-table__updated-time">{campaign.lastUpdated.time}</span>
      </td>
      <td>
        <button
          type="button"
          className="utility-btn utility-btn--primary sk-table__open"
          onClick={() => onOpenCampaign(campaign.id)}
        >
          {table.openLabel}
        </button>
      </td>
    </tr>
  );
}

export default function StudioKitchenCampaignTable({ tableGroups, onOpenCampaign }: Props) {
  const { table } = studioKitchen;
  const columnCount = 14;

  return (
    <section className="sk-table-section utility-card" aria-labelledby="sk-table-title">
      <h2 id="sk-table-title" className="sk-table-section__title">
        {table.title}
      </h2>
      <p className="sk-table-section__lead">{table.groupedByBucketNote}</p>

      <div className="sk-table-wrap">
        <table className="sk-table">
          <thead>
            <tr>
              <th scope="col">{table.columns.priority}</th>
              <th scope="col">{table.columns.bucket}</th>
              <th scope="col">{table.columns.campaignName}</th>
              <th scope="col">{table.columns.clientName}</th>
              <th scope="col">{table.columns.currentStage}</th>
              <th scope="col">{table.columns.nextAction}</th>
              <th scope="col">{table.columns.deliverables}</th>
              <th scope="col">{table.columns.revisionStatus}</th>
              <th scope="col">{table.columns.clientContact}</th>
              <th scope="col">{table.columns.waitingOn}</th>
              <th scope="col">{table.columns.daysInStage}</th>
              <th scope="col">{table.columns.stageEntered}</th>
              <th scope="col">{table.columns.lastUpdated}</th>
              <th scope="col">
                <span className="sk-sr-only">{table.columns.open}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {tableGroups.map((group, groupIndex) => {
              const showGroupHeader =
                groupIndex === 0 || tableGroups[groupIndex - 1].groupId !== group.groupId;

              return (
                <Fragment key={group.bucketId}>
                  {showGroupHeader ? (
                    <tr className="sk-table__group-row">
                      <th scope="rowgroup" colSpan={columnCount}>
                        {group.groupTitle}
                      </th>
                    </tr>
                  ) : null}
                  <tr className="sk-table__bucket-row">
                    <td colSpan={columnCount}>
                      <StudioKitchenBucketBadge bucketId={group.bucketId} />
                      <span className="sk-table__bucket-count">{group.campaigns.length}</span>
                    </td>
                  </tr>
                  {group.campaigns.map((campaign) => (
                    <CampaignRow
                      key={campaign.id}
                      campaign={campaign}
                      onOpenCampaign={onOpenCampaign}
                    />
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
