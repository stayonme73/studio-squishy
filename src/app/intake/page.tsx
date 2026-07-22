import { redirect } from "next/navigation";

/** Legacy intake route — quarantined from the client journey. */
export default function IntakePage() {
  redirect("/studio-conversation-room?stage=intake");
}
