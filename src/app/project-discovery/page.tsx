import { redirect } from "next/navigation";

/** Legacy Project Discovery alias — use the current Route Map front door. */
export default function ProjectDiscoveryAliasPage() {
  redirect("/studio-conversation-room");
}
