/**
 * STUDIO-OPERATING-SECURITY-DATA-BACKUP-LAUNCH-MINIMUM-1
 * Launch-minimum only. Does not invent encryption, off-site DR, or compliance.
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioCustomerReadyOperatingGuideV1 as guide } from "@/config/studio-customer-ready-operating-guide-v1";
import { studioLaunchReadinessExecutionOrderV1 } from "@/config/studio-launch-readiness-execution-order-v1";
import { helpCenter } from "@/config/help-center";
import { payment } from "@/config/payment";
import { studioPolicies } from "@/config/policies";
import { studioGuideConversationV1 } from "@/config/studio-guide-conversation-v1";
import { studioPreLaunchMasterCloseoutRegisterV1 } from "@/config/studio-pre-launch-master-closeout-register-v1";
import { studioSecurityDataBackupLaunchMinimumV1 as stamp } from "@/config/studio-security-data-backup-launch-minimum-v1";
import { canReadCampaign } from "@/lib/campaign-store/access";
import { upsertCampaignRecord, readCampaignEnvelope } from "@/lib/campaign-store/store";
import { createClientAccount, markEmailVerified } from "@/lib/auth/users";
import { recoverPaidOperatingChain } from "@/lib/studio-paid-activation-recovery";
import {
  claimCampaignForVerifiedClient,
  hasSameBrowserPossession,
} from "@/lib/studio-project-claim/claim";

const REPO = path.resolve(__dirname, "../../..");
const SECRET_SHAPE = /sk_live_[A-Za-z0-9]{8,}|sk_test_[A-Za-z0-9]{8,}|whsec_[A-Za-z0-9]{8,}|re_[A-Za-z0-9_]{8,}/;

function paidRecord(campaignId: string, name: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: name,
    campaignStatus: "PAYMENT_RECEIVED",
    createdAt: now,
    updatedAt: now,
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: 9900,
      confirmedAmountCents: 9900,
      checkoutSessionId: `cs_${campaignId}`,
      paymentIntentId: null,
      stripeEventId: null,
      selectedServiceIds: ["v2-rtu-social-posts"],
      decisionId: "dec",
      factFingerprint: "fp",
      draftRevision: 1,
      confirmedAt: now,
      sandbox: true,
    },
  } as CampaignRecord;
}

describe("STUDIO-OPERATING-SECURITY-DATA-BACKUP-LAUNCH-MINIMUM-1", () => {
  const createdIds: string[] = [];

  afterEach(async () => {
    const { promises: fs } = await import("fs");
    await Promise.all(
      createdIds.splice(0).map((id) =>
        fs.rm(path.join(process.cwd(), "data", "campaigns", `${id}.json`), {
          force: true,
        }),
      ),
    );
  });

  it("classifies launch-minimum areas and does not start the outside trial or capacity package", () => {
    expect(stamp.verdict).toBe("PASS_WITH_EXPLICIT_LIMITS");
    expect(stamp.launchMinimumOnly).toBe(true);
    expect(stamp.doNotClaimOffsiteDisasterRecovery).toBe(true);
    expect(stamp.doNotStartOutsideTrial).toBe(true);
    expect(stamp.nextPackageStarted).toBe(false);
    expect(stamp.nextPackageId).toBe(
      "STUDIO-OPERATING-CAPACITY-QUEUE-DEADLINE-OVERLOAD-1",
    );
    expect(stamp.guideSectionTNextRemains).toBe(
      "controlled_outside_customer_trial",
    );
    expect(guide.nextUnfinishedStepId).toBe("controlled_outside_customer_trial");
    expect(guide.nextUnfinishedStepStatus).toBe("NOT_STARTED");
    expect(
      studioPreLaunchMasterCloseoutRegisterV1.areas.securityDataBackupRecovery
        .classification,
    ).toBe("COMPLETE_WITH_EXPLICIT_LIMITS");
    expect(
      studioPreLaunchMasterCloseoutRegisterV1.recommendedNextSinglePackage
        .packageId,
    ).toBe("STUDIO-OPERATING-FAILURE-RECOVERY-ESCALATION-CERTIFICATION-1");
    expect(
      studioPreLaunchMasterCloseoutRegisterV1.recommendedNextSinglePackage
        .status,
    ).toBe("NOT_STARTED");
    expect(
      studioLaunchReadinessExecutionOrderV1.preLaunchMasterCloseoutRegister
        .recommendedNextPackageId,
    ).toBe("STUDIO-OPERATING-FAILURE-RECOVERY-ESCALATION-CERTIFICATION-1");
    expect(existsSync(path.join(REPO, stamp.stampDoc))).toBe(true);
    expect(existsSync(path.join(REPO, stamp.proofJson))).toBe(true);
  });

  it("keeps secrets out of gitignore holes, example env, and this stamp", () => {
    const gitignore = readFileSync(path.join(REPO, ".gitignore"), "utf8");
    expect(gitignore).toMatch(/^\.env\*/m);
    expect(gitignore).toContain("/data/");
    const example = readFileSync(path.join(REPO, ".env.example"), "utf8");
    expect(example).toContain("SESSION_SECRET=");
    expect(example).toContain("RESEND_API_KEY=");
    expect(example).toContain("STRIPE_SECRET_KEY=");
    expect(example).toContain("STUDIO_OPERATING_SWEEP_SECRET=");
    expect(example).not.toMatch(SECRET_SHAPE);
    const stampMd = readFileSync(path.join(REPO, stamp.stampDoc), "utf8");
    const proof = readFileSync(path.join(REPO, stamp.proofJson), "utf8");
    expect(stampMd).not.toMatch(SECRET_SHAPE);
    expect(proof).not.toMatch(SECRET_SHAPE);
    expect(stampMd).not.toContain("sk_live_");
    expect(stamp.doNotInventEncryptionOrRetentionGuarantees).toBe(true);
  });

  it("does not promise encryption, backup, or disaster recovery to customers", () => {
    const help = JSON.stringify(helpCenter);
    const pay = JSON.stringify(payment);
    const policies = JSON.stringify(studioPolicies);
    const voice = JSON.stringify(studioGuideConversationV1.voice);
    for (const surface of [help, pay, policies, voice]) {
      expect(surface.toLowerCase()).not.toMatch(
        /encrypt(?:ed|ion) at rest|soc ?2|disaster recovery|off-?site backup/,
      );
    }
    expect(payment.secureNote).toContain("Stripe confirmation");
    expect(studioGuideConversationV1.voice.privacyNote).toContain(
      "does not upload or store your recording",
    );
    expect(stamp.notProven).toContain("offsite_backup_of_data_directory");
    expect(stamp.notProven).toContain("encrypted_at_rest_guarantee");
  });

  it("isolates two simultaneous owned jobs and refuses a possession-flag steal", async () => {
    const idA = `sec-iso-a-${randomUUID().slice(0, 8)}`;
    const idB = `sec-iso-b-${randomUUID().slice(0, 8)}`;
    createdIds.push(idA, idB);

    const accountA = await createClientAccount({
      email: `iso-a-${randomUUID().slice(0, 8)}@example.com`,
      password: "IsoTest-pass-A1!",
      displayName: "Iso A",
    });
    const accountB = await createClientAccount({
      email: `iso-b-${randomUUID().slice(0, 8)}@example.com`,
      password: "IsoTest-pass-B1!",
      displayName: "Iso B",
    });
    expect(accountA.ok && accountB.ok).toBe(true);
    if (!accountA.ok || !accountB.ok) return;

    await upsertCampaignRecord(paidRecord(idA, "Customer A Private"), accountA.user.id);
    await upsertCampaignRecord(paidRecord(idB, "Customer B Private"), accountB.user.id);
    const envA = await readCampaignEnvelope(idA);
    const envB = await readCampaignEnvelope(idB);

    expect(canReadCampaign(accountA.user, idA, envA)).toBe(true);
    expect(canReadCampaign(accountA.user, idB, envB)).toBe(false);
    expect(canReadCampaign(accountB.user, idB, envB)).toBe(true);
    expect(canReadCampaign(accountB.user, idA, envA)).toBe(false);

    const verifiedB = await markEmailVerified(accountB.user.id);
    const steal = await claimCampaignForVerifiedClient({
      user: verifiedB!,
      campaignId: idA,
      allowLocalPossession: true,
    });
    expect(steal.ok).toBe(false);
    expect(hasSameBrowserPossession(verifiedB!, idA)).toBe(false);
  });

  it("resumes a confirmed-paid record without requiring Tagia to reconstruct it", async () => {
    const campaignId = `sec-rec-${randomUUID().slice(0, 8)}`;
    createdIds.push(campaignId);
    const now = new Date().toISOString();
    const record = {
      ...paidRecord(campaignId, "Recovery Probe"),
      postPayActivation: {
        schemaVersion: 1,
        status: "activated",
        phase: "awaiting_intake",
        activatedAt: now,
        lastAttemptAt: now,
        checkoutSessionId: `cs_${campaignId}`,
        paymentIntentId: null,
        stripeEventId: null,
        jobIds: [`${campaignId}:v2-rtu-social-posts`],
        taskCount: 1,
        intakeComplete: false,
        blockingRequiredMaterialsCount: 0,
        ownerActionRequired: false,
        lastError: null,
      },
    } as CampaignRecord;
    await upsertCampaignRecord(record);
    const result = await recoverPaidOperatingChain(record);
    expect(result.ownerActionRequired).toBe(false);
    const again = await readCampaignEnvelope(campaignId);
    expect(again?.record.campaignId).toBe(campaignId);
    expect(again?.record.paymentTruth?.status).toBe("confirmed");
    expect(stamp.provenBackup).toContain("paid_activation_recovery_resume");
    expect(stamp.provenBackup).toContain("atomic_campaign_json_writes");
  });
});
