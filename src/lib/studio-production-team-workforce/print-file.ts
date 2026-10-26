import { existsSync, readFileSync } from "fs";
import path from "path";

import { printFileRequired } from "./roster";
import type { PrintFileCertification } from "./types";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const PDF_MAGIC = Buffer.from("%PDF");

function isPng(abs: string): boolean {
  try {
    const head = readFileSync(abs).subarray(0, 4);
    return head.equals(PNG_MAGIC);
  } catch {
    return false;
  }
}

function isPdf(abs: string): boolean {
  try {
    const head = readFileSync(abs).subarray(0, 4);
    return head.equals(PDF_MAGIC);
  } catch {
    return false;
  }
}

export function certifyPrintFileDeliverable(input: {
  repoRoot: string;
  skuId: string;
  pngRelativePath?: string;
  pdfRelativePath?: string;
  widthPx?: number;
  heightPx?: number;
  expectedWidthPx?: number;
  expectedHeightPx?: number;
  intendedUse?: string | null;
}): PrintFileCertification {
  if (!printFileRequired(input.skuId)) {
    return {
      ok: true,
      skuId: input.skuId,
      pngRelativePath: input.pngRelativePath,
      pdfRelativePath: input.pdfRelativePath,
      widthPx: input.widthPx,
      heightPx: input.heightPx,
      intendedUse: "digital_only",
      physicalPrint: false,
      shipping: false,
    };
  }

  const pngRel = input.pngRelativePath?.replace(/\\/g, "/");
  const pdfRel = input.pdfRelativePath?.replace(/\\/g, "/");
  if (!pngRel) {
    return {
      ok: false,
      skuId: input.skuId,
      code: "MISSING_PNG",
      message: "Print/File Production requires a customer-ready PNG.",
    };
  }
  const pngAbs = path.join(input.repoRoot, pngRel);
  if (!existsSync(pngAbs) || !isPng(pngAbs)) {
    return {
      ok: false,
      skuId: input.skuId,
      code: existsSync(pngAbs) ? "INVALID_FILE" : "MISSING_PNG",
      message: "Print/File Production could not validate the PNG export.",
    };
  }
  if (!pdfRel) {
    return {
      ok: false,
      skuId: input.skuId,
      code: "MISSING_PDF",
      message: "Print/File Production requires a coordinated PDF for this SKU.",
    };
  }
  const pdfAbs = path.join(input.repoRoot, pdfRel);
  if (!existsSync(pdfAbs) || !isPdf(pdfAbs)) {
    return {
      ok: false,
      skuId: input.skuId,
      code: existsSync(pdfAbs) ? "INVALID_FILE" : "MISSING_PDF",
      message: "Print/File Production could not validate the PDF export.",
    };
  }
  if (
    input.expectedWidthPx &&
    input.expectedHeightPx &&
    input.widthPx &&
    input.heightPx &&
    (input.widthPx !== input.expectedWidthPx ||
      input.heightPx !== input.expectedHeightPx)
  ) {
    return {
      ok: false,
      skuId: input.skuId,
      code: "DIMENSION_MISMATCH",
      message: `Export is ${input.widthPx}x${input.heightPx}; expected ${input.expectedWidthPx}x${input.expectedHeightPx}.`,
    };
  }

  const printIntent = /print/i.test(input.intendedUse ?? "");
  return {
    ok: true,
    skuId: input.skuId,
    pngRelativePath: pngRel,
    pdfRelativePath: pdfRel,
    widthPx: input.widthPx,
    heightPx: input.heightPx,
    intendedUse: printIntent ? "print_digital" : "digital_only",
    physicalPrint: false,
    shipping: false,
  };
}
