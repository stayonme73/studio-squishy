import FeedbackStudioReviewWorkspace from "@/components/feedback-studio/FeedbackStudioReviewWorkspace";
import { conceptOptionTitle } from "@/components/feedback-studio/FeedbackStudioConceptPicker";
import type { FeedbackConceptPreview } from "@/config/feedback-studio";
import type { CampaignRecord } from "@/config/studio-board";

type Props = {
  concept: FeedbackConceptPreview;
  campaign: CampaignRecord;
  campaignTitle: string;
  campaignId: string;
  pickerHref: string;
  revisionStatus: string;
  selectedOptionTitle: string | null;
  onSelect: () => void;
};

/** Dedicated review view — delegates to interactive workspace. */
export default function FeedbackStudioConceptReview(props: Props) {
  return <FeedbackStudioReviewWorkspace {...props} />;
}

export { conceptOptionTitle };
