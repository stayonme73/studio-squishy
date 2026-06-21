import { feedbackStudio } from "@/config/feedback-studio";

type Props = {
  status: string;
};

/** Revision round indicator — standalone status card. */
export default function FeedbackStudioRevisionStatus({ status }: Props) {
  return (
    <div className="fs-status-card" aria-label={`${feedbackStudio.reviewStatus.label}: ${status}`}>
      <span className="fs-status-card__label">{feedbackStudio.reviewStatus.label}</span>
      <span className="fs-status-card__value">{status}</span>
    </div>
  );
}
