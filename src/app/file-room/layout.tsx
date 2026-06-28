import { cookies } from "next/headers";
import { unauthorized } from "next/navigation";

import { isStaffOrOwner } from "@/lib/auth/roles";
import { readSessionFromCookieHeader } from "@/lib/auth/session";

import "../file-room.css";

import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

export default async function FileRoomLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());

  if (!user || !isStaffOrOwner(user)) {
    unauthorized();
  }

  return (
    <main
      className={`${utilityPageFontClassName} fr-layout flex min-h-[100dvh] flex-1 flex-col overflow-hidden`}
    >
      <div className="utility-page utility-content">{children}</div>
    </main>
  );
}
