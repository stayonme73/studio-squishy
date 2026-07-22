import { redirect } from "next/navigation";

/** Legacy Draft Room — quarantined from the client journey. */
export default function DraftRoomPage() {
  redirect("/studio-conversation-room?stage=intake");
}
