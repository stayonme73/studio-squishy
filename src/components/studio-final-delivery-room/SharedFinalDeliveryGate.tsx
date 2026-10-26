"use client";

import type { ReactNode } from "react";

import FinalDeliveryRoom from "@/components/studio-final-delivery-room/FinalDeliveryRoom";
import type { CampaignRecord } from "@/config/studio-board";
import {
  buildReleasedDeliveryPresentation,
  selectReleasedDeliveryJob,
} from "@/lib/studio-final-delivery-room/shared-delivery";
import { useFinalDelivery } from "@/lib/use-final-delivery";

type Props = {
  campaign?: CampaignRecord | null;
  /** Present on the delivery URL so the release check does not wait for a second campaign fetch. */
  campaignId?: string | null;
  jobId?: string | null;
  fallback: ReactNode;
};

/**
 * Shared conveyor door. The room opens only when this campaign's job is actually released.
 * Other states keep the existing delivery host.
 */
export default function SharedFinalDeliveryGate({ campaign, campaignId, jobId, fallback }: Props) {
  const id = campaign?.campaignId ?? campaignId ?? undefined;
  const { state } = useFinalDelivery(id);
  const waiting = (
    <div className="utility-page" aria-busy="true">
      <div className="utility-shell utility-shell--loading" />
    </div>
  );

  if (!id || state.status === "idle" || state.status === "loading") return waiting;

  if (state.status === "ready" && state.delivery.state === "ready") {
    const job = selectReleasedDeliveryJob(state.delivery.jobs, jobId);
    const released = job
      ? buildReleasedDeliveryPresentation({
          campaignId: id,
          campaignName: state.delivery.campaignName || campaign?.campaignName || "",
          job,
        })
      : null;
    if (released) return <FinalDeliveryRoom released={released} live />;
  }

  if (!campaign) return waiting;
  return <>{fallback}</>;
}
