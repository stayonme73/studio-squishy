import { kitchenBucketGroupId, kitchenBucketLabel, type KitchenBucketId } from "@/config/studio-kitchen-buckets";

type Props = {
  bucketId: KitchenBucketId;
};

export default function StudioKitchenBucketBadge({ bucketId }: Props) {
  return (
    <span
      className={`sk-bucket sk-bucket--${bucketId}`}
      data-group={kitchenBucketGroupId(bucketId)}
    >
      {kitchenBucketLabel(bucketId)}
    </span>
  );
}
