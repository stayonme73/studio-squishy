import Link from "next/link";

import {
  kitchenBucketActions,
  kitchenFileBucketDefinition,
  type KitchenFileBucketId,
} from "@/config/studio-kitchen-file-room";
import type { KitchenAction } from "@/config/studio-kitchen";
import { studioKitchen } from "@/config/studio-kitchen";

type Props = {
  bucketId: KitchenFileBucketId;
  compact?: boolean;
};

function ActionButton({ action }: { action: KitchenAction }) {
  const className = `utility-btn utility-btn--secondary sk-folder-actions__btn${action.phase1Stub ? " sk-folder-actions__btn--stub" : ""}`;

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" className={className} disabled={action.phase1Stub}>
      {action.label}
    </button>
  );
}

export default function StudioKitchenFolderActions({ bucketId, compact }: Props) {
  const { fileRoom } = studioKitchen;
  const def = kitchenFileBucketDefinition(bucketId);
  const actions = kitchenBucketActions(bucketId);

  if (!def || actions.length === 0) return null;

  return (
    <section
      className={`sk-folder-actions${compact ? " sk-folder-actions--compact" : ""}`}
      aria-label={fileRoom.actionCenterLabel}
    >
      <h4 className="sk-folder-actions__title">{fileRoom.actionCenterLabel}</h4>
      {def.ownerReviewChecklist ? (
        <ul className="sk-folder-actions__checklist">
          {def.ownerReviewChecklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      <ul className="sk-folder-actions__list">
        {actions.map((action) => (
          <li key={action.label}>
            <ActionButton action={action} />
          </li>
        ))}
      </ul>
    </section>
  );
}
