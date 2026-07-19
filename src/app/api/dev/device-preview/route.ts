import { NextResponse } from "next/server";
import QRCode from "qrcode";

import {
  buildDevDevicePreviewUrl,
  ownerQaPageLabelForPath,
  pickLanIPv4,
  resolveDevPreviewPort,
} from "@/lib/dev-device-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Development-only: LAN URL + QR for Samsung / real-device Studio Review. */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get("pathname") || "/";
  const search = searchParams.get("search") || "";
  const port = resolveDevPreviewPort(request.headers.get("host"));
  const lanAddress = pickLanIPv4();
  const preview = buildDevDevicePreviewUrl({
    lanAddress,
    port,
    pathname,
    search,
  });

  const qrDataUrl = await QRCode.toDataURL(preview.url, {
    margin: 1,
    width: 220,
    errorCorrectionLevel: "M",
    color: { dark: "#1a2528", light: "#ffffff" },
  });

  return NextResponse.json({
    pageLabel: ownerQaPageLabelForPath(pathname),
    url: preview.url,
    usedLan: preview.usedLan,
    note: preview.note,
    qrDataUrl,
  });
}
