import { cookies } from "next/headers";

import FileRoomHeader from "@/components/file-room/FileRoomHeader";
import FileRoomIncidentCommandScene from "@/components/file-room/FileRoomIncidentCommandScene";
import { FileRoomForbiddenState } from "@/components/file-room/FileRoomStatePanels";
import { isOwnerUser } from "@/lib/campaign-store/access";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { getRuntimeSupervisionMachine } from "@/lib/studio-work-supervision/runtime";
import { toIncidentCommandView } from "@/lib/studio-work-supervision/view-model";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Incident Command · The Studio",
  robots: { index: false, follow: false },
};

export default async function IncidentCommandPage() {
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user) return null;

  if (!isOwnerUser(user)) {
    return (
      <>
        <FileRoomHeader user={user} />
        <FileRoomForbiddenState room="owner-console" />
      </>
    );
  }

  const view = toIncidentCommandView(getRuntimeSupervisionMachine().snapshot());

  return (
    <>
      <FileRoomHeader user={user} showIncidentCommandLink={false} />
      <FileRoomIncidentCommandScene view={view} />
    </>
  );
}
