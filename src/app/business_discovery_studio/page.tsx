import { redirect } from "next/navigation";

/** Legacy Discovery URL variant — use the current Route Map front door. */
export default function BusinessDiscoveryStudioAliasPage() {
  redirect("/route-map");
}
