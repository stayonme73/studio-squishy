import type { StudioUser } from "@/lib/campaign-store/types";
import { fileRoom } from "@/config/file-room";

type FileRoomHeaderProps = {
  user: StudioUser;
  campaignName?: string;
};

export default function FileRoomHeader({ user, campaignName }: FileRoomHeaderProps) {
  return (
    <header className="fr-header">
      <div>
        <h1 className="fr-header__title">{fileRoom.pageTitle}</h1>
        <p className="fr-header__meta">
          {campaignName ?? fileRoom.listLead}
        </p>
      </div>
      <p className="fr-header__meta">
        {user.displayName} · {user.roles.join(", ")}
      </p>
    </header>
  );
}
