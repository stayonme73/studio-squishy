"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import ProjectDetailsPrefillPanel from "@/components/project-details/ProjectDetailsPrefillPanel";
import ProjectDetailsWizard from "@/components/project-details/ProjectDetailsWizard";
import StudioUtilityBackdrop from "@/components/shared/StudioUtilityBackdrop";
import UtilityPageHeader from "@/components/shared/UtilityPageHeader";
import { projectDetails, resolveApprovedGreenServiceIds, type ProjectDetailsFormValues, type ProjectDetailsUploadedFile } from "@/config/project-details";
import { studioBoard } from "@/config/studio-board";
import { buildProjectDetailsPrefill } from "@/lib/project-details-prefill";
import { readProjectDetailsDraft } from "@/lib/project-details-session";
import {
  isIntakeComplete,
  readCurrentCampaignHydrated,
  submitProjectDetails,
} from "@/lib/studio-board-campaign";
import { utilityPageFontClassName } from "@/lib/utility-page-fonts";

export default function ProjectDetailsWorkspace() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [campaign, setCampaign] = useState(readCurrentCampaignHydrated());

  useLayoutEffect(() => {
    const current = readCurrentCampaignHydrated();
    if (!current?.paymentReceivedAt || !current.approvedStudioPlan) {
      router.replace(studioBoard.routes.projectSummary);
      return;
    }
    if (current.projectDetailsSubmittedAt || isIntakeComplete(current)) {
      router.replace(studioBoard.routes.campaignDetails);
      return;
    }
    setCampaign(current);
    setReady(true);
  }, [router]);

  const serviceIds = useMemo(
    () => resolveApprovedGreenServiceIds(campaign?.approvedStudioPlan),
    [campaign?.approvedStudioPlan],
  );

  const prefill = useMemo(() => buildProjectDetailsPrefill(campaign), [campaign]);
  const draft = campaign ? readProjectDetailsDraft(campaign.campaignId) : null;

  function handleSubmit(form: ProjectDetailsFormValues, files: ProjectDetailsUploadedFile[]) {
    if (!campaign || submitting) return;
    setSubmitting(true);
    const submittedAt = new Date().toISOString();
    submitProjectDetails({ form, files, submittedAt });
    router.push(studioBoard.routes.studioBoard);
  }

  if (!ready || !campaign) return null;

  return (
    <div className={`project-details-page studio-utility-scene studio-utility-scene--header-band ${utilityPageFontClassName}`}>
      <div className="studio-utility-header-band project-details-header-band">
        <UtilityPageHeader
          backHref={studioBoard.routes.studioBoard}
          backLabel="← Studio Board"
          activeNav="payment"
          title={projectDetails.pageTitle}
          lead={projectDetails.pageLead}
          layout="orientation"
        />
      </div>

      <div className="studio-utility-scene__body">
        <StudioUtilityBackdrop placement="below-header" />
        <div className="studio-utility-scene__content">
          <div className="utility-page pd-workspace utility-content">
            <ProjectDetailsPrefillPanel prefill={prefill} />
            <ProjectDetailsWizard
              campaignId={campaign.campaignId}
              serviceIds={serviceIds}
              approvedStudioPlan={campaign.approvedStudioPlan}
              initialForm={draft?.form}
              initialFiles={draft?.files}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
