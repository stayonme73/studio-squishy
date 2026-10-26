const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

export function isPngImageBytes(bytes: Uint8Array): boolean {
  return bytes.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.equals(bytes.subarray(0, PNG_SIGNATURE.length));
}

export function isJpegImageBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && JPEG_SIGNATURE.equals(bytes.subarray(0, 3));
}

/** Fail closed when the filename/MIME claims PNG/JPEG but bytes do not match. */
export function validateImageFileBytes(
  fileName: string,
  mimeType: string,
  bytes: Uint8Array,
): { ok: true } | { ok: false; error: string } {
  const lower = fileName.toLowerCase();
  const claimsPng = lower.endsWith(".png") || mimeType === "image/png";
  const claimsJpeg =
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    mimeType === "image/jpeg" ||
    mimeType === "image/jpg";

  if (claimsPng && !isPngImageBytes(bytes)) {
    return {
      ok: false,
      error: "This file is not a readable PNG image. Upload a real PNG or choose another format.",
    };
  }
  if (claimsJpeg && !isJpegImageBytes(bytes)) {
    return {
      ok: false,
      error: "This file is not a readable JPEG image. Upload a real photo or graphic file.",
    };
  }
  return { ok: true };
}

/** Minimal 1×1 PNG for disposable certification fixtures (synthetic, not a brand asset). */
export function minimalSyntheticPngBytes(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
}
