/**
 * Safe synthetic bytes for Gate X proof tests — not customer photographs.
 */

/** Minimal valid 1×1 PNG (IHDR + IDAT + IEND). */
export const SYNTHETIC_PNG_1X1_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
  0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
  0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8,
  0xcf, 0xc0, 0x00, 0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb4, 0x00, 0x00, 0x00,
  0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

/** Declared PNG but bytes are plain text — signature mismatch fixture. */
export const SYNTHETIC_FAKE_PNG_BYTES = Buffer.from("NOT-A-REAL-PNG-FIXTURE", "utf8");

/** Truncated PNG header — corrupt fixture. */
export const SYNTHETIC_CORRUPT_PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);

export function syntheticPngFile(name = "gate-x-proof.png"): File {
  return new File([SYNTHETIC_PNG_1X1_BYTES], name, { type: "image/png" });
}

export function syntheticFakePngFile(name = "gate-x-fake.png"): File {
  return new File([SYNTHETIC_FAKE_PNG_BYTES], name, { type: "image/png" });
}

export function syntheticCorruptPngFile(name = "gate-x-corrupt.png"): File {
  return new File([SYNTHETIC_CORRUPT_PNG_BYTES], name, { type: "image/png" });
}

/** Valid PNG variant with different SHA-256 for replacement/supersession proof tests. */
export const SYNTHETIC_PNG_REPLACEMENT_BYTES = (() => {
  const bytes = Buffer.from(SYNTHETIC_PNG_1X1_BYTES);
  bytes[40] = bytes[40]! ^ 0x01;
  return bytes;
})();

export function syntheticReplacementPngFile(name = "gate-x-replacement.png"): File {
  return new File([SYNTHETIC_PNG_REPLACEMENT_BYTES], name, { type: "image/png" });
}
