import { redirect } from "next/navigation";

/** Legacy Build Your Project route: sealed from the customer journey. */
export default function ProjectBuilderPage() {
  redirect("/studio-conversation-room");
}
