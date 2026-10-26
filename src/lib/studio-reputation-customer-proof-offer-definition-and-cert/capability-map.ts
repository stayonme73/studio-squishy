export type FactoryReadiness =
  | "READY"
  | "READY_WITH_EXPLICIT_LIMITS"
  | "PARTIAL"
  | "MISSING"
  | "DO_NOT_USE";

export type FactoryCapabilityRow = {
  id: string;
  label: string;
  readiness: FactoryReadiness;
  note: string;
};

export function reputationProofFactoryCapabilityMap(): readonly FactoryCapabilityRow[] {
  return [
    {
      id: "review_request_copy",
      label: "Review-request copy",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Email/SMS copy factories exist. V1 writes one text and one email from supplied name, link, and CTA.",
    },
    {
      id: "email_text_copy",
      label: "Email / text copy",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Same copy path. Not the live email-kit SKU. Customer sends it.",
    },
    {
      id: "qr_print_asset",
      label: "QR / print review card",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "qrcode is already in the factory. V1 writes a portrait HTML card. Destination is customer-supplied. Not fetched. Flyer factory is not used.",
    },
    {
      id: "testimonial_graphics",
      label: "Testimonial quote graphics",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Square 1024×1024 and portrait 1024×1536 HTML plates. Exact supplied quote only. Not a new design family and not the promo-offer pipeline.",
    },
    {
      id: "social_proof_graphics",
      label: "Social-proof graphics",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "The two quote plates are the V1 social-proof set. No star badges. No invented collage.",
    },
    {
      id: "caption_generation",
      label: "Caption generation",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "One caption from the same supplied quote, name, business, and CTA.",
    },
    {
      id: "video_testimonial",
      label: "Video testimonial editing",
      readiness: "DO_NOT_USE",
      note: "Clip and Short-Form are separate headline video jobs. V1 does not cut testimonial video or use AI actors.",
    },
    {
      id: "claims_fact_gating",
      label: "Fact / claims gating",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Studio voice cannot invent reviews, stars, rankings, leads, or sales. Customer quotes stay verbatim.",
    },
    {
      id: "rights_confirmation",
      label: "Rights confirmation",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Customer must attest permission. Studio does not contact the original reviewer or verify the platform post.",
    },
    {
      id: "revision",
      label: "Revision",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "One included kit revision for CTA or a supplied factual correction.",
    },
    {
      id: "qa",
      label: "QA",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Rights, destination, quote-preservation, and claim gates run before files are written.",
    },
    {
      id: "final_delivery",
      label: "Final delivery",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Per-campaign artifact root. Customer sends and posts.",
    },
    {
      id: "isolation",
      label: "Customer isolation",
      readiness: "READY_WITH_EXPLICIT_LIMITS",
      note: "Artifact root is data/campaign-design-artifacts/${campaignId}/reputation-proof-v1.",
    },
    {
      id: "account_login",
      label: "Account login / review management",
      readiness: "DO_NOT_USE",
      note: "Customer owns accounts, sending, replies, and publishing.",
    },
  ];
}
