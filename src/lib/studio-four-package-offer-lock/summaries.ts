import { fourPackageHeadlines } from "@/config/studio-four-package-offer-lock-v1";
import { supportOptionsForHeadline } from "./combinations";
import { fourPackageCustomerTruth } from "./customer-truth";

export function draftPackageSummary(headlineId: keyof typeof fourPackageHeadlines) {
  const headline = fourPackageHeadlines[headlineId];
  const truth = fourPackageCustomerTruth[headlineId];
  const support = supportOptionsForHeadline(headlineId);
  return {
    packageName: headline.name,
    oneSentence: truth.whatThisIs,
    whatsIncluded: truth.customerReceives,
    availableIncludedChoices: support.map((row) => ({
      id: row.id,
      fit: row.fit,
      defaultChoice: row.defaultChoice,
    })),
    whatCustomerHandles: truth.afterDelivery,
    whatIsNotIncluded: truth.whatItDoesNotDo,
    doNotPublish: true,
  };
}
