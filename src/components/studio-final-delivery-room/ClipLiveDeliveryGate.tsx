"use client";

import type { ReactNode } from "react";

import FinalDeliveryRoom from "@/components/studio-final-delivery-room/FinalDeliveryRoom";
import StudioExtrasPanel from "@/components/studio-extras/StudioExtrasPanel";
import type { CampaignRecord } from "@/config/studio-board";
import { studioExtrasCustomerCopy } from "@/config/studio-extras-v1";
import {
  isClipLiveDeliveryCandidate,
  resolveClipLiveDelivery,
} from "@/lib/studio-clip-repurposing-live-delivery";
import type { FinalRoomProof } from "@/lib/studio-final-delivery-room/content";
import { useFinalDelivery } from "@/lib/use-final-delivery";
import { useStudioExtras } from "@/lib/use-studio-extras";

type Props = {
  campaign: CampaignRecord;
  jobId?: string | null;
  fallback: ReactNode;
};

/** Studio Extras join the rail before Support, reusing the room's own tile and sheet. */
function withExtrasGroup(proof: FinalRoomProof): FinalRoomProof {
  const groups = [...proof.groups];
  const at = groups.findIndex((group) => group.id === "support");
  groups.splice(at < 0 ? groups.length : at, 0, {
    id: "extras",
    label: studioExtrasCustomerCopy.builderTitle,
    hint: "Included with your package",
  });
  return { ...proof, groups };
}

/** Clip-only live door. Other services keep the existing Final Delivery host. */
export default function ClipLiveDeliveryGate({ campaign, jobId, fallback }: Props) {
  const candidate = isClipLiveDeliveryCandidate(campaign, jobId);
  const { state } = useFinalDelivery(candidate ? campaign.campaignId : undefined);
  const { state: extrasState } = useStudioExtras(candidate ? campaign.campaignId : undefined);

  if (!candidate) return <>{fallback}</>;

  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="utility-page" aria-busy="true">
        <div className="utility-shell utility-shell--loading" />
      </div>
    );
  }

  if (state.status !== "ready") return <>{fallback}</>;

  const decision = resolveClipLiveDelivery({
    campaign,
    delivery: state.delivery,
    requestedJobId: jobId,
  });

  if (decision.kind !== "ready") return <>{fallback}</>;

  const hasExtras =
    extrasState.status === "ready" &&
    Boolean(
      extrasState.view?.extras.some(
        (extra) => extra.state === "delivered" || extra.state === "exhausted",
      ),
    );

  return (
    <FinalDeliveryRoom
      proof={hasExtras ? withExtrasGroup(decision.proof) : decision.proof}
      live
      extras={
        hasExtras ? (
          <StudioExtrasPanel campaignId={campaign.campaignId} placement="delivery" bare />
        ) : null
      }
    />
  );
}
