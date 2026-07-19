import styles from "@/components/studio-tablet/studio-tablet.module.css";

/**
 * T1 empty stage — proves shell + chrome before journey panels move in.
 * Not a screenshot. Real React placeholder copy only.
 */
export default function EmptyTabletStage({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className={styles.emptyStage}>
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}
