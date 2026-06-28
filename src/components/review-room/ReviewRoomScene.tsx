"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { studioBoard } from "@/config/studio-board";

/** Legacy Review Room entry — redirects to canonical Feedback Studio. */
export default function ReviewRoomScene() {
  const router = useRouter();

  useEffect(() => {
    router.replace(studioBoard.routes.feedbackStudio);
  }, [router]);

  return (
    <div className="utility-page utility-shell utility-shell--loading" aria-busy="true" aria-label="Redirecting to review" />
  );
}
