import type { Metadata } from "next";

import FinalDeliveryRoom from "@/components/studio-final-delivery-room/FinalDeliveryRoom";
import { studioFinalDeliveryRoomV1 as room } from "@/config/studio-final-delivery-room-v1";

export const metadata: Metadata = {
  title: "Final Delivery Room — Clip proof",
  description:
    "Owner-authorized Final Delivery Room proof using the accepted Clip Repurposing package. Live /deliverables is not replaced.",
};

export default function FinalDeliveryRoomPage() {
  return <FinalDeliveryRoom />;
}

export const dynamic = "force-static";

void room;
