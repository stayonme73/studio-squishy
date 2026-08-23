import Link from "next/link";

import type { StudioUser } from "@/lib/campaign-store/types";
import { isOwnerUser } from "@/lib/campaign-store/access";
import { fileRoom } from "@/config/file-room";
import { OWNER_CONSOLE_ROUTE } from "@/config/owner-console";
import { INCIDENT_COMMAND_ROUTE } from "@/lib/studio-work-supervision/view-model";
import { canEnterTeamOffice } from "@/lib/campaign-tasks/office-access";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
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
  /** Hide Incident Command link when already on that board. */
  showIncidentCommandLink?: boolean;
  /** Owner Console landing — larger type, gold name, hide list lead. */
  ownerDeskMode?: boolean;
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
  showIncidentCommandLink = true,
  ownerDeskMode = false,
}: FileRoomHeaderProps) {
  const officeLinks =
    campaignId && assignments ? resolveOfficeLinks(user, campaignId, assignments) : [];
  const ownerConsoleLinkVisible = showOwnerConsoleLink && isOwnerUser(user);
  const incidentCommandLinkVisible = showIncidentCommandLink && isOwnerUser(user);
  const utilityLinksVisible = ownerConsoleLinkVisible || incidentCommandLinkVisible;

  return (
    <header className={`fr-header${ownerDeskMode ? " fr-header--owner-desk" : ""}`}>
      <div>
        <h1 className="fr-header__title">{fileRoom.pageTitle}</h1>
        {ownerDeskMode ? null : (
          <p className="fr-header__meta">{campaignName ?? fileRoom.listLead}</p>
        )}
        {utilityLinksVisible ? (
          <p className="fr-header__meta">
            {ownerConsoleLinkVisible ? <Link href={OWNER_CONSOLE_ROUTE}>Owner Console</Link> : null}
            {ownerConsoleLinkVisible && incidentCommandLinkVisible ? " · " : null}
            {incidentCommandLinkVisible ? (
              <Link href={INCIDENT_COMMAND_ROUTE}>Incident Command</Link>
            ) : null}
            {incidentCommandLinkVisible || ownerConsoleLinkVisible ? " · " : null}
            <Link href="/file-room/launch-tracker">Launch Tracker</Link>
            {" · "}
            <Link href="/file-room/studio-self-test">Studio Self-Test</Link>
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
      <p className="fr-header__meta fr-header__owner-meta">
        <span className="fr-header__owner-name">{user.displayName}</span>
        <span className="fr-header__owner-roles">{user.roles.join(", ")}</span>
      </p>
    </header>
  );
}
