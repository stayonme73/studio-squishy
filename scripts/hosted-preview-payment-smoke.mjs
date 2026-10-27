/**
 * STUDIO-HOSTED-PREVIEW-PAYMENT-TO-DELIVERY-1 — hosted Preview T3 helper (Test only).
 * Usage: node scripts/hosted-preview-payment-smoke.mjs <deployment-id> <preview-origin>
 */
import { spawnSync } from "child_process";
import { randomBytes } from "crypto";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const deploymentId = process.argv[2]?.trim();
const previewOrigin = process.argv[3]?.replace(/\/+$/, "");
if (!deploymentId?.startsWith("dpl_") || !previewOrigin?.startsWith("https://")) {
  console.error(
    "Usage: node scripts/hosted-preview-payment-smoke.mjs <dpl_...> <https://preview-host.vercel.app>",
  );
  process.exit(2);
}

const tmp = path.join(tmpdir(), "studio-hosted-preview-smoke");
mkdirSync(tmp, { recursive: true });

function vercelCurl(route, { method = "GET", body, cookie } = {}) {
  const args = [
    "vercel",
    "curl",
    route,
    "--deployment",
    deploymentId,
    "-X",
    method,
    "-i",
  ];
  if (body) {
    const bodyPath = path.join(tmp, "body.json");
    writeFileSync(bodyPath, JSON.stringify(body), "utf8");
    args.push("-H", "Content-Type: application/json", "--data-binary", `@${bodyPath}`);
  }
  if (cookie) {
    args.push("-H", `Cookie: ${cookie}`);
  }
  const r = spawnSync("npx", args, { cwd: repoRoot, encoding: "utf8", shell: true });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
  const headerEnd = out.indexOf("\r\n\r\n");
  const headers = headerEnd >= 0 ? out.slice(0, headerEnd) : out;
  const bodyText = headerEnd >= 0 ? out.slice(headerEnd + 4) : "";
  const statusMatch = headers.match(/^HTTP\/[\d.]+ (\d+)/m);
  const status = statusMatch ? Number(statusMatch[1]) : 0;
  const setCookies = [...headers.matchAll(/^set-cookie:\s*([^\r\n]+)/gim)].map((m) =>
    m[1].split(";")[0].trim(),
  );
  const mergedCookie =
    setCookies.length > 0 ? setCookies.join("; ") : cookie ?? null;
  return { status, headers, bodyText, cookie: mergedCookie };
}

const email = `scout-hosted-t3-${randomBytes(4).toString("hex")}@example.com`;
const signup = vercelCurl("/api/auth/signup", {
  method: "POST",
  body: {
    email,
    password: "ScoutT3!preview9",
    displayName: "Scout Hosted T3",
  },
});
console.log("signup_status", signup.status);
if (signup.status !== 200) {
  console.log("signup_body", signup.bodyText.slice(0, 300));
  process.exit(1);
}
const sessionCookie = signup.cookie;
if (!sessionCookie?.includes("studio_session=")) {
  console.error("missing studio_session cookie");
  process.exit(1);
}

const campaignId = `disposable-hosted-preview-${randomBytes(4).toString("hex")}`;
const checkoutBody = {
  campaignId,
  returnOrigin: previewOrigin,
  customerEmail: email,
  purchaseKind: "condensed_offer",
  facts: {
    draftRevision: 1,
    routeId: null,
    selectedServiceIds: ["campaign_launch_kit"],
    projectNeed: "Hosted Preview payment smoke",
    businessName: "Scout Disposable Co",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
  },
  condensedOffer: {
    packageId: "campaign_launch_kit",
    customerName: "Scout Hosted T3",
    company: "Scout Disposable Co",
    projectNeed: "Hosted Preview payment smoke",
    materialsNote: "",
    support: {},
  },
};

const checkout = vercelCurl("/api/payments/checkout-session", {
  method: "POST",
  body: checkoutBody,
  cookie: sessionCookie,
});
console.log("checkout_status", checkout.status);
console.log("checkout_body", checkout.bodyText.slice(0, 500));
let parsed;
try {
  parsed = JSON.parse(checkout.bodyText);
} catch {
  process.exit(1);
}
if (!parsed.ok || !(parsed.checkoutUrl ?? parsed.url)) {
  process.exit(1);
}
const checkoutUrl = parsed.checkoutUrl ?? parsed.url;
const checkoutSessionId = parsed.checkoutSessionId;
console.log("campaign_id", campaignId);
console.log("checkout_session_id", checkoutSessionId);
console.log("checkout_url", checkoutUrl);
console.log("NEXT: complete Stripe test payment in browser, then:");
console.log(
  `  npx vercel curl "/api/payments/reconcile?session_id=${checkoutSessionId}" --deployment ${deploymentId} -i`,
);
