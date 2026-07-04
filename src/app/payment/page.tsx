import { redirect } from "next/navigation";

import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";

/** Legacy standalone Secure Checkout — quarantined; checkout lives in Route Map scene. */
export default function PaymentLegacyPage() {
  redirect(legacyRouteQuarantineV1.quarantineTarget);
}
