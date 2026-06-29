import Link from "next/link";

import { fileRoom, FILE_ROOM_ROUTE } from "@/config/file-room";
import type { FileRoomTaskOperatorContext } from "@/lib/campaign-tasks/file-room-controls-types";
import type { FileRoomExceptionOperatorContext } from "@/lib/campaign-tasks/exceptions-view";
import type { FileRoomCampaignView } from "@/lib/file-room-view";

import FileRoomExceptionsSection from "./FileRoomExceptionsSection";
import FileRoomMaterialsSection from "./FileRoomMaterialsSection";
import FileRoomProductionTasksSection from "./FileRoomProductionTasksSection";
import FileRoomSectionCard from "./FileRoomSectionCard";
import FileRoomStatusRail from "./FileRoomStatusRail";
import FileRoomSyncBadge from "./FileRoomSyncBadge";

type FileRoomCampaignSceneProps = {
  view: FileRoomCampaignView;
  campaignId: string;
  canReviewMaterials: boolean;
  operatorContext: FileRoomTaskOperatorContext;
  exceptionOperatorContext: FileRoomExceptionOperatorContext;
  showExceptions: boolean;
};

export default function FileRoomCampaignScene({
  view,
  campaignId,
  canReviewMaterials,
  operatorContext,
  exceptionOperatorContext,
  showExceptions,
}: FileRoomCampaignSceneProps) {
  return (
    <>
      <Link className="fr-back-link" href={FILE_ROOM_ROUTE}>
        ← {fileRoom.detailBackLabel}
      </Link>

      <div style={{ marginBottom: "1rem" }}>
        <FileRoomSyncBadge sync={view.sync} />
      </div>

      {view.health.isPartial ? (
        <div className="fr-banner" role="status">
          <strong>{fileRoom.partialRecordTitle}</strong>
          {fileRoom.partialRecordBody} Missing: {view.health.missing.join(", ")}.
        </div>
      ) : null}

      <div className="fr-detail-grid">
        <div className="fr-detail-grid__main">
          <FileRoomSectionCard title="Campaign identity">
            <ul className="fr-kv-list fr-kv-list--split">
              <li className="fr-kv-list__row">
                <span className="fr-kv-list__label">Campaign</span>
                <p className="fr-kv-list__value">{view.campaignName}</p>
              </li>
              <li className="fr-kv-list__row">
                <span className="fr-kv-list__label">Business</span>
                <p className="fr-kv-list__value">{view.businessLabel}</p>
              </li>
              <li className="fr-kv-list__row">
                <span className="fr-kv-list__label">Status</span>
                <p className="fr-kv-list__value">{view.statusLabel}</p>
              </li>
              <li className="fr-kv-list__row">
                <span className="fr-kv-list__label">Studio Plan</span>
                <p className="fr-kv-list__value">{view.planLabel}</p>
              </li>
            </ul>
          </FileRoomSectionCard>

          {view.planIncludes.length > 0 ? (
            <FileRoomSectionCard title="Approved Studio Plan">
              <ul className="fr-scope-group__list">
                {view.planIncludes.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </FileRoomSectionCard>
          ) : null}

          {view.deliverableScope.length > 0 ? (
            <FileRoomSectionCard title="Services & deliverable scope">
              {view.deliverableScope.map((group) => (
                <div key={group.serviceName} className="fr-scope-group">
                  <p className="fr-scope-group__name">{group.serviceName}</p>
                  <ul className="fr-scope-group__list">
                    {group.deliverables.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </FileRoomSectionCard>
          ) : null}

          {view.discoveryItems.length > 0 ? (
            <FileRoomSectionCard title="Discovery">
              <ul className="fr-kv-list">
                {view.discoveryItems.map((item) => (
                  <li key={item.label} className="fr-kv-list__row">
                    <span className="fr-kv-list__label">{item.label}</span>
                    <p className="fr-kv-list__value">{item.value}</p>
                  </li>
                ))}
              </ul>
            </FileRoomSectionCard>
          ) : null}

          {view.visionSummary.length > 0 ? (
            <FileRoomSectionCard title="Vision intake">
              {view.visionSummary.map((section) => (
                <div key={section.eyebrow} className="fr-scope-group">
                  <p className="fr-scope-group__name">{section.eyebrow}</p>
                  <ul className="fr-kv-list">
                    {section.entries.map((item) => (
                      <li key={item.label} className="fr-kv-list__row">
                        <span className="fr-kv-list__label">{item.label}</span>
                        <p className="fr-kv-list__value">{item.value}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </FileRoomSectionCard>
          ) : null}

          <FileRoomMaterialsSection
            campaignId={campaignId}
            materials={view.materials}
            canReview={canReviewMaterials}
          />

          <FileRoomProductionTasksSection
            campaignId={campaignId}
            productionTasks={view.productionTasks}
            operatorContext={operatorContext}
            showExceptionBadges={showExceptions}
          />

          {showExceptions ? (
            <FileRoomExceptionsSection
              campaignId={campaignId}
              exceptions={view.exceptions}
              tasks={view.productionTasks.tasks}
              operatorContext={exceptionOperatorContext}
            />
          ) : null}

          {view.projectDetailsSections.length > 0 ? (
            <FileRoomSectionCard title="Project Details">
              {view.projectDetailsSections.map((section) => (
                <div key={section.title} className="fr-scope-group">
                  <p className="fr-scope-group__name">{section.title}</p>
                  <ul className="fr-kv-list">
                    {section.items.map((item) => (
                      <li key={`${section.title}-${item.label}`} className="fr-kv-list__row">
                        <span className="fr-kv-list__label">{item.label}</span>
                        <p className="fr-kv-list__value">{item.value}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </FileRoomSectionCard>
          ) : null}

          {view.approvedDirection ? (
            <FileRoomSectionCard title="Approved direction">
              <p className="fr-kv-list__value">{view.approvedDirection}</p>
            </FileRoomSectionCard>
          ) : null}

          {view.creativeBrief ? (
            <FileRoomSectionCard title="Creative brief">
              <div className="fr-brief-grid">
                {[
                  ["Project", view.creativeBrief.projectName],
                  ["Business", view.creativeBrief.business],
                  ["Audience", view.creativeBrief.audience],
                  ["Goals", view.creativeBrief.goals],
                  ["Core message", view.creativeBrief.coreMessage],
                  ["Tone", view.creativeBrief.toneGuidance],
                  ["Timing", view.creativeBrief.timing],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label} className="fr-kv-list__row">
                      <span className="fr-kv-list__label">{label}</span>
                      <p className="fr-kv-list__value">{value}</p>
                    </div>
                  ) : null,
                )}
              </div>
            </FileRoomSectionCard>
          ) : null}
        </div>

        <aside className="fr-rail">
          <FileRoomSectionCard title="Status rail">
            <FileRoomStatusRail steps={view.progressSteps} />
          </FileRoomSectionCard>
        </aside>
      </div>
    </>
  );
}
