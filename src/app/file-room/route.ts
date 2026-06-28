import { NextResponse } from "next/server";

import { listCampaignEnvelopes } from "@/lib/campaign-store/store";
import { isStaffOrOwner } from "@/lib/auth/roles";
import { readSessionFromRequest } from "@/lib/auth/session";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET(request: Request) {
  const user = await readSessionFromRequest(request);
  if (!user || !isStaffOrOwner(user)) {
    return NextResponse.json({ error: "Owner or staff access required" }, { status: 401 });
  }

  const campaigns = await listCampaignEnvelopes();
  const rows = campaigns
    .map((envelope) => {
      const record = envelope.record;
      return `<li style="border:1px solid #ccc;border-radius:8px;padding:1rem;margin-bottom:1rem">
        <strong>${escapeHtml(record.campaignName)}</strong>
        <div><code>${escapeHtml(envelope.campaignId)}</code></div>
        <div>Status: ${escapeHtml(record.campaignStatus)}</div>
        <div>Sync v${envelope.syncVersion} · ${escapeHtml(envelope.syncedAt)}</div>
        <div>Discovery: ${record.discoverySubmittedAt ? "yes" : "no"} · Plan: ${record.approvedStudioPlan ? "yes" : "no"} · Payment: ${record.paymentReceivedAt ? "yes" : "no"} · Project Details: ${record.projectDetailsSubmittedAt ? "yes" : "no"}</div>
      </li>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>File Room — Slice 1a</title>
  </head>
  <body style="padding:2rem;font-family:system-ui,sans-serif;max-width:960px">
    <h1>File Room — Slice 1a</h1>
    <p>Signed in as ${escapeHtml(user.displayName)} (${escapeHtml(user.roles.join(", "))})</p>
    <p>${campaigns.length} server campaign record(s) in <code>data/campaigns/</code></p>
    ${
      campaigns.length === 0
        ? "<p>No campaigns synced yet.</p>"
        : `<ul style="list-style:none;padding:0">${rows}</ul>`
    }
    <p style="margin-top:2rem;color:#666;font-size:0.875rem">
      Client sync status: localStorage <code>studio-squishy:campaign-sync-status</code> + console <code>[campaign-sync]</code> logs.
    </p>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
