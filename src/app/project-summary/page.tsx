import { redirect } from "next/navigation";

import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";

/** Legacy Project Summary — quarantined; Route Map is the active front door. */
export default function ProjectSummaryLegacyPage() {
  redirect(legacyRouteQuarantineV1.quarantineTarget);
}
