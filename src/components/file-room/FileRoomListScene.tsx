import Link from "next/link";

import { FILE_ROOM_ROUTE } from "@/config/file-room";
import type { FileRoomListItemView } from "@/lib/file-room-view";

type FileRoomListSceneProps = {
  items: readonly FileRoomListItemView[];
  fixtureCountHidden: number;
};

function milestone(label: string, done: boolean) {
  return (
    <span className={done ? "fr-milestone--yes" : undefined}>
      {label}: {done ? "yes" : "no"}
    </span>
  );
}

export default function FileRoomListScene({ items, fixtureCountHidden }: FileRoomListSceneProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <>
      {fixtureCountHidden > 0 ? (
        <p className="fr-lead" style={{ fontSize: "var(--type-helper)" }}>
          {fixtureCountHidden} fixture/test record(s) hidden from this list.
        </p>
      ) : null}
      <ul className="fr-list">
        {items.map((item) => (
          <li key={item.campaignId}>
            <Link className="utility-card fr-list-item" href={`${FILE_ROOM_ROUTE}/${item.campaignId}`}>
              <div className="fr-list-item__top">
                <h2 className="fr-list-item__name">{item.campaignName}</h2>
                <span className="fr-list-item__status">{item.statusLabel}</span>
              </div>
              <p className="fr-list-item__sub">{item.businessLabel}</p>
              <p className="fr-list-item__sub">
                Sync v{item.syncVersion} · {new Date(item.syncedAt).toLocaleString()}
              </p>
              <div className="fr-milestones">
                {milestone("Discovery", item.hasDiscovery)}
                {milestone("Plan", item.hasApprovedPlan)}
                {milestone("Payment", item.hasPayment)}
                {milestone("Project Details", item.hasProjectDetails)}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
