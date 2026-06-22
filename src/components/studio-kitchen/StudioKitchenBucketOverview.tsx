import type { KitchenBucketBoard } from "@/lib/studio-kitchen-view";
import { studioKitchen } from "@/config/studio-kitchen";

type Props = {
  board: KitchenBucketBoard;
};

export default function StudioKitchenBucketOverview({ board }: Props) {
  const { buckets } = studioKitchen;

  return (
    <section className="sk-buckets utility-card" aria-labelledby="sk-buckets-title">
      <h2 id="sk-buckets-title" className="sk-buckets__title">
        {buckets.title}
      </h2>

      <div className="sk-buckets__groups">
        {board.groups.map((group) => (
          <div key={group.id} className="sk-buckets__group" data-group={group.id}>
            <h3 className="sk-buckets__group-title">{group.title}</h3>
            <dl className="sk-buckets__grid">
              {group.buckets.map((bucket) => (
                <div key={bucket.id} className="sk-buckets__row">
                  <dt>{bucket.label}</dt>
                  <dd>{bucket.count}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
