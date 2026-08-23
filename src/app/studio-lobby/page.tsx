import { redirect } from "next/navigation";

import WelcomeHallStaticScene from "@/components/entrance/WelcomeHallStaticScene";
import { isStudioGuideConversationEnabled } from "@/config/studio-guide-conversation-v1";
import { buildLobbyGuideBoot } from "@/lib/studio-guide-lobby-boot";
import { withStudioPaymentSandboxQuery } from "@/lib/studio-payment/sandbox-query";

import "../mobile-route-fixes.css";

type StudioLobbyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Studio Lobby — kiosk starts the Conversation Room when Guide is enabled.
 * Old Lobby Guide overlay (`?guide=1`) is retired → Conversation Room.
 */
export default async function StudioLobbyPage({
  searchParams,
}: StudioLobbyPageProps) {
  const params = await searchParams;
  const boot = buildLobbyGuideBoot(params, isStudioGuideConversationEnabled());
  const paymentSandbox = firstParam(params.studioPaymentSandbox) === "1";
  const sandboxSearch = paymentSandbox ? "?studioPaymentSandbox=1" : "";

  if (boot.guideOpen) {
    redirect(
      withStudioPaymentSandboxQuery("/studio-conversation-room", sandboxSearch),
    );
  }

  const initialChoseNew = firstParam(params.lobbyEntry) === "new";

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <WelcomeHallStaticScene
        initialChoseNew={initialChoseNew}
        paymentSandbox={paymentSandbox}
      />
    </main>
  );
}
