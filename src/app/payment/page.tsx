import { redirect } from "next/navigation";

/** Legacy standalone Secure Checkout — quarantined; canonical route is /checkout. */
export default function PaymentLegacyPage() {
  redirect("/studio-conversation-room?stage=checkout");
}
