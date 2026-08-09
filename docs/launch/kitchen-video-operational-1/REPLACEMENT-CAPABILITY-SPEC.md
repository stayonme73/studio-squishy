# Replacement Capability Specification

**Trigger:** CapCut owner-independence FAIL (KITCHEN-VIDEO-OPERATIONAL-1)  
**Next package (authorized later, not executed here):** `KITCHEN-VIDEO-PROVIDER-SELECTION-1`  
**Do not select or integrate a provider in this package.**

---

## Required replacement capabilities

The replacement production path must support:

| Requirement | Notes |
|-------------|--------|
| API / programmatic execution | Studio runtime can invoke without a human desktop editor |
| Studio-provided images/video/assets | Accept controlled stills/clips from work packet |
| Deterministic scene ordering | Work-packet scene list is authoritative |
| Text / captions | On-screen caption treatment per packet |
| CTA | Locked CTA copy/placement rules |
| Certified MP3 input | Exact path + SHA-256 of sealed voice artifact |
| Aspect 9:16 | Vertical short-form |
| Resolution target 1080×1920 | Or documented equivalent that meets contract |
| Duration 15–30 seconds | Catalog authority |
| MP4 export | Real decodable video — no placeholders |
| No routine human editor | Owner/Tagia not required for ordinary jobs |
| Commercial production rights | Explicit license truth for customer deliverables |
| Artifact persistence + hash binding | Studio bind before QA READY |
| Repeatable QA / correction regeneration | New export + new hash on correction (V1 preserved) |

---

## Explicit non-requirements for selection package

- Must not invent CapCut API support
- Must not use brittle UI automation as “integration”
- Must not silently expand `v2-rtu-short-video` offer
- Stock/music may remain unresolved unless the selected path includes licensed options with clear rights

---

## Evidence already available to inform selection (not a provider choice)

Studio already demonstrated **deterministic timeline composition inputs** in this package:

- Creative Production work packets (`wp-v1` / `wp-v2`)
- Captioned 1080×1920 scene plates
- Sealed voice MP3 hash reuse
- ffmpeg **preassembly** labeled `PREASSEMBLY-NOT-CAPCUT-EXPORT-*` proving packet → ordered scenes → voice → playable MP4 is mechanically possible **outside CapCut**

That preassembly is **not** CapCut certification and **not** a selected replacement. It only proves the work-packet model is renderable by a programmatic toolchain.

---

## Selection package must decide

1. Which provider/tool meets the table above  
2. Commercial rights / ToS for customer deliverables  
3. Least-privilege credentials model  
4. Kitchen bind + QA READY contract  
5. Whether CapCut remains named for any residual manual exception (expected: **no** for routine RTU)

Do **not** begin `KITCHEN-VIDEO-PROVIDER-SELECTION-1` until Owner authorizes it.
