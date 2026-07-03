import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import StudioKitchenFileRoomScene from "@/components/studio-kitchen/StudioKitchenFileRoomScene";
import { isStaffOrOwner } from "@/lib/auth/roles";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

/** Studio Kitchen V4 — owner file room (staff-only; File Room is the live ops surface). */
export default async function StudioKitchenPage() {
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user || !isStaffOrOwner(user)) {
    notFound();
  }

  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-[var(--utility-paper-cream)]`}
    >
      <StudioKitchenFileRoomScene />
    </main>
  );
}
