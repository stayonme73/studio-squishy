import { studioHomepageLobbyRebuildV1 } from "@/config/studio-homepage-lobby-rebuild-v1";

/**
 * Verified desk facts for ordinary Studio questions.
 * Live checkout, tax, and card brands stay unresolved.
 * No customer record is read here.
 */

export type StudioVoiceGuide = {
  label: string;
  href: string;
};

const home = studioHomepageLobbyRebuildV1;

export const STUDIO_VOICE_ROUTES = {
  packages: "/#packages",
  myStudio: home.myStudioHref,
  help: home.helpHref,
  email: home.studioVoiceEmailHref,
} as const;

const GUIDES = {
  packages: { label: "See the packages", href: STUDIO_VOICE_ROUTES.packages },
  myStudio: { label: "Open My Studio", href: STUDIO_VOICE_ROUTES.myStudio },
  help: { label: "Open Help Center", href: STUDIO_VOICE_ROUTES.help },
  email: { label: "Email The Studio", href: STUDIO_VOICE_ROUTES.email },
} as const satisfies Record<string, StudioVoiceGuide>;

const APPROVED_HREFS = new Set<string>(Object.values(STUDIO_VOICE_ROUTES));

export function isApprovedStudioVoiceGuide(guide: StudioVoiceGuide): boolean {
  return APPROVED_HREFS.has(guide.href) && guide.label.trim().length > 0;
}

const PROCESSOR =
  "Payment counts only after the payment processor confirms it. This page does not collect or store a card.";

const HOW_TO_PAY =
  "Live checkout is not open, so I can't take a payment or confirm which payment methods will be available. When checkout is open, you review the package price and pay through the Studio's payment processor. This page does not collect or store a card. Payment counts only after the payment processor confirms it. You can review the packages now.";

const CARDS =
  "I can't confirm credit cards or any other payment method. Accepted methods are not verified, and live checkout is not open. I will not name a card brand.";

const WHEN =
  "You pay during checkout, after you choose a package and review the price, and before you add files. Live checkout is not open, so that payment cannot be completed today. Payment counts only after the payment processor confirms it.";

const WHERE_CARD =
  "When checkout is open, the card is entered on the payment processor's page. This Studio page does not collect or store a card. Live checkout is not open, so there is no card page to open today. Payment counts only after the payment processor confirms it.";

const FAILED =
  "Payment was not completed. No order was activated. Your project plan is still saved. I will not call that a successful payment.";

const CANCELLED =
  "Checkout was cancelled. Payment did not complete, so no order was activated. Your project plan is still saved. I will not call that a successful payment.";

const CONFIRMATION =
  "I can't see a payment from this desk, and I will not say a payment succeeded. Payment counts only after the payment processor confirms it. Sign in to My Studio if the project is already yours.";

export const STUDIO_VOICE_AFTER_PAYMENT =
  "You choose the package, then review the services and the price, and pay. You add the files in My Studio after checkout. Production begins only after payment is received, Project Intake is complete, the required materials are accepted, and the service is moved into production. The Studio does not promise a delivery date.";

const WHAT_NEXT =
  "You choose one package and review the price. Live checkout is not open, so a payment cannot be completed today. After the payment processor confirms a payment, you complete Project Intake and add the files in My Studio. The Studio creates the work. You publish it. The Studio does not promise a delivery date.";

const CHECKOUT_CLOSED =
  "Live checkout is not open. I can't take a payment from here. You can review the packages and their prices on the homepage.";

const TAX = "Tax is not set up. I will not give a tax amount.";

const CONTACT =
  "You can email The Studio, or open the Help Center for policies and common questions. I will open either one when you choose it.";

const SEE_PACKAGES =
  "The four packages are on the homepage. I can take you to them. You choose.";

const GET_STARTED =
  "Start by choosing a package on the homepage. I can take you to the packages. Live checkout is not open, so choosing a package does not charge you.";

const MY_STUDIO =
  "My Studio is where a signed-in customer sees a project. I can open that page for you. I can't see a project from this chat.";

const HELP =
  "The Help Center has policies, common questions, and guidance. I can open it for you.";

export const STUDIO_VOICE_UNATTACHED_REFUND =
  "I have heard you. I can't attach a refund request to a project from this desk, and I will not grant or deny a refund. Sign in to My Studio if this belongs to a project, or email The Studio.";

export const STUDIO_VOICE_UNATTACHED_COMPLAINT =
  "I have heard you. This is a complaint for the Owner, and I will not decide it. I can't attach it to a project from this desk. Sign in to My Studio if this belongs to a project, or email The Studio.";

const REACH: readonly StudioVoiceGuide[] = [GUIDES.email, GUIDES.myStudio];

export type StudioVoiceCustomerGuidance = {
  say: string;
  guides: readonly StudioVoiceGuide[];
};

function norm(question: string): string {
  return question
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9$ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function has(text: string, pattern: string): boolean {
  return text.includes(pattern);
}

function answer(say: string, guides: readonly StudioVoiceGuide[]): StudioVoiceCustomerGuidance {
  return { say, guides };
}

/**
 * Shared answers are safe with or without a project record.
 * Payment-status answers are public-desk only, so a saved project can still
 * be read by the project path.
 */
export function studioVoiceCustomerGuidance(
  question: string,
  mode: "public" | "shared" = "shared",
): StudioVoiceCustomerGuidance | null {
  const text = norm(question);
  if (!text) return null;

  if (mode === "public") {
    if (has(text, "cancel checkout")) return answer(CANCELLED, [GUIDES.packages]);
    if (
      has(text, "payment failed") ||
      has(text, "card declined") ||
      has(text, "payment did not")
    ) {
      return answer(FAILED, [GUIDES.packages]);
    }
    if (
      has(text, "did my payment") ||
      has(text, "payment go through") ||
      has(text, "was i charged") ||
      has(text, "did you charge") ||
      has(text, "payment confirmed")
    ) {
      return answer(CONFIRMATION, [GUIDES.myStudio]);
    }
  }

  if (
    has(text, "how can i pay") ||
    has(text, "how do i pay") ||
    has(text, "how to pay")
  ) {
    return answer(HOW_TO_PAY, [GUIDES.packages]);
  }
  if (
    has(text, "credit card") ||
    has(text, "accept card") ||
    has(text, "which card") ||
    has(text, "card brand") ||
    has(text, "visa") ||
    has(text, "mastercard") ||
    has(text, "american express") ||
    has(text, "paypal") ||
    has(text, "apple pay")
  ) {
    return answer(CARDS, [GUIDES.packages]);
  }
  if (has(text, "when do i pay") || has(text, "when is payment")) {
    return answer(WHEN, [GUIDES.packages]);
  }
  if (
    has(text, "enter my card") ||
    has(text, "enter a card") ||
    (has(text, "where do i enter") && has(text, "card")) ||
    has(text, "store my card") ||
    has(text, "pay on this page")
  ) {
    return answer(WHERE_CARD, [GUIDES.packages]);
  }
  if (
    has(text, "what happens after") ||
    has(text, "after i pay") ||
    has(text, "after payment")
  ) {
    return answer(STUDIO_VOICE_AFTER_PAYMENT, [GUIDES.myStudio]);
  }
  if (has(text, "what happens next")) return answer(WHAT_NEXT, [GUIDES.packages]);
  if (
    has(text, "checkout open") ||
    has(text, "checkout disabled") ||
    has(text, "live checkout") ||
    has(text, "can i check out")
  ) {
    return answer(CHECKOUT_CLOSED, [GUIDES.packages]);
  }
  if (has(text, "tax")) return answer(TAX, []);
  if (
    has(text, "how do i contact") ||
    has(text, "contact the studio") ||
    has(text, "email the studio") ||
    has(text, "how do i email")
  ) {
    return answer(CONTACT, [GUIDES.email, GUIDES.help]);
  }
  if (
    has(text, "where can i see the packages") ||
    has(text, "where can i see packages") ||
    has(text, "where are the packages") ||
    has(text, "see the packages")
  ) {
    return answer(SEE_PACKAGES, [GUIDES.packages]);
  }
  if (
    has(text, "how do i get started") ||
    has(text, "how do i start") ||
    has(text, "get started")
  ) {
    return answer(GET_STARTED, [GUIDES.packages]);
  }
  if (has(text, "where is my studio") || has(text, "open my studio")) {
    return answer(MY_STUDIO, [GUIDES.myStudio]);
  }
  if (
    has(text, "where can i get help") ||
    has(text, "help center") ||
    has(text, "where is help")
  ) {
    return answer(HELP, [GUIDES.help]);
  }
  return null;
}

export function studioVoiceGuidesForQuestion(question: string): readonly StudioVoiceGuide[] {
  const guided = studioVoiceCustomerGuidance(question, "public");
  if (guided) return guided.guides.filter(isApprovedStudioVoiceGuide);
  const text = norm(question);
  if (has(text, "refund") || has(text, "money back") || has(text, "complaint") || has(text, "complain")) {
    return REACH.filter(isApprovedStudioVoiceGuide);
  }
  return [];
}

/** Facts the model may use. Same routes and limits as the spoken desk. */
export function studioVoiceDeskFacts() {
  return {
    liveCheckoutOpen: false as const,
    taxResolved: false as const,
    acceptedPaymentMethods: "not_verified" as const,
    paymentConfirmedBy: "processor_only" as const,
    publicDeskCanReadPayments: false as const,
    processorRule: PROCESSOR,
    routes: STUDIO_VOICE_ROUTES,
    answers: {
      howToPay: HOW_TO_PAY,
      cards: CARDS,
      whenToPay: WHEN,
      whereCard: WHERE_CARD,
      failed: FAILED,
      cancelled: CANCELLED,
      confirmationFromPublicDesk: CONFIRMATION,
      afterPayment: STUDIO_VOICE_AFTER_PAYMENT,
      whatNext: WHAT_NEXT,
      checkoutClosed: CHECKOUT_CLOSED,
      tax: TAX,
      contact: CONTACT,
      packages: SEE_PACKAGES,
      getStarted: GET_STARTED,
      myStudio: MY_STUDIO,
      help: HELP,
      unattachedRefund: STUDIO_VOICE_UNATTACHED_REFUND,
      unattachedComplaint: STUDIO_VOICE_UNATTACHED_COMPLAINT,
    },
  };
}
