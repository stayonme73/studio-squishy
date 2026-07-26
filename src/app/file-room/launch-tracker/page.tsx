import { cookies } from "next/headers";

import FileRoomHeader from "@/components/file-room/FileRoomHeader";
import { FileRoomForbiddenState } from "@/components/file-room/FileRoomStatePanels";
import LaunchTrackerView from "@/components/launch-tracker/LaunchTrackerView";
import { isOwnerUser } from "@/lib/campaign-store/access";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { loadMasterLaunchListMarkdown } from "@/lib/launch-tracker/load-master-launch-list";
import { renderLaunchMarkdown } from "@/lib/launch-tracker/render-launch-markdown";

/** Always read the markdown from disk so Scout edits appear after refresh. */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Launch Tracker · The Studio",
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * Temporary owner-only Launch Tracker.
 * Source of truth: docs/launch/STUDIO-MASTER-LAUNCH-LIST.md
 * Not the Owner Console. Removable after launch.
 */
export default async function LaunchTrackerPage() {
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

  const { markdown, loadedAt } = await loadMasterLaunchListMarkdown();
  const html = renderLaunchMarkdown(markdown);

  return (
    <>
      <FileRoomHeader user={user} />
      <LaunchTrackerView html={html} loadedAt={loadedAt} />
    </>
  );
}
