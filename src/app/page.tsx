import { redirect } from "next/navigation";

import WelcomeHallStaticScene from "@/components/entrance/WelcomeHallStaticScene";
import { isStudioGuideConversationEnabled } from "@/config/studio-guide-conversation-v1";
import { buildLobbyGuideBoot } from "@/lib/studio-guide-lobby-boot";

import "./mobile-route-fixes.css";

type StudioLobbyRootPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Studio Lobby — `/studio-lobby` is the named route; `/` renders the same entry.
 * Old Lobby Guide overlay (`?guide=1`) is retired → Conversation Room.
 */
export default async function StudioLobbyRootPage({
  searchParams,
}: StudioLobbyRootPageProps) {
  const params = await searchParams;
  const boot = buildLobbyGuideBoot(params, isStudioGuideConversationEnabled());

  if (boot.guideOpen) {
    redirect("/studio-conversation-room");
  }

  /** Only explicit begin-new handoff unlocks in HTML — never a stale cookie alone. */
  const initialChoseNew = firstParam(params.lobbyEntry) === "new";

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <WelcomeHallStaticScene initialChoseNew={initialChoseNew} />
    </main>
  );
}
