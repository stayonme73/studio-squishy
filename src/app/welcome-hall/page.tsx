import { redirect } from "next/navigation";

/** Legacy route — customer-facing name is Studio Lobby. */
export default function WelcomeHallRedirectPage() {
  redirect("/studio-lobby");
}
