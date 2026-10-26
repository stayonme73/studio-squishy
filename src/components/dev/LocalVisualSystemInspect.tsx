"use client";

import { useSearchParams } from "next/navigation";

import ConversationCheckoutPanel from "@/components/studio-conversation-room/guide/ConversationCheckoutPanel";
import ProjectIntakeMultiServiceForm from "@/components/studio-conversation-room/guide/ProjectIntakeMultiServiceForm";

/**
 * Local-only visual inspect for Payment + Intake.
 * Does not write the working draft, does not pay, does not submit Maya.
 */
export default function LocalVisualSystemInspect() {
  const params = useSearchParams();
  const surface = params.get("inspect");
  if (surface !== "payment" && surface !== "intake") return null;

  if (surface === "payment") {
    return (
      <ConversationCheckoutPanel
        roadId="i75"
        selectedJobIds={new Set(["v2-rtu-flyer"])}
        onClose={() => undefined}
        onBackToStudioPlan={() => undefined}
        onPaymentComplete={() => undefined}
        onAuthorizePayment={() => false}
        phonePage
      />
    );
  }

  return (
    <ProjectIntakeMultiServiceForm
      selectedServiceIds={["v2-rtu-flyer"]}
      initialDraftAnswers={{}}
      onSaveDraft={() => false}
      onSubmit={() => false}
      submitCtaLabel="Visual inspect only — do not submit"
      nextStepBlurb="This is a local visual inspect. Nothing is saved to a customer project."
    />
  );
}
