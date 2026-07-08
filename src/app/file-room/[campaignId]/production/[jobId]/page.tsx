import { cookies } from "next/headers";

import FileRoomProductionWorkspaceScene from "@/components/file-room/FileRoomProductionWorkspaceScene";
import FileRoomHeader from "@/components/file-room/FileRoomHeader";
import {
  FileRoomForbiddenState,
  FileRoomNotFoundState,
} from "@/components/file-room/FileRoomStatePanels";
import { productionWorkspacePageTitle } from "@/lib/job-control/production-workspace-view";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { loadProductionWorkspace } from "@/lib/file-room/load-production-workspace";

type ProductionWorkspacePageProps = {
  params: Promise<{ campaignId: string; jobId: string }>;
};

export default async function ProductionWorkspacePage({ params }: ProductionWorkspacePageProps) {
  const { campaignId, jobId } = await params;
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user) return null;

  const result = await loadProductionWorkspace(user, campaignId, decodeURIComponent(jobId));

  if (result.kind === "not-found" || result.kind === "job-not-found") {
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
        <FileRoomForbiddenState room="production-workspace" />
      </>
    );
  }

  return (
    <>
      <FileRoomHeader
        user={user}
        campaignName={result.view.campaignName}
        campaignId={campaignId}
      />
      <FileRoomProductionWorkspaceScene view={result.view} isOwner={result.isOwner} />
    </>
  );
}

export async function generateMetadata({ params }: ProductionWorkspacePageProps) {
  const { campaignId, jobId } = await params;
  const cookieStore = await cookies();
  const user = await readSessionFromCookieHeader(cookieStore.toString());
  if (!user) return { title: "Production Workspace" };

  const result = await loadProductionWorkspace(user, campaignId, decodeURIComponent(jobId));
  if (result.kind !== "ok") {
    return { title: "Production Workspace" };
  }

  return { title: productionWorkspacePageTitle(result.view) };
}
