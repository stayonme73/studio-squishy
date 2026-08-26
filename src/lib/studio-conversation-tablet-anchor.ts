/** Shared tablet target so Samsung Session links can native-scroll even if React click is late. */
export const CONVERSATION_ROOM_TABLET_ID = "conversation-room-tablet" as const;
export const CONVERSATION_ROOM_TABLET_HREF = `#${CONVERSATION_ROOM_TABLET_ID}` as const;

/** Bring the Presentation tablet into view after Session controls fire. */
export function revealConversationTablet(): void {
  if (typeof document === "undefined") return;
  const node = document.getElementById(CONVERSATION_ROOM_TABLET_ID);
  window.requestAnimationFrame(() => {
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
