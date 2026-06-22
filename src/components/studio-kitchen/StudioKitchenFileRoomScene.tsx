"use client";

import { useCallback, useMemo, useState } from "react";

import StudioKitchenBucketSlot from "@/components/studio-kitchen/StudioKitchenBucketSlot";
import StudioKitchenCampaignDrawer from "@/components/studio-kitchen/StudioKitchenCampaignDrawer";
import StudioKitchenHeader from "@/components/studio-kitchen/StudioKitchenHeader";
import StudioKitchenPriorityAlerts from "@/components/studio-kitchen/StudioKitchenPriorityAlerts";
import { studioKitchen } from "@/config/studio-kitchen";
import { buildKitchenFileRoomView, getKitchenFolder } from "@/lib/studio-kitchen-file-room-view";
import { withKitchenBucket } from "@/lib/studio-kitchen-view";

const { page, fileRoom } = studioKitchen;

/** Studio Kitchen V4 — digital campaign file room. */
export default function StudioKitchenFileRoomScene() {
  const view = useMemo(() => buildKitchenFileRoomView(), []);
  const [drawerCampaignId, setDrawerCampaignId] = useState<string | null>(null);

  const drawerFolder = useMemo(() => {
    if (!drawerCampaignId) return null;
    const folder = getKitchenFolder(drawerCampaignId);
    if (!folder) return null;
    return withKitchenBucket(folder);
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
            Open folder → perform action → move folder. Folders returning from a tray re-enter at the
            back of the queue.
          </p>

          <div className="sk-file-room__buckets">
            {view.buckets.map((slot) => (
              <StudioKitchenBucketSlot key={slot.bucketId} slot={slot} onOpenFolder={handleOpenFolder} />
            ))}
          </div>
        </section>
      </div>

      {drawerFolder ? (
        <StudioKitchenCampaignDrawer campaign={drawerFolder} onClose={handleCloseDrawer} />
      ) : null}
    </div>
  );
}
