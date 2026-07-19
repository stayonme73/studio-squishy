import type { GuideCaptureDraftV1 } from "@/lib/studio-guide-capture";

/** Hidden GET fields so the server can rebuild the full draft without localStorage. */
export default function GuideDraftCarryFields({
  draft,
}: {
  draft: GuideCaptureDraftV1;
}) {
  return (
    <>
      <input type="hidden" name="g_name" value={draft.preferredName} />
      <input type="hidden" name="g_need" value={draft.projectNeed} />
      <input type="hidden" name="g_biz" value={draft.businessName} />
      <input type="hidden" name="g_deadline" value={draft.requestedDeadline} />
      <input
        type="hidden"
        name="g_materials"
        value={draft.existingMaterialsNote}
      />
    </>
  );
}
