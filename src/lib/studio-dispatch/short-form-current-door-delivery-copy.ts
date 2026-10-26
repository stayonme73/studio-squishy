/** Customer-facing Short-Form delivery labels. Safe to import from the delivery room. */

export const SHORT_FORM_CUSTOMER_DELIVERY_FILES = [
  {
    key: "deliverable-0",
    label: "Finished vertical video",
    sourceName: "production.mp4",
    filename: "Short-Form-Video.mp4",
    fileType: "video/mp4",
  },
  {
    key: "deliverable-1",
    label: "Post caption",
    sourceName: "post-caption.txt",
    filename: "Short-Form-Post-Caption.txt",
    fileType: "text/plain",
  },
  {
    key: "deliverable-2",
    label: "Cover",
    sourceName: "cover.png",
    filename: "Short-Form-Cover.png",
    fileType: "image/png",
  },
  {
    key: "deliverable-3",
    label: "Posting guide",
    sourceName: "use-guide.md",
    filename: "Short-Form-Posting-Guide.md",
    fileType: "text/markdown",
  },
] as const;

export function shortFormCustomerDeliveryFacts(input: {
  paidAmountCents: number;
  revisionRounds: number;
}): { paidLabel: string; revisionLabel: string } {
  const dollars = (input.paidAmountCents / 100).toFixed(2);
  const rounds = input.revisionRounds;
  const revisionLabel =
    rounds === 3
      ? "Three revision rounds are included."
      : `${rounds} revision rounds are included.`;
  return { paidLabel: `$${dollars}`, revisionLabel };
}
