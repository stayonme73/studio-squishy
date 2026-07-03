import { NextResponse } from "next/server";

import { isNextResponse, requireSession } from "@/lib/auth/require-session";
import { canClientAccessReviewProofFile } from "@/lib/file-storage/access";
import {
  downloadClientReviewProofFile,
  downloadInternalFileRoomFile,
} from "@/lib/file-storage/server-access";
import {
  findFileRoomRegistryMatch,
  internalCampaignAccessAllowed,
} from "@/lib/file-storage/registry-server";
import { fileRoomDownloadResponse } from "@/lib/file-storage/responses";
import { createServerFileRoomStorageAdapter } from "@/lib/file-storage/server";
import { readCampaignAssignments } from "@/lib/file-room/assignments";
import { isApprovedReviewProofReference } from "@/lib/file-registry/job-files";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await requireSession(request);
  if (isNextResponse(user)) return user;

  const { fileId } = await context.params;
  const match = await findFileRoomRegistryMatch(fileId);
  if (!match || !isApprovedReviewProofReference(match.file)) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const assignments = await readCampaignAssignments();
  const internalAccess = internalCampaignAccessAllowed(user, match.file.campaignId, assignments);
  if (!internalAccess) {
    const decision = canClientAccessReviewProofFile({
      user,
      job: match.job,
      file: match.file,
    });
    if (!decision.allowed) {
      return NextResponse.json({ error: "File not available." }, { status: 403 });
    }
  }

  try {
    const adapter = createServerFileRoomStorageAdapter();
    const result = internalAccess
      ? await downloadInternalFileRoomFile({
          adapter,
          user,
          job: match.job,
          file: match.file,
          campaignAccessAllowed: true,
        })
      : await downloadClientReviewProofFile({
          adapter,
          user,
          job: match.job,
          file: match.file,
        });

    if (!result.ok) {
      return NextResponse.json({ error: "File not available." }, { status: result.status });
    }

    return fileRoomDownloadResponse(result.file, result.download, "inline");
  } catch {
    return NextResponse.json({ error: "Private File Room proof failed." }, { status: 502 });
  }
}
