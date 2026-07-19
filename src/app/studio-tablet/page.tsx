import { redirect } from "next/navigation";

import { studioConversationRoomV1 } from "@/config/studio-conversation-room-v1";

/**
 * Legacy Host route — Conversation Room is the permanent room name.
 * @see docs/studio-conversation-room-foundation-v1-locked.md
 */
export default function StudioTabletLegacyRedirectPage() {
  redirect(studioConversationRoomV1.route);
}
