"use client";

import ConversationDriverControl from "@/components/studio-conversation-room/ConversationDriverControl";
import DiscoveryStepForm from "@/components/studio-conversation-room/discovery/DiscoveryStepForm";
import styles from "@/components/studio-conversation-room/discovery/discovery-tablet.module.css";
import type { ConversationDriver } from "@/config/studio-conversation-driver-v1";
import { isTabletInteractive } from "@/config/studio-conversation-driver-v1";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";
import {
  DISCOVERY_TABLET_STEP_ORDER,
  discoveryTabletStepConfig,
  type DiscoveryDeadlineInformation,
  type DiscoveryTabletStepId,
} from "@/lib/studio-conversation-discovery";

export type DiscoveryTabletPanelProps = {
  stepId: DiscoveryTabletStepId;
  answers: DiscoveryAnswers;
  deadline: DiscoveryDeadlineInformation | null;
  driver: ConversationDriver;
  onTakeControl: () => void;
  onResumeVoice: () => void;
  onSave: (value: string) => void;
  onBack: () => void;
  onSkipOptional?: () => void;
  canGoBack: boolean;
  progressLabel: string;
  error?: string | null;
  discoveryComplete?: boolean;
  onContinueToRoute?: () => void;
  onReturnToLobby?: () => void;
};

/**
 * Studio Workspace Discovery — interactive only when Studio Voice drives.
 * When Customer drives, tablet follows (read-only mirror).
 */
export default function DiscoveryTabletPanel({
  stepId,
  answers,
  deadline,
  driver,
  onTakeControl,
  onResumeVoice,
  onSave,
  onBack,
  onSkipOptional,
  canGoBack,
  progressLabel,
  error,
  discoveryComplete = false,
  onContinueToRoute,
  onReturnToLobby,
}: DiscoveryTabletPanelProps) {
  const config = discoveryTabletStepConfig[stepId];
  const interactive = isTabletInteractive(driver);
  const stepNumber = DISCOVERY_TABLET_STEP_ORDER.indexOf(stepId) + 1;

  return (
    <section
      className={styles.root}
      aria-label="Discovery tablet"
      data-driver={driver}
    >
      <ConversationDriverControl
        variant="tablet"
        driver={driver}
        onTakeControl={onTakeControl}
        onResumeVoice={onResumeVoice}
      />

      <p className={styles.eyebrow}>
        Discovery · {interactive ? "Voice workspace" : "Following customer"}
      </p>
      <h2 className={styles.title}>{config.title}</h2>
      <p className={styles.question}>{config.question}</p>
      <p className={styles.progress}>
        {progressLabel}
        {stepNumber > 0 ? ` · Step ${stepNumber}` : ""}
      </p>

      {!interactive ? (
        <p className={styles.status}>
          Customer is driving. This tablet updates as they answer — it is not
          interactive for the customer.
        </p>
      ) : null}

      <DiscoveryStepForm
        stepId={stepId}
        answers={answers}
        deadline={deadline}
        interactive={interactive}
        onSave={onSave}
        onBack={onBack}
        onSkipOptional={onSkipOptional}
        canGoBack={canGoBack}
        saveLabel="Save & continue"
      />

      {error ? <p className={styles.error}>{error}</p> : null}
      {discoveryComplete ? (
        <p className={styles.status}>
          Discovery is complete. Answers are saved in the working draft.
        </p>
      ) : null}

      <div className={styles.actions}>
        {onReturnToLobby ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={onReturnToLobby}
          >
            Return to Lobby
          </button>
        ) : null}
        {discoveryComplete && onContinueToRoute ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={onContinueToRoute}
          >
            Ready for route
          </button>
        ) : null}
      </div>
    </section>
  );
}
