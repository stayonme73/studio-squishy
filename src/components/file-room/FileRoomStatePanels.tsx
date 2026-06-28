import Link from "next/link";

import { fileRoom, FILE_ROOM_ROUTE } from "@/config/file-room";

type FileRoomEmptyStateProps = {
  fixtureCountHidden?: number;
};

export default function FileRoomEmptyState({ fixtureCountHidden = 0 }: FileRoomEmptyStateProps) {
  return (
    <div className="fr-state utility-card">
      <h2 className="fr-state__title">{fileRoom.emptyListTitle}</h2>
      <p className="fr-state__body">{fileRoom.emptyListBody}</p>
      {fixtureCountHidden > 0 ? (
        <p className="fr-state__body">{fileRoom.fixtureHiddenNote}</p>
      ) : null}
    </div>
  );
}

export function FileRoomNotFoundState() {
  return (
    <div className="fr-state utility-card">
      <h2 className="fr-state__title">{fileRoom.notFoundTitle}</h2>
      <p className="fr-state__body">{fileRoom.notFoundBody}</p>
      <Link className="fr-back-link" href={FILE_ROOM_ROUTE}>
        ← {fileRoom.detailBackLabel}
      </Link>
    </div>
  );
}

export function FileRoomForbiddenState() {
  return (
    <div className="fr-state utility-card">
      <h2 className="fr-state__title">{fileRoom.forbiddenTitle}</h2>
      <p className="fr-state__body">{fileRoom.forbiddenBody}</p>
      <Link className="fr-back-link" href={FILE_ROOM_ROUTE}>
        ← {fileRoom.detailBackLabel}
      </Link>
    </div>
  );
}
