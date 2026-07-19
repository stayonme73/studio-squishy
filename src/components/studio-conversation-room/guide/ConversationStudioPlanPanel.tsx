"use client";

import ProjectBuilderStudioPlanSummary from "@/components/project-builder/ProjectBuilderStudioPlanSummary";
import styles from "@/components/studio-conversation-room/guide/conversation-activity-panel.module.css";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import type { RouteMapJobId } from "@/config/route-map-v1";
import type { ProjectBuilderStudioPlanSummaryModel } from "@/lib/project-builder-studio-plan-summary";

import "@/app/project-builder/project-builder.css";

export type ConversationStudioPlanPanelProps = {
  model: ProjectBuilderStudioPlanSummaryModel;
  onClose: () => void;
  onViewScope: (jobId: RouteMapJobId) => void;
};

/**
 * Activity Panel extras for Studio Plan — View Scope, Revision Policy, We'll Need.
 * Key Voice facts stay large on the tablet.
 */
export default function ConversationStudioPlanPanel({
  model,
  onClose,
  onViewScope,
}: ConversationStudioPlanPanelProps) {
  const v = conversationRoomGuideV1;

  return (
    <div className={styles.sheet} data-panel="plan">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Studio Guide</p>
          <h2 className={styles.title}>{v.studioPlanExtraDetailsTitle}</h2>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close activity panel"
        >
          Close
        </button>
      </header>

      <p className={styles.intro}>{v.studioPlanExtraDetailsLead}</p>

      <div className={styles.planDetailsScroll}>
        <div className={styles.planExtrasDoc} data-theme="studio-dark">
          <ProjectBuilderStudioPlanSummary
            model={model}
            variant="extras"
            showActions={false}
            onEditProject={onClose}
            onContinueToCheckout={onClose}
            onViewScope={onViewScope}
          />
        </div>
      </div>
    </div>
  );
}
