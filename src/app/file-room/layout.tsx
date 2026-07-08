import { cookies } from "next/headers";
import { unauthorized } from "next/navigation";

import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
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
      className={`${utilityPageFontClassName} journey-shell fr-layout flex min-h-[100dvh] flex-1 flex-col overflow-hidden`}
    >
      <div className="studio-utility-scene studio-utility-scene--file-room flex min-h-0 flex-1 flex-col overflow-hidden">
        <StudioUtilityBackdrop />
        <div className="studio-utility-scene__content flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="utility-page fr-page">{children}</div>
        </div>
      </div>
    </main>
  );
}
