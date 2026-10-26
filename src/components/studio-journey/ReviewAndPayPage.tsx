"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import SecureCheckoutGrid from "@/components/payment/SecureCheckoutGrid";
import ConversationIntakePanel from "@/components/studio-conversation-room/guide/ConversationIntakePanel";
import {
  builderCopyForPackage,
  clipRepurposingPackageDetail,
  getConvertedPackageDetail,
  isPublicLaunchPackageId,
  packageDetailPath,
  RETIRED_CREATIVE_QA_PURCHASE_MESSAGE,
  studioCustomerJourneyCondenseV1,
  type PackageDetailModel,
  type PackageDetailSection,
} from "@/config/studio-customer-journey-condense-v1";
import { conversationRoomGuideV1 } from "@/config/conversation-room-guide-v1";
import { studioPaymentV1 } from "@/config/studio-payment-v1";
import {
  studioExtrasCustomerCopy,
  studioExtrasPackageIncludedLine,
} from "@/config/studio-extras-v1";
import {
  formatThankYouUsd,
  STUDIO_THANK_YOU_DISCOUNT_V1,
  studioThankYouAmount,
} from "@/config/studio-thank-you-discount-v1";
import { startHostedCheckout } from "@/lib/studio-payment/client";
import { intakeLookSurface } from "@/lib/route-map-intake-continuity";
import {
  journeyDraftToIntakeAnswers,
  mergeIntakePreviewIntoDraft,
} from "@/lib/studio-customer-journey-condense/intake-preview";
import type { RouteMapIntakeAnswers } from "@/catalog/intake";
import "@/app/payment.css";
import "@/app/checkout/checkout.css";
import "@/components/project-builder/project-builder-job-details.css";
import type { PaymentPlanSummary } from "@/lib/payment-plan-summary";
import {
  emptyCondensedJourneyDraft,
  readCondensedJourneyDraft,
  selectedStudioExtras,
  selectedSupportLabels,
  writeCondensedJourneyDraft,
  type CondensedJourneyDraft,
} from "@/lib/studio-customer-journey-condense/draft";

import JourneyPageChrome from "./JourneyPageChrome";
import PackageDetailCards from "./PackageDetailCards";

function reviewSections(model: PackageDetailModel): PackageDetailSection[] {
  return model.sections
    .filter(
      (section) =>
        section.id === "price" ||
        section.id === "includes" ||
        section.id === "changes" ||
        section.id === "revision",
    )
    .map((section) => {
      if (section.id !== "includes" || !section.items) return section;
      return {
        ...section,
        items: section.items.filter((item) => item !== studioExtrasPackageIncludedLine(model.id)),
      };
    });
}

function preferenceSummary(draft: CondensedJourneyDraft): string[] {
  if (draft.preferences.studioDecide) {
    return ["The Studio will decide within the original package scope."];
  }
  const lines = [draft.preferences.mustKeep, draft.preferences.mustNotInclude]
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length) return lines;
  return [builderCopyForPackage(draft.packageId).preferences.summaryEmpty];
}

function planSummaryFor(model: PackageDetailModel): PaymentPlanSummary {
  const thankYou = studioThankYouAmount(model.priceCents);
  return {
    lineItems: [
      {
        serviceId: model.id as PaymentPlanSummary["lineItems"][number]["serviceId"],
        name: model.name,
        priceDisplay: model.priceDisplay,
        priceCents: model.priceCents,
        billingType: "one_time",
      },
    ],
    services: [model.name],
    oneTimeSubtotalCents: thankYou.listPriceCents,
    monthlySubtotalCents: 0,
    amountDueTodayCents: thankYou.amountDueCents,
    oneTimeSubtotalDisplay: model.priceDisplay,
    monthlySubtotalDisplay: "$0",
    amountDueTodayDisplay: formatThankYouUsd(thankYou.amountDueCents),
    investmentLabel: "Amount Due Today",
    investmentDisplay: formatThankYouUsd(thankYou.amountDueCents),
    source: "storage",
  };
}

export default function ReviewAndPayPage() {
  const router = useRouter();
  const copy = studioCustomerJourneyCondenseV1;
  const [draft, setDraft] = useState<CondensedJourneyDraft>(() =>
    emptyCondensedJourneyDraft(),
  );
  const [returnNote, setReturnNote] = useState<string | null>(null);
  const [lookingAtIntake, setLookingAtIntake] = useState(false);

  useEffect(() => {
    setDraft(readCondensedJourneyDraft());
  }, []);

  const model =
    getConvertedPackageDetail(draft.packageId) ?? clipRepurposingPackageDetail;
  const thankYou = studioThankYouAmount(model.priceCents);
  const planSummary = useMemo(() => planSummaryFor(model), [model]);
  const purchaseOpen = isPublicLaunchPackageId(draft.packageId);
  const selectedSupport = draft ? selectedSupportLabels(draft) : [];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "cancel") {
      setReturnNote(studioPaymentV1.customerCopy.paymentCancelled);
    }
    if (params.get("look") === "intake") setLookingAtIntake(true);
  }, []);

  async function continueToStripeCheckout() {
    const current = readCondensedJourneyDraft();
    if (!isPublicLaunchPackageId(current.packageId)) return;
    const checkoutCampaignId =
      current.checkoutCampaignId?.trim() ||
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `condensed-${Date.now()}`);
    const saved = writeCondensedJourneyDraft({
      ...current,
      checkoutCampaignId,
    });
    const projectNeed = [
      saved.aboutProject.purpose,
      saved.aboutProject.context,
      saved.aboutProject.cta,
      saved.aboutProject.facts,
    ]
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n");
    const started = await startHostedCheckout({
      campaignId: checkoutCampaignId,
      purchaseKind: "condensed_offer",
      customerEmail: saved.aboutYou.email.trim(),
      facts: {
        draftRevision: 1,
        routeId: null,
        selectedServiceIds: [saved.packageId],
        projectNeed,
        businessName: saved.aboutYou.company.trim() || saved.aboutYou.name.trim(),
        requestedDeadline: "",
        deadlineStatus: "not_requested",
        existingMaterialsNote: saved.upload.materials.trim(),
        riskScanText: projectNeed,
      },
      condensedOffer: {
        packageId: saved.packageId,
        customerName: saved.aboutYou.name.trim(),
        company: saved.aboutYou.company.trim(),
        projectNeed,
        materialsNote: saved.upload.materials.trim(),
        extras: selectedStudioExtras(saved),
        customerAnswers: {
          purpose: saved.aboutProject.purpose,
          context: saved.aboutProject.context,
          cta: saved.aboutProject.cta,
          mustKeep: saved.preferences.mustKeep,
          mustNot: saved.preferences.mustNotInclude,
          qualifyingSource: saved.aboutProject.qualifyingSource,
          intelligible: saved.aboutProject.intelligible,
          rightsConfirmed: saved.aboutProject.rights,
        },
      },
    });
    if (!started.ok) {
      throw new Error(started.message);
    }
    if (started.mode !== "stripe" || !started.url) {
      throw new Error(studioPaymentV1.customerCopy.processorNotConfigured);
    }
    window.location.assign(started.url);
  }

  const intakeLook =
    lookingAtIntake && process.env.NODE_ENV === "development"
      ? intakeLookSurface({
          packageId: draft.packageId,
          packageName: model.name,
          businessName: draft.aboutYou.company.trim() || draft.aboutYou.name.trim(),
          email: draft.aboutYou.email.trim(),
          purpose: draft.aboutProject.purpose.trim(),
          answers: journeyDraftToIntakeAnswers(draft),
        })
      : null;

  function saveIntakePreview(answers: RouteMapIntakeAnswers) {
    const current = readCondensedJourneyDraft();
    const next = mergeIntakePreviewIntoDraft(current, answers);
    if (JSON.stringify(next) === JSON.stringify(current)) return true;
    setDraft(writeCondensedJourneyDraft(next));
    return true;
  }

  if (intakeLook) {
    return (
      <JourneyPageChrome page="review-and-pay">
        <section className="studio-homepage__section">
          <div className="studio-homepage__inner">
            <Link href={copy.routes.reviewAndPay} className="studio-homepage__card-link studio-journey__back">
              ← Back to Review & Pay
            </Link>
            <ConversationIntakePanel
              lookOnly
              lookSurface={intakeLook}
              phonePage
              onClose={() => router.push(copy.routes.reviewAndPay)}
              onSubmitSuccess={() => undefined}
              onPreviewAnswers={saveIntakePreview}
              submitCtaLabel={conversationRoomGuideV1.intakeSubmitCtaSignedIn}
              nextStepBlurb="Your answers stay with this project. Studio Board opens after payment."
            />
          </div>
        </section>
      </JourneyPageChrome>
    );
  }

  return (
    <JourneyPageChrome page="review-and-pay">
      <section className="studio-homepage__section">
        <div className="studio-homepage__inner">
          <Link href={copy.routes.buildYourProject} className="studio-homepage__card-link studio-journey__back">
            ← Back to Build Your Project
          </Link>
          <p className="studio-homepage__kicker">Review & Pay</p>
          <h1
            className="studio-homepage__section-title"
            data-selected-package={model.id}
            data-selected-price={model.priceDisplay}
          >
            Review Your Order
          </h1>
          <p className="studio-homepage__card-detail studio-journey__lead">
            Check the package, your project details, and the price before you pay.
            <br />
            You can correct something first.
          </p>
          <div className="studio-journey__review pb-job-details-surface pb-drawer-details">
            <article className="pb-drawer-details__card pb-drawer-details__card--purpose">
              <h3 className="pb-drawer-details__heading">Selected package</h3>
              <p className="pb-drawer-details__prose">{model.name}</p>
              <p className="pb-drawer-details__prose">Package price: {model.priceDisplay}</p>
              <h3 className="pb-drawer-details__heading">{STUDIO_THANK_YOU_DISCOUNT_V1.title}</h3>
              <p className="pb-drawer-details__prose">
                Studio Thank-You: {formatThankYouUsd(-thankYou.discountCents)}
              </p>
              <p className="pb-drawer-details__prose">{STUDIO_THANK_YOU_DISCOUNT_V1.support}</p>
              <p className="pb-drawer-details__prose">
                Total: {formatThankYouUsd(thankYou.amountDueCents)}
              </p>
              <Link href={packageDetailPath(model.id)} className="studio-homepage__card-link">
                View package
              </Link>
            </article>
            <article className="pb-drawer-details__card pb-drawer-details__card--includes">
              <h3 className="pb-drawer-details__heading">{studioExtrasCustomerCopy.checkoutLabel}</h3>
              <p className="pb-drawer-details__prose" data-review-extras={selectedSupport.join("|")}>
                {selectedSupport.length
                  ? selectedSupport.join(", ")
                  : studioExtrasCustomerCopy.checkoutNone}
              </p>
              {selectedSupport.length ? (
                <p className="pb-drawer-details__prose">{studioExtrasCustomerCopy.checkoutIncluded}.</p>
              ) : null}
              <Link href="/project-builder#support" className="studio-homepage__card-link">
                {copy.correctSomething}
              </Link>
            </article>
            <article className="pb-drawer-details__card pb-drawer-details__card--needs">
              <h3 className="pb-drawer-details__heading">Your details</h3>
              <p className="pb-drawer-details__prose">
                {[draft?.aboutYou.name, draft?.aboutYou.email, draft?.aboutYou.company]
                  .filter((value) => value?.trim())
                  .join(" · ") || "Add your name and email on Build Your Project."}
              </p>
              <p className="pb-drawer-details__prose">
                {draft?.aboutProject.purpose.trim()
                  ? `${
                      builderCopyForPackage(draft.packageId).aboutProject.fields.find(
                        (field) => field.name === "purpose",
                      )?.label ?? "About your project"
                    } ${draft.aboutProject.purpose.trim()}`
                  : "Add the project purpose before paying."}
              </p>
              {draft?.aboutProject.context.trim() ? (
                <p className="pb-drawer-details__prose">{draft.aboutProject.context}</p>
              ) : null}
              {draft?.aboutProject.facts.trim() ? (
                <p className="pb-drawer-details__prose">{draft.aboutProject.facts}</p>
              ) : null}
              {draft?.aboutProject.assets.trim() ? (
                <p className="pb-drawer-details__prose">
                  Files you described: {draft.aboutProject.assets}
                </p>
              ) : null}
              {draft?.aboutProject.cta.trim() ? (
                <p className="pb-drawer-details__prose">
                  Call to action: {draft.aboutProject.cta}
                </p>
              ) : null}
              <Link href="/project-builder#about-you" className="studio-homepage__card-link">
                {copy.correctSomething}
              </Link>
            </article>
            {draft?.packageId && isPublicLaunchPackageId(draft.packageId) ? null : (
            <article className="pb-drawer-details__card pb-drawer-details__card--needs">
              <h3 className="pb-drawer-details__heading">Creative preferences</h3>
              {preferenceSummary(draft).map((line) => (
                <p key={line} className="pb-drawer-details__prose">
                  {line}
                </p>
              ))}
              <Link href="/project-builder#preferences" className="studio-homepage__card-link">
                {copy.correctSomething}
              </Link>
            </article>
            )}
            <article className="pb-drawer-details__card pb-drawer-details__card--needs">
              <h3 className="pb-drawer-details__heading">{copy.reviewMaterialsHeading}</h3>
              <p className="pb-drawer-details__prose">
                {draft?.packageId && isPublicLaunchPackageId(draft.packageId)
                  ? copy.materialsAfterPay
                  : draft?.upload.materials.trim() ||
                    "Add what you will provide after checkout on Build Your Project."}
              </p>
              {draft?.packageId && isPublicLaunchPackageId(draft.packageId) ? null : (
                <p className="pb-drawer-details__prose">{copy.materialsAfterPay}</p>
              )}
              {draft?.packageId && isPublicLaunchPackageId(draft.packageId) ? null : (
              <Link href="/project-builder#upload" className="studio-homepage__card-link">
                {copy.correctSomething}
              </Link>
              )}
            </article>
            <div className="studio-journey__doc">
              <PackageDetailCards name={model.name} sections={reviewSections(model)} />
            </div>
          </div>
          <div data-review-pay="checkout">
            {returnNote ? <p className="studio-journey__lead">{returnNote}</p> : null}
            {purchaseOpen ? null : (
              <p className="studio-journey__lead" role="status">
                {RETIRED_CREATIVE_QA_PURCHASE_MESSAGE}
              </p>
            )}
            {purchaseOpen ? <SecureCheckoutGrid
              layout="full"
              planSummary={planSummary}
              termsLabel={copy.reviewTermsLabel}
              whatsNextSteps={copy.reviewWhatsNext}
              whatsNextReassurance={copy.reviewWhatsNextReassurance}
              confirmSectionTitle={copy.reviewConfirmTitle}
              hideOrderSummary
              paymentLine="reassurance"
              onViewPlanDetails={() => {
                router.push(packageDetailPath(model.id));
              }}
              onPaymentComplete={async () => {
                await continueToStripeCheckout();
              }}
              onSandboxConfirm={async () => {
                router.push(copy.routes.myStudio);
              }}
            /> : null}
          </div>
        </div>
      </section>
    </JourneyPageChrome>
  );
}
