import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { isLocalAuthFixtureAvailable } from "@/lib/auth/local-auth-fixture-gate";
import { LOCAL_TEST_FIXTURE_FILENAME } from "@/lib/local-test-fixtures-copy";

function notFound() {
  return new NextResponse(null, { status: 404 });
}

export async function GET(request: Request) {
  if (!isLocalAuthFixtureAvailable()) {
    return notFound();
  }

  const userAgent = request.headers.get("user-agent") ?? "";
  console.info("[local-test-fixture-download]", {
    ua: userAgent.slice(0, 180),
    downloadManager: /downloadmanager|dalvik/i.test(userAgent),
  });

  const filePath = path.join(
    process.cwd(),
    "public",
    "mobile-customer-journey-cert-1",
    LOCAL_TEST_FIXTURE_FILENAME,
  );
  const bytes = await readFile(filePath);
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${LOCAL_TEST_FIXTURE_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
