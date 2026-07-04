import { redirect } from "next/navigation";

import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";

/** Legacy Studio Plan Review — quarantined; Route Map is the active front door. */
export default function StudioPlanReviewLegacyPage() {
  redirect(legacyRouteQuarantineV1.quarantineTarget);
}
