import { studioGuideConversationV1 } from "@/config/studio-guide-conversation-v1";
import {
  deadlineStatusLabel,
  type GuideCaptureDraftV1,
} from "@/lib/studio-guide-capture";

import styles from "./GuideConversationPanel.module.css";

type Props = {
  draft: GuideCaptureDraftV1;
};

export default function GuideCaptureSummary({ draft }: Props) {
  const { fieldLabels, skippedDisplay, deadlineUnconfirmedNote } =
    studioGuideConversationV1;
  const intro = draft.confirmedAt
    ? studioGuideConversationV1.confirmedSummaryIntro
    : studioGuideConversationV1.summaryIntro;

  return (
    <div className={styles.summary}>
      <p className={styles.summaryIntro}>{intro}</p>
      <dl className={styles.summaryList}>
        <div className={styles.summaryRow}>
          <dt>{fieldLabels.preferredName}</dt>
          <dd>{draft.preferredName || skippedDisplay}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>{fieldLabels.projectNeed}</dt>
          <dd>{draft.projectNeed || skippedDisplay}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>{fieldLabels.businessName}</dt>
          <dd>{draft.businessName || skippedDisplay}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>{fieldLabels.requestedDeadline}</dt>
          <dd>
            {draft.requestedDeadline
              ? draft.requestedDeadline
              : studioGuideConversationV1.notRequestedDisplay}
          </dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>{fieldLabels.deadlineStatus}</dt>
          <dd>{deadlineStatusLabel(draft.deadlineStatus)}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>{fieldLabels.existingMaterialsNote}</dt>
          <dd>{draft.existingMaterialsNote || skippedDisplay}</dd>
        </div>
      </dl>
      {draft.deadlineStatus === "unconfirmed" ? (
        <p className={styles.deadlineNote}>{deadlineUnconfirmedNote}</p>
      ) : null}
    </div>
  );
}
