import { NextResponse } from "next/server";

import { canReadCampaign } from "@/lib/campaign-store/access";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readSessionFromRequest } from "@/lib/auth/session";
import { askCustomerLifeFromStore } from "@/lib/studio-customer-life";
import { answerCustomerLifeQuestion } from "@/lib/studio-customer-life/answer-question";
import { assembleCustomerLifeTruth } from "@/lib/studio-customer-life/assemble-truth";

/**
 * Studio Voice asks the Machine record. Does not invent an answer.
 * Unsigned Conversation Room may ask catalog/plan questions without a 401.
 * A missing session is not narrated as a dead project record.
 */
export async function POST(request: Request) {
  const user = await readSessionFromRequest(request);
  const body = (await request.json().catch(() => ({}))) as {
    campaignId?: string;
    question?: string;
  };
  const question = body.question ?? "";
  const requestedCampaignId = body.campaignId?.trim() || null;
  const campaignId = requestedCampaignId || user?.currentCampaignId || null;

  if (campaignId && user) {
    const envelope = await readCampaignEnvelope(campaignId);
    if (envelope && !canReadCampaign(user, campaignId, envelope)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    const result = await askCustomerLifeFromStore({
      campaignId,
      question,
      user,
      account: {
        signedIn: true,
        preferredName: user.displayName ?? null,
      },
    });
    return NextResponse.json(result);
  }

  const answer = answerCustomerLifeQuestion(question, {
    campaign: null,
    account: { signedIn: Boolean(user), preferredName: user?.displayName ?? null },
  });
  const truth = assembleCustomerLifeTruth({ campaign: null });
  return NextResponse.json({ answer, truth });
}
