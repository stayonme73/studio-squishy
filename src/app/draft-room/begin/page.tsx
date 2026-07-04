import { redirect } from "next/navigation";

/** Legacy Draft Room begin route — quarantined from the client journey. */
export default function DraftRoomBeginPage() {
  redirect("/route-map");
}
