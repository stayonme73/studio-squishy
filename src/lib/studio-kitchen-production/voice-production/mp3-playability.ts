/**
 * Lightweight MP3 structure checks — not a full decoder, but stronger than extension-only.
 * Confirms MPEG audio framing / ID3 presence in persisted bytes.
 */

export type Mp3PlayabilityResult = {
  ok: boolean;
  hasId3: boolean;
  hasMpegFrameSync: boolean;
  firstFrameOffset: number | null;
  byteLength: number;
  notes: string;
};

function findMpegFrameSync(buf: Buffer, start = 0): number | null {
  for (let i = start; i < buf.length - 1; i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      const version = (buf[i + 1] >> 3) & 0x03;
      const layer = (buf[i + 1] >> 1) & 0x03;
      // Reject reserved version/layer combinations
      if (version === 1 || layer === 0) continue;
      return i;
    }
  }
  return null;
}

export function verifyMp3BytesPlayable(buf: Buffer): Mp3PlayabilityResult {
  const byteLength = buf.byteLength;
  if (byteLength < 4) {
    return {
      ok: false,
      hasId3: false,
      hasMpegFrameSync: false,
      firstFrameOffset: null,
      byteLength,
      notes: "File too small to be valid MP3 audio",
    };
  }

  const hasId3 = buf.subarray(0, 3).toString("ascii") === "ID3";
  let searchFrom = 0;
  if (hasId3 && byteLength >= 10) {
    const size =
      ((buf[6] & 0x7f) << 21) |
      ((buf[7] & 0x7f) << 14) |
      ((buf[8] & 0x7f) << 7) |
      (buf[9] & 0x7f);
    searchFrom = Math.min(10 + size, byteLength - 2);
  }

  const firstFrameOffset = findMpegFrameSync(buf, searchFrom);
  const hasMpegFrameSync = firstFrameOffset !== null;
  const ok = hasMpegFrameSync && byteLength > 256;

  return {
    ok,
    hasId3,
    hasMpegFrameSync,
    firstFrameOffset,
    byteLength,
    notes: ok
      ? "MP3 framing verified (ID3 and/or MPEG sync + non-trivial size) — not listening quality certification"
      : "No valid MPEG frame sync found — cannot claim playable audio",
  };
}
