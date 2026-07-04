import { redirect } from "next/navigation";

import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";

/** Legacy Studio Guide — quarantined; Route Map is the active front door. */
export default function StudioGuideLegacyPage() {
  redirect(legacyRouteQuarantineV1.quarantineTarget);
}
