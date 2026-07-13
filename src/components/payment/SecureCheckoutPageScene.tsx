import { redirect } from "next/navigation";

/** Legacy standalone Secure Checkout shell — canonical room is /checkout. */
export default function SecureCheckoutPageSceneRedirect() {
  redirect("/checkout");
}
