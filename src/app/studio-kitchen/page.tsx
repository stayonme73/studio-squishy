import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import StudioKitchenLiveFileRoomScene from "@/components/studio-kitchen/StudioKitchenLiveFileRoomScene";
import { isStaffOrOwner } from "@/lib/auth/roles";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import {
  isKitchenFixtureDemoRequested,
  loadKitchenProjectionBoard,
} from "@/lib/studio-kitchen";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

import "../mobile-route-fixes.css";

export const dynamic = "force-dynamic";

export const metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ demo?: string }>;
};

/** Studio Kitchen Foundation — staff-only live projection of production truth. */
export default async function StudioKitchenPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user || !isStaffOrOwner(user)) {
    notFound();
  }

  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.demo) query.set("demo", params.demo);

  const board = await loadKitchenProjectionBoard(user, {
    fixtureDemoRequested: isKitchenFixtureDemoRequested(query),
  });

  return (
    <main
      className={`${utilityPageFontClassName} journey-shell flex min-h-[100dvh] flex-1 flex-col overflow-hidden bg-[var(--utility-paper-cream)]`}
    >
      <StudioKitchenLiveFileRoomScene board={board} />
    </main>
  );
}
