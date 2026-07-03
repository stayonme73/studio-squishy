# File Room Private Storage Adapter V1

File Room remains The Studio's only visible internal file system. Supabase Storage is hidden infrastructure underneath it and must store bytes only: PDFs, images, videos, drafts, proofs, and finals. Client-facing surfaces receive File Room file ids, metadata, and app-controlled endpoints, never bucket names, object paths, signed URLs, or provider URLs.

## Adapter Shape

- Code lives in `src/lib/file-storage/`.
- `FileRoomStorageAdapter` defines private object path construction, storage-ref creation, upload, and download boundaries.
- `createSupabaseStorageAdapter()` validates configuration and requires an injected server-only storage client.
- `createServerFileRoomStorageAdapter()` wires File Room to Supabase Storage from route handlers only.
- `createMockFileRoomStorageAdapter()` is for unit tests only.
- `StudioFileStorageReference` now supports both existing `google_shared_drive/reference_only` manual refs and `supabase_storage/private_object` refs.

Private object paths are deterministic and job-scoped:

```text
clients/{clientId}/campaigns/{campaignId}/jobs/{jobId}/{category}/{versionLabel}/{filename}
```

The path includes client, campaign, purchased job, category, version, and filename so File Room metadata can always prove ownership before storage access.

## Visibility Model

Storage refs use these hidden infrastructure states:

- `internal-only`: internal drafts, source files, and client materials before approved release.
- `review-proof`: approved proof files available only through Review Room checks.
- `client-final`: released final files available only through Final Delivery checks.

These map onto the existing File Registry fields:

- `internal-only` -> `visibility: "internal_only"` and internal categories/statuses.
- `review-proof` -> `category: "review_proof"`, `visibility: "client_visible"`, `status: "approved_for_review"`.
- `client-final` -> `category: "final_delivery"`, `visibility: "client_visible"`, `status: "released"`.

## Security Model

- Buckets must be private. Do not create public buckets.
- Supabase URLs, signed URLs, buckets, and object paths must not be returned to Review Room, Final Delivery, or any client surface.
- Client downloads go through app-owned File Room endpoints such as `/api/file-room/files/{fileId}/download`.
- Review proofs go through app-owned proof endpoints such as `/api/file-room/files/{fileId}/proof`.
- Internal uploads go through `/api/file-room/campaigns/{campaignId}/jobs/{jobId}/files`.
- `canClientAccessFinalDeliveryFile()` allows clients to retrieve only their own released `client-final` files for jobs currently open in Final Delivery.
- `canClientAccessReviewProofFile()` allows clients to retrieve only released review proofs while Review Room is open.
- `canStaffAccessInternalFile()` requires owner role or assigned staff campaign access before internal files can be retrieved.
- Route handlers run File Room registry/job/campaign access checks before calling the storage adapter.
- The app streams bytes back from the server response. It does not return public URLs, signed URLs, bucket names, or object paths to browser code.

## Supabase Setup Values

Tagia or the deployment owner must provide:

- Supabase project URL: `NEXT_PUBLIC_SUPABASE_URL`
- Supabase anon key, only if a future browser upload flow is explicitly approved: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase service role key, server-only: `SUPABASE_SERVICE_ROLE_KEY`
- Private bucket name: `SUPABASE_STORAGE_BUCKET`, recommended `studio-files`
- Confirmed max file size, allowed MIME types, and billing plan limits for large video uploads

Bucket requirements:

- Create exactly one private bucket for File Room launch storage.
- Disable public access.
- Do not expose Supabase's storage browser to staff or clients as a workflow.
- Keep service-role credentials server-only.
- Use app-managed File Room authorization, not direct client bucket access.

## Not Implemented In V1
- No public bucket access.
- No Google Drive workflow.
- No visible storage browser.
- No client folder access.
- No raw provider links.
- No virus scanning, thumbnail extraction, retention cleanup, or orphan cleanup jobs yet.
