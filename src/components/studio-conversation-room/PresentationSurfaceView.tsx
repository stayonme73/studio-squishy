"use client";

import DiscoveryPresentationView from "@/components/studio-conversation-room/discovery/DiscoveryPresentationView";
import HelpCenterPanel from "@/components/studio-conversation-room/HelpCenterPanel";
import styles from "@/components/studio-conversation-room/presentation-surface.module.css";
import type {
  ConversationDriver,
  VoiceModeAssistControl,
} from "@/config/studio-conversation-driver-v1";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";
import type {
  DiscoveryDeadlineInformation,
  DiscoveryTabletStepId,
} from "@/lib/studio-conversation-discovery";
import type { PresentationSurface } from "@/lib/studio-conversation-framework";

export type PresentationSurfaceViewProps = {
  surface: PresentationSurface;
  helpOpen?: boolean;
  driver?: ConversationDriver;
  answers?: DiscoveryAnswers;
  deadline?: DiscoveryDeadlineInformation | null;
  stepId?: DiscoveryTabletStepId;
  onTakeControl?: () => void;
  onResumeVoice?: () => void;
  onDiscoverySave?: (value: string) => void;
  onDiscoveryBack?: () => void;
  onDiscoverySkipOptional?: () => void;
  canDiscoveryGoBack?: boolean;
  onVoiceAssist?: (control: VoiceModeAssistControl) => void;
  voiceAssistNote?: string | null;
  onSelectDiscoveryCaptured?: (stepId: DiscoveryTabletStepId) => void;
};

/**
 * Renders whatever the Presentation Manager resolved — customer gate only.
 */
export default function PresentationSurfaceView({
  surface,
  helpOpen = false,
  driver = "studio-voice",
  answers = {},
  deadline = null,
  stepId = "your-situation",
  onTakeControl,
  onResumeVoice,
  onDiscoverySave,
  onDiscoveryBack,
  onDiscoverySkipOptional,
  canDiscoveryGoBack = false,
  onVoiceAssist,
  voiceAssistNote,
  onSelectDiscoveryCaptured,
}: PresentationSurfaceViewProps) {
  return (
    <div className={styles.root} data-presentation-kind={surface.kind}>
      {surface.kind === "message" && surface.message ? (
        <p className={styles.message}>{surface.message}</p>
      ) : null}
      {surface.kind === "discovery" && surface.discovery ? (
        <DiscoveryPresentationView
          discovery={surface.discovery}
          driver={driver}
          answers={answers}
          deadline={deadline}
          stepId={stepId}
          onTakeControl={onTakeControl ?? (() => undefined)}
          onResumeVoice={onResumeVoice ?? (() => undefined)}
          onSave={onDiscoverySave ?? (() => undefined)}
          onBack={onDiscoveryBack ?? (() => undefined)}
          onSkipOptional={onDiscoverySkipOptional}
          canGoBack={canDiscoveryGoBack}
          onAssist={onVoiceAssist}
          assistNote={voiceAssistNote}
          onSelectCaptured={onSelectDiscoveryCaptured}
        />
      ) : null}
      <HelpCenterPanel open={helpOpen || surface.kind === "help"} />
    </div>
  );
}
