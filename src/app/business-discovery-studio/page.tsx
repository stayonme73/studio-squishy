import { redirect } from "next/navigation";

/** Legacy Discovery / Submit Project route — quarantined from the client journey. */
export default function BusinessDiscoveryStudioPage() {
  redirect("/route-map");
}
