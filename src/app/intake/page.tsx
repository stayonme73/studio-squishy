import { redirect } from "next/navigation";

/** Legacy route — same as /draft-room. */
export default function IntakePage() {
  redirect("/draft-room");
}