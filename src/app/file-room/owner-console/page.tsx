import { cookies } from "next/headers";

import FileRoomHeader from "@/components/file-room/FileRoomHeader";
import FileRoomOwnerConsoleScene from "@/components/file-room/FileRoomOwnerConsoleScene";
import { FileRoomForbiddenState } from "@/components/file-room/FileRoomStatePanels";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { loadOwnerConsoleAggregate } from "@/lib/file-room/load-owner-console-aggregate";
import { toOwnerDeskAwarenessScan } from "@/lib/campaign-tasks/owner-console-scan-view";

export default async function OwnerConsolePage() {
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user) return null;

  const result = await loadOwnerConsoleAggregate(user);

  if (result.kind === "forbidden") {
    return (
      <>
        <FileRoomHeader user={user} />
        <FileRoomForbiddenState room="owner-console" />
      </>
    );
  }

  return (
    <>
      <FileRoomHeader user={user} showOwnerConsoleLink={false} ownerDeskMode />
      <FileRoomOwnerConsoleScene
        view={result.view}
        scan={toOwnerDeskAwarenessScan(result.scan)}
        controlRoom={result.controlRoom}
        refreshedAt={result.refreshedAt}
        ownerDisplayName={user.displayName}
      />
    </>
  );
}
