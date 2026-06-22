"use client";

import { useCallback, useMemo, useState } from "react";

import StudioKitchenBucketSlot from "@/components/studio-kitchen/StudioKitchenBucketSlot";
import StudioKitchenCampaignDrawer from "@/components/studio-kitchen/StudioKitchenCampaignDrawer";
import StudioKitchenHeader from "@/components/studio-kitchen/StudioKitchenHeader";
import StudioKitchenPriorityAlerts from "@/components/studio-kitchen/StudioKitchenPriorityAlerts";
import { studioKitchen } from "@/config/studio-kitchen";
import { buildKitchenFileRoomView, getKitchenFolder } from "@/lib/studio-kitchen-file-room-view";

const { page, fileRoom } = studioKitchen;

/** Studio Kitchen V5 — owner file room with stage-specific actions. */
export default function StudioKitchenFileRoomScene() {
  const view = useMemo(() => buildKitchenFileRoomView(), []);
  const [drawerCampaignId, setDrawerCampaignId] = useState<string | null>(null);

  const drawerFolder = useMemo(() => {
    if (!drawerCampaignId) return null;
    return getKitchenFolder(drawerCampaignId);
  }, [drawerCampaignId]);

  const handleOpenFolder = useCallback((campaignId: string) => {
    setDrawerCampaignId(campaignId);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerCampaignId(null);
  }, []);

  return (
    <div className="sk-page utility-page" aria-label="Studio Kitchen File Room">
      <StudioKitchenHeader
        backHref={page.backHref}
        backLabel={page.backLabel}
        lead={page.lead}
        aside={
          <p className="sk-intro__phase" role="note">
            {page.phaseNote}
          </p>
        }
      />

      <div className="sk-file-room">
        <StudioKitchenPriorityAlerts alerts={view.priorityAlerts} />

        <section className="sk-file-room__wall utility-card" aria-labelledby="sk-file-room-title">
          <h2 id="sk-file-room-title" className="sk-file-room__title">
            {fileRoom.title}
          </h2>
          <p className="sk-file-room__lead">
            {fileRoom.historyNote} Open folder → perform action → move folder.
          </p>

          <div className="sk-file-room__buckets">
            {view.buckets.map((slot) => (
              <StudioKitchenBucketSlot key={slot.bucketId} slot={slot} onOpenFolder={handleOpenFolder} />
            ))}
          </div>
        </section>
      </div>

      {drawerFolder ? (
        <StudioKitchenCampaignDrawer folder={drawerFolder} onClose={handleCloseDrawer} />
      ) : null}
    </div>
  );
}
