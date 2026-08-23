import { NextResponse } from "next/server";

import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { readCampaignEnvelope } from "@/lib/campaign-store/store";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { createServerFileRoomStorageAdapter } from "@/lib/file-storage/server";
import { canDownloadStoredCustomerMaterial, canReadMaterials } from "@/lib/materials/access";
import { downloadStoredCustomerMaterialBytes } from "@/lib/materials/client-file-store";
import { getOrInitializeMaterials } from "@/lib/materials/store";

type RouteContext = {
  params: Promise<{ campaignId: string; itemId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const { campaignId, itemId } = await context.params;
  const [campaignEnvelope, assignments] = await Promise.all([
    readCampaignEnvelope(campaignId),
    readCampaignAssignments(),
  ]);

  if (!campaignEnvelope) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!canReadMaterials(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!canDownloadStoredCustomerMaterial(user, campaignId, campaignEnvelope, assignments)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const materials = await getOrInitializeMaterials(campaignId, campaignEnvelope.record);
  const item = materials.items.find((entry) => entry.id === itemId);
  if (!item) {
    return NextResponse.json({ error: "Material item not found." }, { status: 404 });
  }

  const downloaded = await downloadStoredCustomerMaterialBytes({
    adapter: createServerFileRoomStorageAdapter(),
    item,
  });
  if (!downloaded.ok) {
    return NextResponse.json({ error: downloaded.error }, { status: downloaded.status });
  }

  const filename = (item.fileName ?? "material").replace(/[\r\n"\\]/g, "_");
  return new Response(Buffer.from(downloaded.body), {
    status: 200,
    headers: {
      "cache-control": "private, no-store",
      "content-type": downloaded.contentType,
      "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "x-content-type-options": "nosniff",
      "content-length": String(downloaded.body.byteLength),
      "x-studio-material-checksum": downloaded.checksumSha256,
    },
  });
}
