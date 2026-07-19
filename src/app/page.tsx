import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import WelcomeHallStaticScene from "@/components/entrance/WelcomeHallStaticScene";
import { LOBBY_ENTRY_CHOICE_COOKIE } from "@/config/studio-lobby-entry-v1";
import { isStudioGuideConversationEnabled } from "@/config/studio-guide-conversation-v1";
import { buildLobbyGuideBoot } from "@/lib/studio-guide-lobby-boot";

import "./mobile-route-fixes.css";

type StudioLobbyRootPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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

  const jar = await cookies();
  const initialChoseNew =
    jar.get(LOBBY_ENTRY_CHOICE_COOKIE)?.value === "new-to-studio";

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <WelcomeHallStaticScene initialChoseNew={initialChoseNew} />
    </main>
  );
}
