import { cookies } from "next/headers";

import FileRoomHeader from "@/components/file-room/FileRoomHeader";
import FileRoomSelfTestScoreboard from "@/components/file-room/FileRoomSelfTestScoreboard";
import { FileRoomForbiddenState } from "@/components/file-room/FileRoomStatePanels";
import { studioSelfTest } from "@/config/studio-self-test";
import { isOwnerUser } from "@/lib/campaign-store/access";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { loadSelfTestScoreboard } from "@/lib/studio-self-test/load-results";

export default async function StudioSelfTestPage() {
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user) return null;

  if (!isOwnerUser(user)) {
    return (
      <>
        <FileRoomHeader user={user} />
        <FileRoomForbiddenState />
      </>
    );
  }

  const view = await loadSelfTestScoreboard();

  return (
    <>
      <FileRoomHeader user={user} showOwnerConsoleLink />
      <h2 className="fr-header__title">{studioSelfTest.pageTitle}</h2>
      <FileRoomSelfTestScoreboard view={view} />
    </>
  );
}
