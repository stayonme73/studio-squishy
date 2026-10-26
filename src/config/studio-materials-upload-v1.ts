/**
 * Customer material file upload — STUDIO-OPERATING-MATERIALS-UPLOAD-AND-RECEIPT-1
 * Bytes must be stored. Filename-only is not receipt.
 */

export const studioMaterialsUploadV1 = {
  packageId: "STUDIO-OPERATING-MATERIALS-UPLOAD-AND-RECEIPT-1",
  schemaVersion: 1 as const,
  routineOwnerAction: "NONE" as const,
  maxFileBytes: 5 * 1024 * 1024,
  maxVideoFileBytes: 250 * 1024 * 1024,
  allowedMimeTypes: [
    "image/png",
    "image/jpeg",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "audio/mpeg",
    "audio/wav",
    "audio/wave",
    "video/mp4",
    "video/quicktime",
  ] as const,
  allowedExtensions: [
    ".png",
    ".jpg",
    ".jpeg",
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".mp3",
    ".wav",
    ".mp4",
    ".mov",
  ] as const,

  customerCopy: {
    receivedStored:
      "We received your file. The Studio has stored it with this project. Uploaded is not the same as approved for use.",
    filenameOnlyRejected:
      "Please add the actual file. A file name by itself is not enough for The Studio to keep and use it.",
    emptyFile: "That file is empty. Please choose a file that has content.",
    tooLarge: "This file is larger than 5 MB. Please choose a smaller file.",
    videoTooLarge:
      "This video is larger than 250 MB. Please choose a shorter or more compressed MP4 or MOV.",
    unsupportedType:
      "This file type is not supported. Please choose a PNG, JPG, PDF, Word document, text file, MP3, WAV, MP4, or MOV.",
    duplicateKept:
      "We already have this exact file on your project. You do not need to add it again.",
    missingFile: "Please choose a file and add it here.",
    storageFailed:
      "The Studio could not store your file. Please try again. If it still fails, message the Studio from your Board.",
    optionalLogoPrompt:
      "If you have a logo file, you may send it. A logo is not required for this flyer.",
    optionalPhotoPrompt:
      "If you have a photo, you may send it. Photos are not required for this flyer.",
    storedFileStillAttached(fileName: string): string {
      return `We have ${fileName} stored with this project.`;
    },
  },
} as const;

export function isCustomerTalkingHeadVideoFile(fileName: string, mimeType = ""): boolean {
  const mime = mimeType.trim().toLowerCase();
  const ext = fileName.trim().toLowerCase().match(/(\.[a-z0-9]+)$/)?.[1] ?? "";
  return (
    mime === "video/mp4" ||
    mime === "video/quicktime" ||
    ext === ".mp4" ||
    ext === ".mov"
  );
}

export function maxBytesForCustomerMaterialFile(fileName: string, mimeType = ""): number {
  return isCustomerTalkingHeadVideoFile(fileName, mimeType)
    ? studioMaterialsUploadV1.maxVideoFileBytes
    : studioMaterialsUploadV1.maxFileBytes;
}

export function isAllowedCustomerMaterialFile(fileName: string, mimeType: string): boolean {
  const mime = mimeType.trim().toLowerCase();
  const ext = fileName.trim().toLowerCase().match(/(\.[a-z0-9]+)$/)?.[1] ?? "";
  const mimeOk =
    mime.length > 0 &&
    (studioMaterialsUploadV1.allowedMimeTypes as readonly string[]).includes(mime);
  const extOk = (studioMaterialsUploadV1.allowedExtensions as readonly string[]).includes(ext);
  return mimeOk || extOk;
}
