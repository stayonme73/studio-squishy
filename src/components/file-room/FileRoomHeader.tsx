import Link from "next/link";

import type { StudioUser } from "@/lib/campaign-store/types";
import { fileRoom } from "@/config/file-room";
import { teamOfficePath } from "@/config/team-offices";

type FileRoomHeaderProps = {
  user: StudioUser;
  campaignName?: string;
  campaignId?: string;
  showCopyOfficeLink?: boolean;
};

export default function FileRoomHeader({
  user,
  campaignName,
  campaignId,
  showCopyOfficeLink = false,
}: FileRoomHeaderProps) {
  return (
    <header className="fr-header">
      <div>
        <h1 className="fr-header__title">{fileRoom.pageTitle}</h1>
        <p className="fr-header__meta">
          {campaignName ?? fileRoom.listLead}
        </p>
        {showCopyOfficeLink && campaignId ? (
          <p className="fr-header__meta">
            <Link href={teamOfficePath(campaignId, "copy")}>Copy Office</Link>
          </p>
        ) : null}
      </div>
      <p className="fr-header__meta">
        {user.displayName} · {user.roles.join(", ")}
      </p>
    </header>
  );
}
