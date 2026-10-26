import { redirect } from "next/navigation";

import StudioHomepageLobby from "@/components/studio-homepage/StudioHomepageLobby";
import { studioBuildManrope } from "@/fonts/studio-build-manrope";
import { isStudioGuideConversationEnabled } from "@/config/studio-guide-conversation-v1";
import { buildLobbyGuideBoot } from "@/lib/studio-guide-lobby-boot";
import { withStudioPaymentSandboxQuery } from "@/lib/studio-payment/sandbox-query";

type StudioHomepageLobbyRouteProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Production Home / Lobby — Page 1 only.
 * `?guide=1` still hands off to the existing Conversation Room.
 */
export default async function StudioHomepageLobbyRoute({
  searchParams,
}: StudioHomepageLobbyRouteProps) {
  const params = await searchParams;
  const boot = buildLobbyGuideBoot(params, isStudioGuideConversationEnabled());
  const paymentSandbox = firstParam(params.studioPaymentSandbox) === "1";
  const sandboxSearch = paymentSandbox ? "?studioPaymentSandbox=1" : "";

  if (boot.guideOpen) {
    redirect(
      withStudioPaymentSandboxQuery("/studio-conversation-room", sandboxSearch),
    );
  }

  return (
    <main className={`${studioBuildManrope.variable} ${studioBuildManrope.className} studio-homepage-main`}>
      <StudioHomepageLobby />
    </main>
  );
}
