import { studioAiLocalVisibilityOfferDefinitionAndCertV1 as pack } from "@/config/studio-ai-local-visibility-offer-definition-and-cert-v1";
import {
  evaluateLocalVisibilityFacts,
  type LocalVisibilityIntake,
} from "./facts";

export type LocalVisibilityPack = {
  claritySummary: string;
  businessDescription: string;
  serviceWording: string;
  faqs: readonly { question: string; answer: string }[];
  checklist: string;
  implementationGuide: string;
};

function serviceList(intake: LocalVisibilityIntake): string {
  if (intake.services.length === 1) return intake.services[0]!;
  if (intake.services.length === 2) {
    return `${intake.services[0]} and ${intake.services[1]}`;
  }
  return `${intake.services.slice(0, -1).join(", ")}, and ${intake.services.at(-1)}`;
}

export function assembleLocalVisibilityPack(
  intake: LocalVisibilityIntake,
): { ok: true; pack: LocalVisibilityPack } | { ok: false; message: string } {
  const services = serviceList(intake);
  const businessDescription = [
    `${intake.businessName} in ${intake.city}.`,
    `We offer ${services}.`,
    intake.address ? `Located at ${intake.address}.` : "",
    intake.hours ? `Hours: ${intake.hours}.` : "",
    intake.phone ? `Call ${intake.phone}.` : "",
    intake.websiteUrl ? `Website ${intake.websiteUrl}.` : "",
    intake.requiredDisclosure ?? "",
  ]
    .filter((line) => line.trim())
    .join(" ");

  const serviceWording = `${intake.businessName} services: ${services}.`;

  const faqs = [
    {
      question: `What services does ${intake.businessName} offer?`,
      answer: services,
    },
    {
      question: `Where is ${intake.businessName}?`,
      answer: [intake.city, intake.address].filter(Boolean).join(". "),
    },
    ...(intake.hours
      ? [
          {
            question: `What are the hours at ${intake.businessName}?`,
            answer: intake.hours,
          },
        ]
      : []),
    ...(intake.phone
      ? [
          {
            question: `How do I contact ${intake.businessName}?`,
            answer: [intake.phone, intake.websiteUrl].filter(Boolean).join(". "),
          },
        ]
      : []),
  ];

  const factTexts = [
    businessDescription,
    serviceWording,
    ...faqs.map((item) => item.answer),
  ];
  const gate = evaluateLocalVisibilityFacts(intake, factTexts);
  if (!gate.ok) return { ok: false, message: gate.message };

  const missing: string[] = [];
  if (!intake.address) missing.push("address");
  if (!intake.phone) missing.push("phone");
  if (!intake.hours) missing.push("hours");
  if (!intake.websiteUrl) missing.push("website");

  const claritySummary = [
    `${intake.businessName} is a ${intake.city} business.`,
    `Customer-supplied services: ${services}.`,
    missing.length
      ? `Missing facts left blank on purpose: ${missing.join(", ")}. The Studio did not invent them.`
      : "Name, city, services, and contact facts were supplied.",
    intake.websiteUrl
      ? `Website was recorded as the customer-stated label ${intake.websiteUrl}. The Studio did not open or scrape it.`
      : "No website was supplied.",
  ].join(" ");

  return {
    ok: true,
    pack: {
      claritySummary,
      businessDescription,
      serviceWording,
      faqs,
      checklist: [
        "Use the same business name on every profile.",
        "Use the same address, phone, hours, and website if you have them.",
        "Do not add services, awards, or years the Studio did not write.",
        pack.customerCopy.accountBoundary,
      ].join("\n"),
      implementationGuide: [
        "1. Open your own Google Business Profile, website, or directory. The Studio will not log in.",
        "2. Paste the short business description.",
        "3. Paste the service wording into categories or services.",
        "4. Add the FAQ answers only where the platform lets you.",
        "5. Check the consistency checklist before you publish.",
        "6. You own publishing, implementation, and profile changes.",
      ].join("\n"),
    },
  };
}
