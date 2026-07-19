"use client";

import { useLayoutEffect, useState, useCallback } from "react";

import GuideConversationPanel from "@/components/studio-guide/GuideConversationPanel";
import { isStudioGuideConversationEnabled } from "@/config/studio-guide-conversation-v1";
import type { GuideServerHardNav } from "@/lib/studio-guide-hard-nav";

/** Hard return to Lobby — Samsung does not reliably run Next soft replace/back. */
export const LOBBY_CLOSE_HREF = "/" as const;

type Props = {
  /** Server-known `?guide=1` — first paint must not wait on a Suspense search gate. */
  initialOpen: boolean;
  /** Server-interpreted Continue/Skip — next step correct before client effects. */
  serverHardNav: GuideServerHardNav;
};

function readGuideOpenFromLocation(): { open: boolean; navKey: string } {
  if (typeof window === "undefined") {
    return { open: false, navKey: "" };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    open: params.get("guide") === "1",
    navKey: params.toString(),
  };
}

/**
 * Lobby Guide mount — page level, no Suspense search-params gate.
 * `initialOpen` + `serverHardNav` keep Continue from bouncing to Question 1.
 */
export default function LobbyGuideOverlay({
  initialOpen,
  serverHardNav,
}: Props) {
  const enabled = isStudioGuideConversationEnabled();
  const [open, setOpen] = useState(initialOpen);
  const [navKey, setNavKey] = useState("");

  useLayoutEffect(() => {
    function syncFromLocation() {
      const next = readGuideOpenFromLocation();
      setOpen(next.open);
      setNavKey(next.navKey);
    }
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  const onClose = useCallback(() => {
    window.location.assign(LOBBY_CLOSE_HREF);
  }, []);

  if (!enabled) return null;

  return (
    <GuideConversationPanel
      open={open}
      onClose={onClose}
      closeHref={LOBBY_CLOSE_HREF}
      navKey={navKey}
      serverHardNav={serverHardNav}
    />
  );
}
