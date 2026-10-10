/**
 * Studio Thank-You on the current three-package purchase.
 * 20% once, on the complete package price. Revealed at Review & Pay.
 * The client cannot supply the percentage or the amount.
 */

export const STUDIO_THANK_YOU_DISCOUNT_V1 = {
  id: "studio-thank-you-discount-v1" as const,
  percent: 20 as const,
  title: "Studio Thank-You — 20% off" as const,
  support: "A thank-you from The Studio for choosing us." as const,
  appliesTo: "current_package_purchase" as const,
  notAFutureOrderDiscount: true as const,
  notACoupon: true as const,
  separateCashValue: false as const,
} as const;

export type StudioThankYouAmount = {
  listPriceCents: number;
  discountCents: number;
  amountDueCents: number;
  percent: 20;
};

/** Integer cents. 20% of each current package price divides evenly. */
export function studioThankYouAmount(listPriceCents: number): StudioThankYouAmount {
  const discountCents = Math.round(
    (listPriceCents * STUDIO_THANK_YOU_DISCOUNT_V1.percent) / 100,
  );
  return {
    listPriceCents,
    discountCents,
    amountDueCents: listPriceCents - discountCents,
    percent: STUDIO_THANK_YOU_DISCOUNT_V1.percent,
  };
}

export function formatThankYouUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return (
    sign +
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(cents) / 100)
  );
}
