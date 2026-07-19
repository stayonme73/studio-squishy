"use client";

import type { ReactNode } from "react";

import { StudioPresenceProvider } from "@/components/studio-presence/StudioPresenceProvider";
import StudioPresenceStage from "@/components/studio-presence/StudioPresenceStage";

/** Client boundary for root layout — Provider + Lobby Stage. */
export default function StudioPresenceRoot({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <StudioPresenceProvider>
      {children}
      <StudioPresenceStage />
    </StudioPresenceProvider>
  );
}
