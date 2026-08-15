/**
 * Customer material file upload — STUDIO-OPERATING-MATERIALS-UPLOAD-AND-RECEIPT-1
 * Bytes must be stored. Filename-only is not receipt.
 */

export const studioMaterialsUploadV1 = {
  packageId: "STUDIO-OPERATING-MATERIALS-UPLOAD-AND-RECEIPT-1",
  schemaVersion: 1 as const,
  routineOwnerAction: "NONE" as const,
  maxFileBytes: 5 * 1024 * 1024,
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
  ] as const,

  customerCopy: {
    receivedStored:
      "We received your file. The Studio has stored it with this project. Uploaded is not the same as approved for use.",
    filenameOnlyRejected:
      "Please send the actual file. A file name by itself is not enough for the Studio to keep and use it.",
    emptyFile: "That file is empty. Please choose a file that has content and send it again.",
    tooLarge: "This file is larger than 5 MB. Please choose a smaller file and send it again.",
    unsupportedType:
      "This file type is not supported. Please send a PNG, JPG, PDF, Word document, text file, MP3, WAV, or MP4.",
    duplicateKept:
      "We already have this exact file on your project. You do not need to send it again.",
    missingFile: "A file upload is required. Please choose a file and send it to the Studio.",
    storageFailed:
      "The Studio could not store your file. Please try again. If it still fails, message the Studio from your Board.",
    optionalLogoPrompt:
      "If you have a logo file, you may send it. A logo is not required for this flyer.",
    optionalPhotoPrompt:
      "If you have a photo, you may send it. Photos are not required for this flyer.",
  },
} as const;
