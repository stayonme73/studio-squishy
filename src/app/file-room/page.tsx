import { cookies } from "next/headers";

import FileRoomHeader from "@/components/file-room/FileRoomHeader";
import FileRoomListScene from "@/components/file-room/FileRoomListScene";
import FileRoomEmptyState from "@/components/file-room/FileRoomStatePanels";
import { loadFileRoomCampaignList } from "@/lib/file-room/load-campaign";
import { resolveFileRoomListItemView } from "@/lib/file-room-view";
import { readSessionFromCookieHeader } from "@/lib/auth/session";

export default async function FileRoomPage() {
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user) return null;

  const { campaigns, fixtureCountHidden } = await loadFileRoomCampaignList(user);
  const items = campaigns.map(resolveFileRoomListItemView);

  return (
    <>
      <FileRoomHeader user={user} />
      {items.length === 0 ? (
        <FileRoomEmptyState fixtureCountHidden={fixtureCountHidden} />
      ) : (
        <FileRoomListScene items={items} fixtureCountHidden={fixtureCountHidden} />
      )}
    </>
  );
}
