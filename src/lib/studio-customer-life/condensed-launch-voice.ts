/**
 * Studio Voice answers for the three-package customer door.
 * Prices, scope, revisions, files, payment, and policy come from the
 * current launch record. This does not quote the older Launch Now shelf.
 */

import { CONDENSED_SUPPORT_OPTIONS } from "@/config/studio-customer-journey-condense-v1";
import {
  STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1,
  threePackageRevisionCustomerAnswer,
} from "@/config/studio-three-package-revision-truth-v1";

const truth = STUDIO_THREE_PACKAGE_REVISION_TRUTH_V1;

const OFFERS =
  "The Studio currently offers three packages. Clip Repurposing is $399. Short-Form Video Editing is $249. Social & Promo Graphics is $199. Each includes three revision rounds. You choose.";

const REVISION = threePackageRevisionCustomerAnswer;

const NO_DATE =
  "The Studio does not promise a delivery date. I will not give a number of days, a rush time, or a guaranteed completion date.";

const FILES =
  "You add the actual files in My Studio after checkout. You do not upload them before you pay. The Studio does not take project files by email, and you do not use the staff File Room.";

const STRIPE =
  "You enter your card on Stripe. The Studio page does not collect your card and does not store it. Payment is confirmed only after Stripe confirms it. If checkout is cancelled, payment is not confirmed, and your project is still saved.";

const NO_PASSWORDS =
  "No. The Studio does not take passwords and does not log into your social, ads, email, review, or Google Business accounts. The Studio creates the work and delivers the files. You decide where and when to publish them. The Studio does not post for you, run your ads, send your emails, or manage your accounts.";

const NO_RESULTS =
  "No. The Studio does not guarantee sales, views, followers, rankings, or leads.";

const CHOOSE =
  "Tell me what you have, and you still choose. A long vertical recording for The Studio to search is Clip Repurposing at $399. English clips or marked moments you already chose are Short-Form Video Editing at $249. Graphics for a promotion are Social & Promo Graphics at $199. I will not choose the package for you.";

const PRODUCTION =
  "Production begins on a service only when payment has been received, Project Intake is complete, the required materials have been reviewed and accepted, and the service has been moved into production. Paying, finishing intake, or storing a file does not by itself start production. The Studio does not promise a delivery date.";

function support(id: (typeof CONDENSED_SUPPORT_OPTIONS)[number]["id"]): string {
  const option = CONDENSED_SUPPORT_OPTIONS.find((item) => item.id === id);
  return option ? `${option.label}. ${option.detail}` : "";
}

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

function testedCountryCheckout(country: string): string {
  return `Test checkout accepted a ${country} billing country and a ${country} test card, and the package price stayed in US dollars. Live charges are not on, tax is not set up, and a local-currency price was not shown. Clip Repurposing requires an English recording. Short-Form Video Editing requires English source clips. I will not call that worldwide.`;
}

/**
 * Returns the customer sentence for a three-package question, or null when
 * this question belongs to a saved project record or an older shelf line.
 */
export function answerCondensedLaunchVoice(question: string): string | null {
  const text = norm(question);
  if (!text) return null;

  if (has(text, "from canada") || has(text, "buy from canada")) {
    return testedCountryCheckout("Canada");
  }
  if (
    has(text, "united kingdom") ||
    has(text, "from the uk") ||
    has(text, "buy from the uk")
  ) {
    return testedCountryCheckout("United Kingdom");
  }
  if (has(text, "from australia") || has(text, "buy from australia")) {
    return testedCountryCheckout("Australia");
  }
  if (
    has(text, "outside the united states") ||
    has(text, "outside the us") ||
    (has(text, "serve") && has(text, "outside"))
  ) {
    return "Test checkout accepted billing countries and test cards for Canada, the United Kingdom, Australia, and Germany, and the package price stayed in US dollars. The three packages are delivered digitally. Live charges are not on, tax is not set up, and a local-currency price was not shown. Clip Repurposing requires an English recording. Short-Form Video Editing requires English source clips. I will not say The Studio is worldwide.";
  }
  if (has(text, "what currency") || has(text, "currency do you")) {
    return "The Studio sends the package price in US dollars. Clip Repurposing is $399, Short-Form Video Editing is $249, and Social & Promo Graphics is $199. Test checkout kept that US-dollar price. A local-currency price was not shown. I will not add a currency promise beyond that.";
  }
  if (has(text, "other language") || has(text, "another language")) {
    return "These answers and the Studio site are in English. Clip Repurposing requires an English recording. Short-Form Video Editing requires English source clips. Social & Promo Graphics uses the facts you supply. I do not offer the video packages in another language.";
  }

  if (has(text, "social post") || (has(text, "instagram") && !has(text, "password"))) {
    return "Social posts are part of Social & Promo Graphics. That package is $199 and includes three revision rounds: 4 coordinated square posts, matching captions, a suggested posting order, and 2 campaign graphics. You post them.";
  }
  if (has(text, "did my payment") || has(text, "payment go through")) return null;
  if (has(text, "receive my revision") || has(text, "got my revision")) return null;
  if (has(text, "i want a refund")) return null;

  if (has(text, "549") || (has(text, "clip") && has(text, "549"))) {
    return "No. Clip Repurposing is $399, not $549. It includes three revision rounds.";
  }
  if (has(text, "349") || (has(text, "short form") && has(text, "349"))) {
    return "No. Short-Form Video Editing is $249, not $349. It includes three revision rounds.";
  }
  if (has(text, "social") && has(text, "99")) {
    return "No. Social & Promo Graphics is $199, not $99. It includes three revision rounds.";
  }

  if (has(text, "what packages") || has(text, "packages do you offer") || has(text, "what do you offer")) {
    return OFFERS;
  }

  if (has(text, "difference") && has(text, "clip") && has(text, "short")) {
    return "Clip Repurposing is $399. You provide one 15 to 60 minute English recording, filmed vertically, with one primary speaker, and The Studio finds the moments. Short-Form Video Editing is $249. You provide the English clips or marked moments, up to 3, each up to 45 seconds, and The Studio does not search a long recording. Both include three revision rounds. You post the finished videos.";
  }

  if (has(text, "30 minute") || has(text, "30-minute") || has(text, "long podcast") || has(text, "long recording")) {
    return "A long recording for The Studio to search fits Clip Repurposing when it is one 15 to 60 minute English recording, filmed vertically, with one primary speaker. That package is $399. If the recording does not fit that, tell me more. I will not put it on Short-Form, because Short-Form does not search a long recording.";
  }

  if (
    has(text, "three clips") ||
    has(text, "3 clips") ||
    has(text, "already know") ||
    has(text, "20 second") ||
    has(text, "20-second")
  ) {
    return "English clips or marked moments you already chose fit Short-Form Video Editing. It is $249 and includes up to 3 polished videos. Each clip or marked moment can be up to 45 seconds. The Studio does not search a long recording on that package.";
  }

  if (has(text, "graphics for a promotion") || has(text, "need graphics") || has(text, "promotion graphics")) {
    return "Graphics for a promotion fit Social & Promo Graphics. It is $199 and includes one theme, 4 coordinated square posts, matching captions, a suggested posting order, and 2 campaign graphics. You post them.";
  }

  if (has(text, "short form") && (has(text, "search") || has(text, "long video"))) {
    return "No. Short-Form Video Editing does not search a long recording. You choose the clips or marked moments. If you want The Studio to search one long vertical recording, that is Clip Repurposing at $399.";
  }

  if (has(text, "cover") && has(text, "clip")) {
    return "No. Clip Repurposing does not include designed covers. Short-Form Video Editing does include cover and title graphics.";
  }

  if (has(text, "how many posts") || (has(text, "posts") && has(text, "social and promo"))) {
    return "Social & Promo Graphics includes 4 coordinated square posts, matching captions, a suggested posting order, and 2 campaign graphics, a 1024 by 1024 PNG and a 1024 by 1536 PNG. It is $199.";
  }

  if (has(text, "how many clips") || (has(text, "how many") && has(text, "clip repurposing"))) {
    return "Clip Repurposing includes up to 5 polished vertical shorts, depending on the strength and number of distinct moments. Five is the maximum, not a guarantee. It is $399.";
  }

  if (has(text, "how long can") || (has(text, "45") && has(text, "short"))) {
    return "On Short-Form Video Editing, each clip or marked moment can be up to 45 seconds. The Studio may look slightly before or after a moment you marked so the opening, ending, or thought is complete. It does not search a long recording.";
  }

  if (has(text, "clip repurposing") && (has(text, "how much") || has(text, "included") || has(text, "what is clip"))) {
    if (has(text, "included") || has(text, "what is clip")) {
      return "Clip Repurposing is $399. You provide one 15 to 60 minute English recording, filmed vertically, with one primary speaker. The Studio finds the strongest moments and finishes up to 5 polished vertical shorts, with captions and a posting companion. It does not include designed covers, posting, passwords, or a performance guarantee. Three revision rounds are included. You add the recording in My Studio after checkout.";
    }
    return "Clip Repurposing is $399. It includes three revision rounds.";
  }

  if (has(text, "short form") && (has(text, "how much") || has(text, "included") || has(text, "what is short"))) {
    if (has(text, "included") || has(text, "what is short")) {
      return "Short-Form Video Editing is $249. You provide up to 3 English clips or marked moments you already chose, each up to 45 seconds. The Studio polishes them and includes captions, cover and title graphics, and a simple posting guide. It does not search a long recording. Three revision rounds are included. You add the files in My Studio after checkout.";
    }
    return "Short-Form Video Editing is $249. It includes three revision rounds.";
  }

  if (
    (has(text, "social and promo") || has(text, "promo graphics")) &&
    (has(text, "how much") || has(text, "included") || has(text, "what is social"))
  ) {
    if (has(text, "included") || has(text, "what is social")) {
      return "Social & Promo Graphics is $199. It includes one visual theme, 4 coordinated square posts, matching captions, a suggested posting order, and 2 campaign graphics. It does not include video, posting, passwords, or a performance guarantee. It is designed for digital use, not professional print production. Three revision rounds are included. You add logos and photos in My Studio after checkout.";
    }
    return "Social & Promo Graphics is $199. It includes three revision rounds.";
  }

  if (
    has(text, "revision round") ||
    has(text, "how many revision") ||
    has(text, "one revision") ||
    has(text, "during revision") ||
    has(text, "as a revision") ||
    has(text, "what counts as one")
  ) {
    return REVISION;
  }

  if (
    has(text, "upload") ||
    has(text, "add my video") ||
    has(text, "email the file") ||
    has(text, "file room") ||
    has(text, "file type") ||
    has(text, "how big") ||
    has(text, "audio is clear") ||
    has(text, "need a logo") ||
    has(text, "call to action required")
  ) {
    if (has(text, "file type") || has(text, "how big") || has(text, "audio")) {
      return `${FILES} Talking-head video can be an MP4 or MOV up to 250 MB. Other files can be up to 5 MB, including PNG, JPG, PDF, Word, text, MP3, and WAV. The Studio checks the file type and the file size. It does not automatically check length, audio clarity, or how many people are speaking.`;
    }
    if (has(text, "logo")) {
      return "A logo is optional for Social & Promo Graphics. If you have one, you add it in My Studio after checkout. Facts the graphics need are required. Photos are optional.";
    }
    if (has(text, "call to action")) {
      return "A call to action is optional. You can skip it. If you have wording, you can add it. You still add any files in My Studio after checkout.";
    }
    return FILES;
  }

  if (
    has(text, "enter my card") ||
    has(text, "store my card") ||
    has(text, "payment confirmed") ||
    has(text, "cancel checkout") ||
    has(text, "pay on this page") ||
    has(text, "optional support") && has(text, "price") ||
    has(text, "cost more")
  ) {
    if (has(text, "optional") || has(text, "cost more")) {
      return "Optional support does not change the package price. Clip Repurposing stays $399, Short-Form Video Editing stays $249, and Social & Promo Graphics stays $199.";
    }
    return STRIPE;
  }

  if (
    has(text, "how long") ||
    has(text, "three days") ||
    has(text, "3 days") ||
    has(text, "delivery date") ||
    has(text, "guarantee a delivery") ||
    has(text, "rush") ||
    has(text, "business day") ||
    has(text, "48 hour") ||
    has(text, "72 hour")
  ) {
    if (has(text, "48")) {
      return "No. The Studio does not send a 48-hour reminder. My Studio is where you see the current step. The Studio does not promise a delivery date.";
    }
    if (has(text, "72")) {
      return "No. The Studio does not pause your project on a 72-hour clock. If something required is still missing, that part waits, and My Studio shows what is still needed. The Studio does not promise a delivery date.";
    }
    return NO_DATE;
  }

  if (
    has(text, "password") ||
    has(text, "log into") ||
    has(text, "post this for me") ||
    has(text, "post for me") ||
    has(text, "manage my social") ||
    has(text, "run my ads") ||
    has(text, "send the email")
  ) {
    return NO_PASSWORDS;
  }

  if (
    has(text, "more sales") ||
    has(text, "guarantee views") ||
    has(text, "grow my follower") ||
    has(text, "rank on google") ||
    has(text, "number of leads") ||
    has(text, "performance")
  ) {
    return NO_RESULTS;
  }

  if (has(text, "reputation")) return support("reputation_customer_proof");
  if (has(text, "ad creative")) return support("ad_creative");
  if (has(text, "email and text") || has(text, "email text")) return support("email_and_text");
  if (has(text, "price list") || has(text, "menu or price")) {
    return `${support("menu_price_list")} This is optional support on Social & Promo Graphics. It does not change the $199 package price.`;
  }
  if (has(text, "local visibility") || has(text, "ai and local")) {
    return `${support("ai_local_visibility")} This is optional support on Social & Promo Graphics. It does not change the $199 package price.`;
  }
  if (has(text, "google listing") || has(text, "update my listing")) {
    return "No. The Studio does not update your listings. AI + Local Visibility is a written summary from details you supply, with no ranking promise.";
  }
  if (has(text, "optional support") || has(text, "what can i add")) {
    return "You can add Reputation & Customer Proof, Ad Creative, and Email & Text, or skip them. On Social & Promo Graphics you can also add Menu / Price List and AI + Local Visibility. Optional support does not change the package price. The Studio still does not post, send, or run the ads for you.";
  }

  if (has(text, "14 day") || has(text, "refund automatically")) {
    return "No. A refund is not automatic after 14 days. A refund may be approved before production starts on that service. After production starts, payment for that service is non-refundable. I will not grant or deny a refund myself.";
  }

  if (has(text, "buy all three") || has(text, "more than one package") || has(text, "all three")) {
    return "You choose one package. On Build Your Project you can add optional support when it fits, or skip it. Optional support does not replace the package, and it does not change the package price.";
  }

  if (has(text, "which one should i buy") || has(text, "what do i need") || has(text, "which package")) {
    return CHOOSE;
  }

  if (has(text, "can you do this") || has(text, "whatever you think") || has(text, "make it pop") || text === "i don t know" || has(text, "i dont know")) {
    return `${CHOOSE} I will not invent a direction or a customer fact.`;
  }

  if (has(text, "what happens next") || text === "hello") {
    return "You choose one package, review it, and pay on Stripe. Then you complete Project Intake and add the files in My Studio. The Studio creates the work. You publish it. The Studio does not promise a delivery date.";
  }

  if (has(text, "when does production start") || has(text, "when does production begin")) {
    return PRODUCTION;
  }

  if (has(text, "who owns")) {
    return "The Studio creates the work and delivers the files. You decide where and when to publish them. I will not invent a separate ownership rule.";
  }

  if (has(text, "photo i found") || has(text, "photo from google")) {
    return "You need permission to use the materials you supply. A photo found on Google is not automatically yours to use. I will not decide that the photo is allowed.";
  }

  if (has(text, "can i get a refund")) {
    return "A refund may be approved before production starts on that service. After production starts, payment for that service is non-refundable. I will not grant or deny a refund myself.";
  }

  return null;
}
