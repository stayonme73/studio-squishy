# ARCHIVE-1 (2026-10-24) — local obsolete UI moved, not deleted

Owner-authorized cleanup pass. Recoverable from git history and this folder.

| Subfolder | Former location | Why archived |
|-----------|-----------------|--------------|
| `business-discovery-studio-ui/` | `src/components/business-discovery-studio/` | Route pages redirect to Conversation Room; scene never mounted |
| `studio-environment-step2/` | `src/components/studio/`, `config/studio-zones.ts`, `types/studio.ts` | Orphan `/studio` Step-2 environment page removed |
| `entrance-unmounted/` | `src/components/entrance/StudioLobbyHostLayer.tsx` | Zero runtime importers (CR-5 audit) |

**Not archived (migration-blocked):** `OwnerQaPanel`, `OwnerQaRoot`, `components/studio-conversation-room/discovery/`, `components/studio-guide/`, redirect route stubs, `RouteMapScene.tsx`.
