import { cookies } from "next/headers";

import FileRoomHeader from "@/components/file-room/FileRoomHeader";
import FileRoomOwnerCampaignConsoleScene from "@/components/file-room/FileRoomOwnerCampaignConsoleScene";
import {
  FileRoomForbiddenState,
  FileRoomNotFoundState,
} from "@/components/file-room/FileRoomStatePanels";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { loadOwnerConsoleCampaign } from "@/lib/file-room/load-owner-console-campaign";
import { toOwnerDeskAwarenessScan } from "@/lib/campaign-tasks/owner-console-scan-view";

type OwnerConsoleCampaignPageProps = {
  params: Promise<{ campaignId: string }>;
  searchParams: Promise<{ item?: string }>;
};

export default async function OwnerConsoleCampaignPage({
  params,
  searchParams,
}: OwnerConsoleCampaignPageProps) {
  const { campaignId } = await params;
  const { item } = await searchParams;
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user) return null;

  const result = await loadOwnerConsoleCampaign(user, campaignId, item ?? null);

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
        <FileRoomForbiddenState room="owner-console" />
      </>
    );
  }

  return (
    <>
      <FileRoomHeader
        user={user}
        campaignName={result.view.campaignName}
        campaignId={campaignId}
        showOwnerConsoleLink={false}
      />
      <FileRoomOwnerCampaignConsoleScene
        view={{ ...result.view, scan: toOwnerDeskAwarenessScan(result.view.scan) }}
        refreshedAt={result.refreshedAt}
      />
    </>
  );
}
