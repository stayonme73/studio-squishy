/**
 * Customer "current" campaign resolution.
 *
 * Auth can leave the session on an older unpaid working draft while the
 * paid Customer-One flyer already exists (often unowned). The Board must
 * load that paid record — not display-only copy on the unpaid draft.
 */

import {
  isLocalCustomerOnePaidFlyerCampaign,
  pickLocalCustomerOnePaidFlyerCampaign,
  pickOwnedPaidNonMayaCampaign,
} from "@/lib/auth/local-customer-one-campaign";
import { linkClientCampaign } from "@/lib/auth/users";
import { isClientUser } from "@/lib/campaign-store/access";
import {
  applyCustomerOneSubmittedIntake,
  isProtectedMayaCampaign,
  shouldBindOwnedPaidWhenCurrentMissing,
  shouldRedirectUnpaidCurrentToPaidSibling,
} from "@/lib/campaign-store/customer-current-campaign-progress";
import {
  listCampaignEnvelopes,
  readCampaignEnvelope,
  upsertCampaignRecord,
} from "@/lib/campaign-store/store";
import type { ServerCampaignEnvelope, StudioUser } from "@/lib/campaign-store/types";
import { wakePaidCampaignEnvelope } from "@/lib/studio-paid-activation-recovery";

export {
  applyCustomerOneSubmittedIntake,
  campaignProgressRank,
  isFreshNonMayaCurrentCampaign,
  isProtectedMayaCampaign,
  selectedServiceKey,
  shouldBindOwnedPaidWhenCurrentMissing,
  shouldKeepLocalCampaignOverServer,
  shouldRedirectUnpaidCurrentToPaidSibling,
} from "@/lib/campaign-store/customer-current-campaign-progress";

function sessionUserWithCampaign(user: StudioUser, campaignId: string): StudioUser {
  const ids = user.clientCampaignIds ?? [];
  return {
    ...user,
    currentCampaignId: campaignId,
    clientCampaignIds: ids.includes(campaignId) ? ids : [...ids, campaignId],
  };
}

async function attachPaidEnvelopeToClient(
  user: StudioUser,
  envelope: ServerCampaignEnvelope,
): Promise<{ envelope: ServerCampaignEnvelope; user: StudioUser }> {
  const withIntake = applyCustomerOneSubmittedIntake(envelope.record);
  const saved = await upsertCampaignRecord(withIntake, envelope.clientUserId);
  const linked = (await linkClientCampaign(user.id, saved.campaignId)) ?? null;
  const nextUser = linked ?? sessionUserWithCampaign(user, saved.campaignId);
  const woken = await wakePaidCampaignEnvelope(saved, {
    sessionCurrentCampaignId: saved.campaignId,
    sessionClientUserId: nextUser.id,
  });
  return { envelope: woken, user: nextUser };
}

export async function resolveCustomerCurrentCampaign(user: StudioUser): Promise<{
  envelope: ServerCampaignEnvelope | null;
  user: StudioUser;
}> {
  let workingUser = user;

  const currentId = workingUser.currentCampaignId;
  const currentEnvelope = currentId ? await readCampaignEnvelope(currentId) : null;
  const currentRecord = currentEnvelope?.record ?? null;

  if (!isClientUser(workingUser)) {
    return { envelope: currentEnvelope, user: workingUser };
  }

  const envelopes = await listCampaignEnvelopes();
  const ownedFreshPaid = pickOwnedPaidNonMayaCampaign(envelopes, workingUser.id);
  if (ownedFreshPaid) {
    const currentIsMaya = isProtectedMayaCampaign(currentRecord);
    const currentMissing = !currentRecord;
    const currentIsFresh =
      currentRecord?.campaignId === ownedFreshPaid.campaignId;
    if (currentMissing || currentIsMaya || currentIsFresh) {
      const needsLink =
        workingUser.currentCampaignId !== ownedFreshPaid.campaignId ||
        !workingUser.clientCampaignIds?.includes(ownedFreshPaid.campaignId);
      if (needsLink || currentIsMaya || currentMissing) {
        return attachPaidEnvelopeToClient(workingUser, ownedFreshPaid);
      }
      return { envelope: ownedFreshPaid, user: workingUser };
    }
  }

  if (
    currentRecord?.paymentReceivedAt &&
    !isLocalCustomerOnePaidFlyerCampaign(currentRecord)
  ) {
    return { envelope: currentEnvelope, user: workingUser };
  }

  if (
    currentEnvelope &&
    currentRecord &&
    isLocalCustomerOnePaidFlyerCampaign(currentRecord)
  ) {
    const needsIntake =
      applyCustomerOneSubmittedIntake(currentRecord) !== currentRecord;
    const needsLink =
      workingUser.currentCampaignId !== currentRecord.campaignId ||
      !workingUser.clientCampaignIds?.includes(currentRecord.campaignId);
    if (needsIntake || needsLink) {
      return attachPaidEnvelopeToClient(workingUser, currentEnvelope);
    }
    return { envelope: currentEnvelope, user: workingUser };
  }

  const paid = pickLocalCustomerOnePaidFlyerCampaign(envelopes, workingUser.id);
  if (paid && shouldRedirectUnpaidCurrentToPaidSibling(currentRecord, paid.record)) {
    return attachPaidEnvelopeToClient(workingUser, paid);
  }

  if (paid && shouldBindOwnedPaidWhenCurrentMissing(currentRecord, paid.record)) {
    return {
      envelope: paid,
      user: sessionUserWithCampaign(workingUser, paid.campaignId),
    };
  }

  return { envelope: currentEnvelope, user: workingUser };
}
