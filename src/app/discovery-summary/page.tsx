import { redirect } from "next/navigation";

import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";

/** Legacy Discovery Summary — quarantined; Route Map is the active front door. */
export default function DiscoverySummaryLegacyPage() {
  redirect(legacyRouteQuarantineV1.quarantineTarget);
}
