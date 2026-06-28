import type { FileRoomSyncMeta } from "@/lib/file-room-view";
import { fileRoom } from "@/config/file-room";

type FileRoomSyncBadgeProps = {
  sync: FileRoomSyncMeta;
};

export default function FileRoomSyncBadge({ sync }: FileRoomSyncBadgeProps) {
  return (
    <div className="fr-sync-badge" aria-label="Server sync metadata">
      <span>{fileRoom.syncSourceLabel}</span>
      <code>{sync.sourcePath}</code>
      <span>v{sync.syncVersion}</span>
      <span>{new Date(sync.syncedAt).toLocaleString()}</span>
      <code>{sync.campaignId}</code>
    </div>
  );
}
