import type { CampaignRecord } from "@/config/studio-board";
import { readProjectIntakeAnswer } from "@/lib/project-intake-plan";
import type { CopyProducerFacts } from "@/lib/studio-copy-production";

export function mapCopyFactsFromCampaign(input: {
  campaign: CampaignRecord;
  skuId: "v2-rtu-email-kit" | "v2-rtu-sms-kit";
}): CopyProducerFacts {
  const answers = input.campaign.routeMapIntake?.answers;
  const skuId = input.skuId;
  return {
    skuId,
    businessName:
      readProjectIntakeAnswer(answers, "businessName", skuId) ||
      input.campaign.campaignName,
    campaignGoal: readProjectIntakeAnswer(answers, "campaignGoal", skuId),
    mustInclude: readProjectIntakeAnswer(answers, "mustInclude", skuId),
    callToAction: readProjectIntakeAnswer(answers, "callToAction", skuId),
    compliance:
      readProjectIntakeAnswer(answers, "compliance", skuId) ||
      readProjectIntakeAnswer(answers, "optOutWording", skuId),
    mustNotSay: readProjectIntakeAnswer(answers, "mustNotSay", skuId),
    messageCopy: readProjectIntakeAnswer(answers, "messageCopy", skuId),
    sendingAccount: readProjectIntakeAnswer(answers, "sendingAccount", skuId),
    listConsent: readProjectIntakeAnswer(answers, "listConsent", skuId),
  };
}
