import { cookies } from "next/headers";

import FileRoomCampaignScene from "@/components/file-room/FileRoomCampaignScene";
import FileRoomHeader from "@/components/file-room/FileRoomHeader";
import {
  FileRoomForbiddenState,
  FileRoomNotFoundState,
} from "@/components/file-room/FileRoomStatePanels";
import { loadFileRoomCampaign } from "@/lib/file-room/load-campaign";
import { resolveFileRoomCampaignView } from "@/lib/file-room-view";
import { readSessionFromCookieHeader } from "@/lib/auth/session";

type FileRoomCampaignPageProps = {
  params: Promise<{ campaignId: string }>;
};

export default async function FileRoomCampaignPage({ params }: FileRoomCampaignPageProps) {
  const { campaignId } = await params;
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user) return null;

  const result = await loadFileRoomCampaign(user, campaignId);

  if (result.kind === "not-found") {
    return (
      <>
        <FileRoomHeader user={user} />
        <FileRoomNotFoundState />
      </>
    );
  }

  if (result.kind === "forbidden") {
    return (
      <>
        <FileRoomHeader user={user} />
        <FileRoomForbiddenState />
      </>
    );
  }

  const view = resolveFileRoomCampaignView(result.envelope);

  return (
    <>
      <FileRoomHeader user={user} campaignName={view.campaignName} />
      <FileRoomCampaignScene view={view} />
    </>
  );
}
