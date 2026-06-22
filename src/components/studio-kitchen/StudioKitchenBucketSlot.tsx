import StudioKitchenFolderCard from "@/components/studio-kitchen/StudioKitchenFolderCard";
import StudioKitchenFolderActions from "@/components/studio-kitchen/StudioKitchenFolderActions";
import { kitchenBucketMoveToLabel, kitchenFileBucketDefinition } from "@/config/studio-kitchen-file-room";
import { studioKitchen } from "@/config/studio-kitchen";
import type { KitchenBucketSlotView } from "@/lib/studio-kitchen-file-room-view";

type Props = {
  slot: KitchenBucketSlotView;
  onOpenFolder: (campaignId: string) => void;
};

export default function StudioKitchenBucketSlot({ slot, onOpenFolder }: Props) {
  const { fileRoom } = studioKitchen;
  const def = kitchenFileBucketDefinition(slot.bucketId);
  const movesTo = kitchenBucketMoveToLabel(slot.bucketId);

  return (
    <div
      className={`sk-bucket-slot sk-bucket-slot--alert-${slot.alertLevel}`}
      data-bucket={slot.bucketId}
      data-alert={slot.alertLevel}
    >
      <header className="sk-bucket-slot__head">
        <div>
          <h3 className="sk-bucket-slot__title">{slot.label}</h3>
          {def ? <p className="sk-bucket-slot__summary">{def.summary}</p> : null}
        </div>
        {slot.folders.length > 0 ? (
          <span className="sk-bucket-slot__count">{slot.folders.length}</span>
        ) : null}
      </header>

      {movesTo ? (
        <p className="sk-bucket-slot__moves">
          {fileRoom.movesToLabel} <strong>{movesTo}</strong>
        </p>
      ) : null}

      <div className="sk-bucket-slot__queue" aria-label={`${slot.label} ${fileRoom.queueLabel}`}>
        {slot.folders.length === 0 ? (
          <p className="sk-bucket-slot__empty">No folders in queue</p>
        ) : (
          <ol className="sk-bucket-slot__folders">
            {slot.folders.map((folder) => (
              <li key={folder.id}>
                <StudioKitchenFolderCard
                  folder={folder}
                  queuePosition={folder.queuePosition}
                  onOpen={onOpenFolder}
                />
              </li>
            ))}
          </ol>
        )}
      </div>

      {slot.tray ? (
        <div
          className={`sk-tray sk-tray--alert-${slot.tray.alertLevel}`}
          data-tray={slot.tray.trayId}
          data-alert={slot.tray.alertLevel}
        >
          <header className="sk-tray__head">
            <span className="sk-tray__connector" aria-hidden="true" />
            <h4 className="sk-tray__title">
              {slot.tray.label}
              {slot.tray.folders.length > 0 ? (
                <span className="sk-tray__count"> ({slot.tray.folders.length})</span>
              ) : null}
            </h4>
          </header>
          {slot.tray.folders.length > 0 ? (
            <ul className="sk-tray__folders">
              {slot.tray.folders.map((folder) => (
                <li key={folder.id}>
                  <StudioKitchenFolderCard folder={folder} onOpen={onOpenFolder} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="sk-tray__empty">Tray clear</p>
          )}
        </div>
      ) : null}

      <StudioKitchenFolderActions bucketId={slot.bucketId} compact />
    </div>
  );
}
