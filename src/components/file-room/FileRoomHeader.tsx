import Link from "next/link";

import type { StudioUser } from "@/lib/campaign-store/types";
import { isOwnerUser } from "@/lib/campaign-store/access";
import { fileRoom } from "@/config/file-room";
import { OWNER_CONSOLE_ROUTE } from "@/config/owner-console";
import { canEnterTeamOffice } from "@/lib/campaign-tasks/office-access";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";
import {
  TEAM_OFFICE_V1_LIVE_SLUGS,
  officeRoleFromSlug,
  teamOfficePath,
  teamOfficeRoleLabels,
  type TeamOfficeRoleSlug,
} from "@/config/team-offices";

type FileRoomHeaderProps = {
  user: StudioUser;
  campaignName?: string;
  campaignId?: string;
  assignments?: CampaignAssignmentsFile;
  /** Hide Owner Console link when already on Owner Console. */
  showOwnerConsoleLink?: boolean;
};

function resolveOfficeLinks(
  user: StudioUser,
  campaignId: string,
  assignments: CampaignAssignmentsFile,
): { slug: TeamOfficeRoleSlug; label: string; href: string }[] {
  return TEAM_OFFICE_V1_LIVE_SLUGS.filter((slug) =>
    canEnterTeamOffice(user, campaignId, officeRoleFromSlug(slug), assignments),
  ).map((slug) => ({
    slug,
    label: `${teamOfficeRoleLabels[slug]} Office`,
    href: teamOfficePath(campaignId, slug),
  }));
}

export default function FileRoomHeader({
  user,
  campaignName,
  campaignId,
  assignments,
  showOwnerConsoleLink = true,
}: FileRoomHeaderProps) {
  const officeLinks =
    campaignId && assignments ? resolveOfficeLinks(user, campaignId, assignments) : [];
  const ownerConsoleLinkVisible = showOwnerConsoleLink && isOwnerUser(user);

  return (
    <header className="fr-header">
      <div>
        <h1 className="fr-header__title">{fileRoom.pageTitle}</h1>
        <p className="fr-header__meta">{campaignName ?? fileRoom.listLead}</p>
        {ownerConsoleLinkVisible ? (
          <p className="fr-header__meta">
            <Link href={OWNER_CONSOLE_ROUTE}>Owner Console</Link>
          </p>
        ) : null}
        {officeLinks.length > 0 ? (
          <p className="fr-header__meta">
            {officeLinks.map((link, index) => (
              <span key={link.slug}>
                {index > 0 ? " · " : null}
                <Link href={link.href}>{link.label}</Link>
              </span>
            ))}
          </p>
        ) : null}
      </div>
      <p className="fr-header__meta">
        {user.displayName} · {user.roles.join(", ")}
      </p>
    </header>
  );
}
