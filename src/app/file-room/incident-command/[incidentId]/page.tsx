import { cookies } from "next/headers";

import FileRoomHeader from "@/components/file-room/FileRoomHeader";
import FileRoomIncidentCommandDetailScene from "@/components/file-room/FileRoomIncidentCommandDetailScene";
import {
  FileRoomForbiddenState,
  FileRoomNotFoundState,
} from "@/components/file-room/FileRoomStatePanels";
import { isOwnerUser } from "@/lib/campaign-store/access";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { getLiveSupervisionMachine } from "@/lib/studio-work-supervision/live-runtime";
import { getRuntimeSupervisionMachine } from "@/lib/studio-work-supervision/runtime";
import { toIncidentCommandDetail } from "@/lib/studio-work-supervision/view-model";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Incident record · Incident Command · The Studio",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ incidentId: string }>;
};

export default async function IncidentCommandDetailPage({ params }: PageProps) {
  const { incidentId } = await params;
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

  const fixtureIncident = getRuntimeSupervisionMachine().getIncident(incidentId);
  const liveIncident = fixtureIncident
    ? undefined
    : getLiveSupervisionMachine().getIncident(incidentId);
  const incident = fixtureIncident ?? liveIncident;
  const recordSource = fixtureIncident ? "fixture" : "live";
  if (!incident) {
    return (
      <>
        <FileRoomHeader user={user} showIncidentCommandLink={false} />
        <FileRoomNotFoundState />
      </>
    );
  }

  return (
    <>
      <FileRoomHeader user={user} showIncidentCommandLink={false} />
      <FileRoomIncidentCommandDetailScene
        detail={toIncidentCommandDetail(incident, recordSource)}
      />
    </>
  );
}
