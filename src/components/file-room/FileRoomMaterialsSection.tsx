import { materialsConfig } from "@/config/materials";
import type { FileRoomMaterialsView } from "@/lib/materials/materials-view";

import FileRoomSectionCard from "./FileRoomSectionCard";

type FileRoomMaterialsSectionProps = {
  materials: FileRoomMaterialsView;
};

function MaterialRow({
  item,
}: {
  item: FileRoomMaterialsView["groups"][number]["items"][number];
}) {
  return (
    <li className="fr-materials-row">
      <div className="fr-materials-row__head">
        <span className="fr-materials-row__label">{item.label}</span>
        <span
          className={`fr-materials-row__status${item.isBlocking ? " fr-materials-row__status--blocking" : ""}`}
        >
          {item.statusLabel}
        </span>
      </div>
      <p className="fr-materials-row__meta">
        {item.categoryLabel} · {item.requirementLabel} · Needed for {item.reason}
      </p>
      {item.submittedByLabel ? (
        <p className="fr-materials-row__meta">Submitted by {item.submittedByLabel}</p>
      ) : item.reviewStatus === "missing" ? (
        <p className="fr-materials-row__meta">{materialsConfig.noSubmissionLabel}</p>
      ) : null}
      {item.fileName ? (
        <p className="fr-materials-row__value">File: {item.fileName}</p>
      ) : null}
      {item.url ? (
        <p className="fr-materials-row__value">
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            {item.url}
          </a>
        </p>
      ) : null}
      {item.text && item.category === "access-instructions" ? (
        <>
          <p className="fr-materials-row__value">{item.text}</p>
          <p className="fr-materials-row__note">{materialsConfig.accessInstructionsNote}</p>
        </>
      ) : item.text ? (
        <p className="fr-materials-row__value">{item.text}</p>
      ) : null}
    </li>
  );
}

export default function FileRoomMaterialsSection({ materials }: FileRoomMaterialsSectionProps) {
  if (materials.isEmpty) {
    return (
      <FileRoomSectionCard title={materialsConfig.sectionTitle}>
        <p className="fr-kv-list__value">{materialsConfig.emptyBody}</p>
      </FileRoomSectionCard>
    );
  }

  return (
    <FileRoomSectionCard title={materialsConfig.sectionTitle}>
      {materials.blockingRequiredCount > 0 ? (
        <div className="fr-banner" role="status">
          <strong>{materialsConfig.blockingBannerTitle}</strong>
          {materialsConfig.blockingBannerBody} ({materials.blockingRequiredCount} outstanding)
        </div>
      ) : null}

      {materials.groups.map((group) => (
        <div key={group.category} className="fr-scope-group">
          <p className="fr-scope-group__name">{group.categoryLabel}</p>
          <ul className="fr-materials-list">
            {group.items.map((item) => (
              <MaterialRow key={item.id} item={item} />
            ))}
          </ul>
        </div>
      ))}
    </FileRoomSectionCard>
  );
}
