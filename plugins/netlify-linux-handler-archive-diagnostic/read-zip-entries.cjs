"use strict";

const fs = require("node:fs");

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;

function readU16(buf, offset) {
  return buf.readUInt16LE(offset);
}

function readU32(buf, offset) {
  return buf.readUInt32LE(offset);
}

/**
 * Read ZIP central-directory entries (sizes + names only). Does not inflate
 * or read file contents.
 */
function readZipEntries(zipPath) {
  const fd = fs.openSync(zipPath, "r");
  try {
    const st = fs.fstatSync(fd);
    const tailLen = Math.min(st.size, 65557);
    const tail = Buffer.alloc(tailLen);
    fs.readSync(fd, tail, 0, tailLen, st.size - tailLen);

    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i -= 1) {
      if (readU32(tail, i) === EOCD_SIG) {
        eocd = i;
        break;
      }
    }
    if (eocd < 0) {
      throw new Error("ZIP end-of-central-directory not found");
    }

    const totalEntries = readU16(tail, eocd + 10);
    const cdSize = readU32(tail, eocd + 12);
    const cdOffset = readU32(tail, eocd + 16);
    if (cdOffset === 0xffffffff || cdSize === 0xffffffff) {
      throw new Error("ZIP64 archive is not supported by this diagnostic");
    }

    const cd = Buffer.alloc(cdSize);
    fs.readSync(fd, cd, 0, cdSize, cdOffset);

    const entries = [];
    let cursor = 0;
    for (let n = 0; n < totalEntries; n += 1) {
      if (readU32(cd, cursor) !== CD_SIG) {
        throw new Error(`ZIP central-directory signature mismatch at entry ${n}`);
      }
      const compressed = readU32(cd, cursor + 20);
      const uncompressed = readU32(cd, cursor + 24);
      const nameLen = readU16(cd, cursor + 28);
      const extraLen = readU16(cd, cursor + 30);
      const commentLen = readU16(cd, cursor + 32);
      const name = cd.subarray(cursor + 46, cursor + 46 + nameLen).toString("utf8");
      entries.push({
        name,
        compressed,
        uncompressed,
      });
      cursor += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  } finally {
    fs.closeSync(fd);
  }
}

module.exports = { readZipEntries };
