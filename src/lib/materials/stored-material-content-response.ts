/**
 * Build the customer material download response.
 * Copies into a new ArrayBuffer so a Node Buffer view with a non-zero
 * byteOffset is not passed through as Uint8Array<ArrayBufferLike>.
 */
export function createStoredMaterialContentResponse(input: {
  body: Uint8Array;
  contentType: string;
  checksumSha256: string;
  fileName?: string | null;
}): Response {
  const responseBytes = new Uint8Array(input.body.byteLength);
  responseBytes.set(input.body);
  const filename = (input.fileName ?? "material").replace(/[\r\n"\\]/g, "_");
  return new Response(responseBytes.buffer, {
    status: 200,
    headers: {
      "cache-control": "private, no-store",
      "content-type": input.contentType,
      "content-disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "x-content-type-options": "nosniff",
      "content-length": String(responseBytes.byteLength),
      "x-studio-material-checksum": input.checksumSha256,
    },
  });
}
