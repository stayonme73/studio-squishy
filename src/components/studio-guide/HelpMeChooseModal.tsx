"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import {
  paymentHref,
  packageStartCta,
  studioGuide,
  type StudioGuidePackageId,
} from "@/config/studio-guide";
import {
  packageIndexForId,
  recommendPackage,
  type FirstCampaignAnswer,
  type InvolvementAnswer,
  type QuestionnaireAnswers,
  type SupportFrequencyAnswer,
} from "@/lib/recommendPackage";

type Props = {
  open: boolean;
  onClose: () => void;
  onRecommended: (packageId: StudioGuidePackageId) => void;
};

type Step = 0 | 1 | 2 | "result";

const INITIAL_ANSWERS: Partial<QuestionnaireAnswers> = {};

export default function HelpMeChooseModal({ open, onClose, onRecommended }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<Partial<QuestionnaireAnswers>>(INITIAL_ANSWERS);
  const [recommendedId, setRecommendedId] = useState<StudioGuidePackageId | null>(null);

  const reset = useCallback(() => {
    setStep(0);
    setAnswers(INITIAL_ANSWERS);
    setRecommendedId(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const finishQuestionnaire = useCallback(
    (finalAnswers: QuestionnaireAnswers) => {
      const id = recommendPackage(finalAnswers);
      setRecommendedId(id);
      setStep("result");
      onRecommended(id);
    },
    [onRecommended],
  );

  const selectFirstCampaign = (value: FirstCampaignAnswer) => {
    const next = { ...answers, firstCampaign: value };
    setAnswers(next);
    setStep(1);
  };

  const selectSupportFrequency = (value: SupportFrequencyAnswer) => {
    const next = { ...answers, supportFrequency: value };
    setAnswers(next);
    setStep(2);
  };

  const selectInvolvement = (value: InvolvementAnswer) => {
    const next = { ...answers, involvement: value } as QuestionnaireAnswers;
    setAnswers(next);
    finishQuestionnaire(next);
  };

  const goToPayment = () => {
    if (!recommendedId) return;
    router.push(paymentHref(recommendedId));
    handleClose();
  };

  if (!open) return null;

  const recommendedPkg = studioGuide.packages.find((p) => p.id === recommendedId);

  return (
    <div className="guide-modal-backdrop" role="presentation" onClick={handleClose}>
      <div
        className="guide-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="guide-modal-close" onClick={handleClose} aria-label="Close">
          ×
        </button>

        {step === "result" && recommendedPkg ? (
          <div className="guide-modal-result">
            <p className="guide-modal-result-eyebrow">{studioGuide.questionnaire.resultPrefix}</p>
            <h2 id="guide-modal-title" className="guide-modal-result-package">
              {recommendedPkg.label}
            </h2>
            <p className="guide-modal-result-copy">{recommendedPkg.recommendationCopy}</p>
            <button type="button" className="guide-detail-cta" onClick={goToPayment}>
              <span className="guide-detail-cta-label">{packageStartCta(recommendedPkg.id)}</span>
            </button>
          </div>
        ) : (
          <>
            <h2 id="guide-modal-title" className="guide-modal-title">
              {studioGuide.helpCard.title}
            </h2>
            <p className="guide-modal-progress">
              Question {(step as number) + 1} of {studioGuide.questionnaire.questions.length}
            </p>
            <p className="guide-modal-prompt">
              {studioGuide.questionnaire.questions[step as number].prompt}
            </p>
            <ul className="guide-modal-options">
              {studioGuide.questionnaire.questions[step as number].options.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className="guide-modal-option"
                    onClick={() => {
                      if (step === 0) selectFirstCampaign(option.value as FirstCampaignAnswer);
                      else if (step === 1)
                        selectSupportFrequency(option.value as SupportFrequencyAnswer);
                      else selectInvolvement(option.value as InvolvementAnswer);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
