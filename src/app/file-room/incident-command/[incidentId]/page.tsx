import { cookies } from "next/headers";

import FileRoomHeader from "@/components/file-room/FileRoomHeader";
import FileRoomIncidentCommandDetailScene from "@/components/file-room/FileRoomIncidentCommandDetailScene";
import { FileRoomIncidentCommandLiveStatus } from "@/components/file-room/FileRoomIncidentCommandScene";
import {
  FileRoomForbiddenState,
  FileRoomNotFoundState,
} from "@/components/file-room/FileRoomStatePanels";
import { isOwnerUser } from "@/lib/campaign-store/access";
import { readSessionFromCookieHeader } from "@/lib/auth/session";
import { readLiveSupervisionForIncidentCommand } from "@/lib/studio-work-supervision/live-read";
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
  if (fixtureIncident) {
    return (
      <>
        <FileRoomHeader user={user} showIncidentCommandLink={false} />
        <FileRoomIncidentCommandDetailScene
          detail={toIncidentCommandDetail(fixtureIncident, "fixture")}
        />
      </>
    );
  }

  const liveRead = await readLiveSupervisionForIncidentCommand();
  if (!liveRead.ok) {
    return (
      <>
        <FileRoomHeader user={user} showIncidentCommandLink={false} />
        <div className="fr-incident-command">
          <FileRoomIncidentCommandLiveStatus liveRead={liveRead} variant="detail" />
        </div>
      </>
    );
  }

  const liveIncident = liveRead.snapshot.incidents.find(
    (incident) => incident.incidentId === incidentId,
  );
  if (!liveIncident) {
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
        detail={toIncidentCommandDetail(liveIncident, "live")}
      />
    </>
  );
}
