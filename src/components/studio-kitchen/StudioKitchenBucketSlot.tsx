import StudioKitchenFolderCard from "@/components/studio-kitchen/StudioKitchenFolderCard";
import { studioKitchen } from "@/config/studio-kitchen";
import type { KitchenBucketSlotView } from "@/lib/studio-kitchen-file-room-view";

type Props = {
  slot: KitchenBucketSlotView;
  onOpenFolder: (campaignId: string) => void;
};

export default function StudioKitchenBucketSlot({ slot, onOpenFolder }: Props) {
  const { fileRoom } = studioKitchen;

  return (
    <div
      className={`sk-bucket-slot sk-bucket-slot--alert-${slot.alertLevel}`}
      data-bucket={slot.bucketId}
      data-alert={slot.alertLevel}
    >
      <header className="sk-bucket-slot__head">
        <h3 className="sk-bucket-slot__title">{slot.label}</h3>
        {slot.folders.length > 0 ? (
          <span className="sk-bucket-slot__count">{slot.folders.length}</span>
        ) : null}
      </header>

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
    </div>
  );
}
