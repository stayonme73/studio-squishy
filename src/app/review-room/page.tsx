import { redirect } from "next/navigation";

/** Review Room — compatibility redirect to Feedback Studio (canonical review surface). */
export default function ReviewRoomPage() {
  redirect("/feedback-studio");
}
