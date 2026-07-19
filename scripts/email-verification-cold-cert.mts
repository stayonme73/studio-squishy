/**
 * Cold-cert helper — issue/consume verification tokens without Resend.
 * Run: npx tsx scripts/email-verification-cold-cert.mts
 */
import { promises as fs } from "fs";
import path from "path";

import {
  consumeEmailVerificationToken,
  issueEmailVerificationToken,
} from "../src/lib/auth/email-verification-tokens.ts";
import { verifyEmailWithToken } from "../src/lib/auth/email-verification.ts";
import {
  createClientAccount,
  findUserByEmail,
  findUserById,
} from "../src/lib/auth/users.ts";
import { normalizeEmail } from "../src/lib/auth/email-normalize.ts";

const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");
const TOKENS_PATH = path.join(
  process.cwd(),
  "data",
  "email-verification-tokens.json",
);

async function main() {
  const email = `cedric.token.cert.${Date.now()}@example.com`;
  const created = await createClientAccount({
    email,
    password: "ColdVerify-Pass-0719!",
    displayName: "Token Cert",
  });
  if (!created.ok) throw new Error(created.message);
  const userId = created.user.id;

  const first = await issueEmailVerificationToken(userId);
  const second = await issueEmailVerificationToken(userId);

  const superseded = await consumeEmailVerificationToken(first.rawToken);
  const newest = await verifyEmailWithToken(second.rawToken);
  const reused = await verifyEmailWithToken(second.rawToken);

  // Expired token path
  const expiredIssue = await issueEmailVerificationToken(userId);
  const tokens = JSON.parse(await fs.readFile(TOKENS_PATH, "utf8")) as Array<{
    tokenHash: string;
    expiresAt: string;
  }>;
  const idx = tokens.findIndex(
    (t) => t.tokenHash === expiredIssue.record.tokenHash,
  );
  tokens[idx].expiresAt = new Date(Date.now() - 60_000).toISOString();
  await fs.writeFile(TOKENS_PATH, JSON.stringify(tokens, null, 2), "utf8");
  const expired = await consumeEmailVerificationToken(expiredIssue.rawToken);

  const stored = await findUserByEmail(email);
  const byId = await findUserById(userId);

  // Ensure no raw token in stores
  const usersRaw = await fs.readFile(USERS_PATH, "utf8");
  const tokensRaw = await fs.readFile(TOKENS_PATH, "utf8");
  const deliveryPath = path.join(
    process.cwd(),
    "data",
    "transactional-email-delivery.jsonl",
  );
  let deliveryRaw = "";
  try {
    deliveryRaw = await fs.readFile(deliveryPath, "utf8");
  } catch {
    deliveryRaw = "";
  }

  const rawLeaks = [first.rawToken, second.rawToken, expiredIssue.rawToken].some(
    (raw) =>
      usersRaw.includes(raw) ||
      tokensRaw.includes(raw) ||
      deliveryRaw.includes(raw),
  );

  console.log(
    JSON.stringify(
      {
        email: normalizeEmail(email),
        supersededCode: superseded.ok ? "ok" : superseded.code,
        newestOk: newest.ok,
        emailVerifiedAt: stored?.emailVerifiedAt ?? byId?.emailVerifiedAt,
        reusedCode: reused.ok ? "ok" : reused.code,
        expiredCode: expired.ok ? "ok" : expired.code,
        rawTokenLeaksInStores: rawLeaks,
        boardClaimFields: {
          clientCampaignIds: stored?.clientCampaignIds,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
