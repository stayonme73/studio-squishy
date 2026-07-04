import { redirect } from "next/navigation";

import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";

/** Legacy Project Details wizard — quarantined; use Route Map service-specific intake. */
export default function ProjectDetailsLegacyPage() {
  redirect(legacyRouteQuarantineV1.activeIntake);
}
