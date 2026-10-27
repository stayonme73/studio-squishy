import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq <= 0) continue;
  let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  process.env[t.slice(0, eq).trim()] = v;
}

const checkoutSessionId = process.argv[2];
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
const sessionForEvent = {
  ...session,
  payment_status: "paid",
  status: "complete",
  amount_total: session.amount_total,
  livemode: false,
};
const event = {
  id: `evt_test_${Date.now()}`,
  object: "event",
  type: "checkout.session.completed",
  livemode: false,
  data: { object: sessionForEvent },
};
const payload = JSON.stringify(event);
const sig = stripe.webhooks.generateTestHeaderString({
  payload,
  secret: process.env.STRIPE_WEBHOOK_SECRET,
});
const bodyPath = path.join(root, "tmp-hosted-webhook-payload.json");
mkdirSync(path.dirname(bodyPath), { recursive: true });
writeFileSync(bodyPath, payload, "utf8");
writeFileSync(path.join(root, "tmp-webhook-sig.txt"), sig, "utf8");
console.log(bodyPath);
console.log(sig.slice(0, 20) + "…");
