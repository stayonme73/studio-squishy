import { redirect } from "next/navigation";

import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";

/** Legacy standalone Secure Checkout shell: certified payment lives in Conversation Room. */
export default function SecureCheckoutPageSceneRedirect() {
  redirect(legacyRouteQuarantineV1.activeCheckout);
}
