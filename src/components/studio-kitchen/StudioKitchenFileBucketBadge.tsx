import { kitchenFileBucketLabel, type KitchenFileBucketId } from "@/config/studio-kitchen-file-room";

type Props = {
  bucketId: KitchenFileBucketId;
};

export default function StudioKitchenFileBucketBadge({ bucketId }: Props) {
  return (
    <span className={`sk-file-bucket sk-file-bucket--${bucketId}`}>{kitchenFileBucketLabel(bucketId)}</span>
  );
}
