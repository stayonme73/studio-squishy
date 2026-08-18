import type { SquishyMessage } from "@/lib/squishy/types";

type Props = {
  message: SquishyMessage | null;
  classNamePrefix?: string;
};

/** Page-agnostic Squishy status shell — presentational only. */
export default function SquishyStatusPanel({ message, classNamePrefix = "squishy-status" }: Props) {
  if (!message) return null;

  return (
    <div className={classNamePrefix} role="status" aria-live="polite">
      <span className={`${classNamePrefix}__label`}>Studio</span>
      <span className={`${classNamePrefix}__text`}>{message.text}</span>
    </div>
  );
}
