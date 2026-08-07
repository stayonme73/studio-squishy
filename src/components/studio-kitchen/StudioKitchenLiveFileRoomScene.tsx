"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import StudioKitchenHeader from "@/components/studio-kitchen/StudioKitchenHeader";
import StudioKitchenLiveBucketSlot from "@/components/studio-kitchen/StudioKitchenLiveBucketSlot";
import StudioKitchenLiveDrawer from "@/components/studio-kitchen/StudioKitchenLiveDrawer";
import { studioKitchenFoundation } from "@/config/studio-kitchen-foundation-v1";
import { studioKitchen } from "@/config/studio-kitchen";
import {
  buildKitchenLiveFileRoomView,
  type KitchenProjectionBoard,
} from "@/lib/studio-kitchen";

type Props = {
  board: KitchenProjectionBoard;
};

export default function StudioKitchenLiveFileRoomScene({ board }: Props) {
  const copy = studioKitchenFoundation.page;
  const view = useMemo(() => buildKitchenLiveFileRoomView(board), [board]);
  const [drawerCampaignId, setDrawerCampaignId] = useState<string | null>(null);

  const drawerFolder = useMemo(() => {
    if (!drawerCampaignId) return null;
    return view.folders.find((folder) => folder.campaignId === drawerCampaignId) ?? null;
  }, [drawerCampaignId, view.folders]);

  const handleOpenFolder = useCallback((campaignId: string) => {
    setDrawerCampaignId(campaignId);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerCampaignId(null);
  }, []);

  return (
    <div className="sk-page utility-page" aria-label="Studio Kitchen File Room">
      <StudioKitchenHeader
        backHref={studioKitchen.page.backHref}
        backLabel={studioKitchen.page.backLabel}
        lead={copy.lead}
        aside={
          <p className="sk-intro__phase" role="note">
            {copy.phaseNote}
          </p>
        }
      />

      <div className="sk-file-room">
        {board.sourceMode === "fixture_demo" ? (
          <p className="utility-card" role="status" data-kitchen-source="fixture_demo">
            {copy.fixtureBadge}
          </p>
        ) : null}

        {board.sourceMode === "live_production" ? (
          <p className="utility-card" role="status" data-kitchen-source="live_production">
            {copy.liveBadge} — {board.liveCampaignCount} campaign
            {board.liveCampaignCount === 1 ? "" : "s"} from server production records.
          </p>
        ) : null}

        {board.sourceMode === "empty" ? (
          <section className="utility-card" aria-labelledby="sk-empty-title">
            <h2 id="sk-empty-title">{copy.emptyTitle}</h2>
            <p>{copy.emptyBody}</p>
            <p>{copy.emptyFixtureHint}</p>
            <p>
              <Link href="/studio-kitchen?demo=1" className="utility-btn utility-btn--secondary">
                Show fixture demo
              </Link>
            </p>
          </section>
        ) : (
          <section className="sk-file-room__wall utility-card" aria-labelledby="sk-file-room-title">
            <h2 id="sk-file-room-title" className="sk-file-room__title">
              {studioKitchen.fileRoom.title}
            </h2>
            <p className="sk-file-room__lead">{copy.projectionNote}</p>

            <div className="sk-file-room__buckets">
              {view.buckets.map((slot) => (
                <StudioKitchenLiveBucketSlot
                  key={slot.bucketId}
                  slot={slot}
                  onOpenFolder={handleOpenFolder}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {drawerFolder ? (
        <StudioKitchenLiveDrawer folder={drawerFolder} onClose={handleCloseDrawer} />
      ) : null}
    </div>
  );
}
