"use client";

import Link from "next/link";

import { ownerConsole } from "@/config/owner-console";
import type { OwnerConsoleScanView } from "@/lib/campaign-tasks/owner-console-scan-view";

import FileRoomSectionCard from "./FileRoomSectionCard";

type FileRoomOwnerConsoleScanSectionProps = {
  scan: OwnerConsoleScanView;
  defaultOpen?: boolean;
};

export default function FileRoomOwnerConsoleScanSection({
  scan,
  defaultOpen = false,
}: FileRoomOwnerConsoleScanSectionProps) {
  if (scan.totalItems === 0) return null;

  return (
    <FileRoomSectionCard title={ownerConsole.scanSectionTitle}>
      <p className="fr-header__meta">{ownerConsole.scanSectionLead}</p>
      <div className="fr-owner-console-scan">
        {scan.buckets.map((bucket) => (
          <details
            key={bucket.id}
            className="fr-owner-console-scan__bucket"
            open={defaultOpen && !bucket.isEmpty}
          >
            <summary className="fr-owner-console-scan__summary">
              <span className="fr-owner-console-scan__title">{bucket.title}</span>
              <span className="fr-owner-console-scan__count">{bucket.items.length}</span>
            </summary>
            <p className="fr-owner-console-scan__description">{bucket.description}</p>
            {bucket.isEmpty ? (
              <p className="fr-tasks-empty__body">{ownerConsole.scanEmptyBucket}</p>
            ) : (
              <ul className="fr-owner-console-scan__list">
                {bucket.items.map((item) => (
                  <li key={item.id} className="fr-owner-console-scan__item">
                    <div>
                      <span className="fr-owner-console-scan__item-campaign">
                        {item.campaignName}
                      </span>
                      <span className="fr-owner-console-scan__item-title">{item.title}</span>
                      <span className="fr-owner-console-scan__item-meta">{item.subtitle}</span>
                    </div>
                    {item.drillDownHref ? (
                      <Link className="utility-btn" href={item.drillDownHref}>
                        {ownerConsole.openCampaignLabel}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
      </div>
    </FileRoomSectionCard>
  );
}
