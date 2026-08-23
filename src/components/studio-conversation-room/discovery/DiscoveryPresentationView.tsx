"use client";

import ConversationDriverControl from "@/components/studio-conversation-room/ConversationDriverControl";
import DiscoveryStepForm from "@/components/studio-conversation-room/discovery/DiscoveryStepForm";
import VoiceAssistControls from "@/components/studio-conversation-room/VoiceAssistControls";
import styles from "@/components/studio-conversation-room/discovery/discovery-presentation.module.css";
import type { ConversationDriver } from "@/config/studio-conversation-driver-v1";
import type { VoiceModeAssistControl } from "@/config/studio-conversation-driver-v1";
import { isPresentationInteractive } from "@/config/studio-conversation-driver-v1";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";
import {
  isDiscoveryTabletStepId,
  type DiscoveryDeadlineInformation,
  type DiscoveryPresentationPayload,
  type DiscoveryTabletStepId,
} from "@/lib/studio-conversation-discovery";

export type DiscoveryPresentationViewProps = {
  discovery: DiscoveryPresentationPayload;
  driver: ConversationDriver;
  answers: DiscoveryAnswers;
  deadline: DiscoveryDeadlineInformation | null;
  stepId: DiscoveryTabletStepId;
  onTakeControl: () => void;
  onResumeVoice: () => void;
  onSave: (value: string) => void;
  onBack: () => void;
  onSkipOptional?: () => void;
  canGoBack: boolean;
  onAssist?: (control: VoiceModeAssistControl) => void;
  assistNote?: string | null;
  /** Only when Customer drives — reopen a prior answer to edit. */
  onSelectCaptured?: (stepId: DiscoveryTabletStepId) => void;
};

/**
 * Customer Presentation — passive while Studio Voice drives;
 * interactive only when Customer holds the baton.
 */
export default function DiscoveryPresentationView({
  discovery,
  driver,
  answers,
  deadline,
  stepId,
  onTakeControl,
  onResumeVoice,
  onSave,
  onBack,
  onSkipOptional,
  canGoBack,
  onAssist,
  assistNote,
  onSelectCaptured,
}: DiscoveryPresentationViewProps) {
  const interactive = isPresentationInteractive(driver);

  return (
    <section
      className={styles.root}
      aria-label="Discovery presentation"
      data-driver={driver}
    >
      <ConversationDriverControl
        variant="presentation"
        driver={driver}
        onTakeControl={onTakeControl}
        onResumeVoice={onResumeVoice}
        /* Voice mode: Answer Myself lives in assist controls — avoid triple CTA. */
        showHandoffCta={interactive}
      />

      <p className={styles.stage}>{discovery.stageLabel}</p>
      <p className={styles.progress}>{discovery.progressLabel}</p>

      <div className={styles.current}>
        <h2 className={styles.title}>{discovery.currentTitle}</h2>
        <p className={styles.question}>{discovery.currentQuestion}</p>
        {!interactive && discovery.currentSummary ? (
          <p className={styles.answer}>{discovery.currentSummary}</p>
        ) : null}
      </div>

      {!interactive ? (
        <>
          <VoiceAssistControls
            onAssist={(control) => {
              if (control === "take-over") {
                onTakeControl();
                return;
              }
              if (control === "go-back") {
                onBack();
                return;
              }
              onAssist?.(control);
            }}
          />
          {assistNote ? <p className={styles.watchHint}>{assistNote}</p> : null}
        </>
      ) : (
        <DiscoveryStepForm
          stepId={stepId}
          answers={answers}
          deadline={deadline}
          interactive
          surface="presentation"
          onSave={onSave}
          onBack={onBack}
          onSkipOptional={onSkipOptional}
          canGoBack={canGoBack}
          saveLabel="Continue"
        />
      )}

      {discovery.captured.length > 0 ? (
        <>
          <p className={styles.capturedLabel}>Captured so far</p>
          <ul className={styles.list}>
            {discovery.captured.map((item) => (
              <li key={item.stepId} className={styles.item}>
                {interactive && onSelectCaptured ? (
                  <button
                    type="button"
                    className={styles.itemTitleButton}
                    onClick={() => {
                      if (isDiscoveryTabletStepId(item.stepId)) {
                        onSelectCaptured(item.stepId);
                      }
                    }}
                  >
                    {item.title}
                  </button>
                ) : (
                  <span className={styles.itemTitle}>{item.title}</span>
                )}
                <span className={styles.itemSummary}>{item.summary}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {discovery.discoveryComplete ? (
        <p className={styles.complete}>
          Discovery is complete. You can still correct any answer before you
          choose a starting route.
        </p>
      ) : null}
    </section>
  );
}
