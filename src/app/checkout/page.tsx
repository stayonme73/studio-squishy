import { redirect } from "next/navigation";

import { legacyRouteQuarantineV1 } from "@/config/legacy-route-quarantine-v1";

/** Legacy standalone Secure Checkout route: certified payment lives in Conversation Room. */
export default function CheckoutPage() {
  redirect(legacyRouteQuarantineV1.activeCheckout);
}
