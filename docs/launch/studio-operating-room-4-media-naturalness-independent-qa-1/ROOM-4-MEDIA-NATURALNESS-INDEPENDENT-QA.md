# ROOM-4-MEDIA-NATURALNESS-INDEPENDENT-QA

**Requirement:** `ROOM-4-MEDIA-NATURALNESS-INDEPENDENT-QA`  
**Status:** **REQUIRED · NOT CERTIFIED**  
**Do not mark complete.**

Required before external launch, or before removing the customer listening-approval limit.

Config: `src/config/studio-room-4-media-naturalness-independent-qa-v1.ts`

---

## Already automated

The Studio can already catch these from production packets and **actual rendered frames**:

- clipping / peak levels
- narration transcript
- sentence timing
- semantic beat alignment
- no mid-sentence cuts
- rendered-frame text safety
- CTA hold
- correct facts
- product visibility
- blank-edge detection
- multiple-scene consistency

Motion safety and semantic timing defects are Studio defects. They must be corrected before delivery. They are not a customer’s paid revision.

---

## Not yet fully automated

The Studio does **not** yet have a proven independent AI listener that can reliably judge whether synthetic narration sounds natural enough for a paying customer.

Until that capability is certified:

- customer listening approval is mandatory
- routine audio approval does not require Tagia
- negative customer feedback about choppy or robotic speech triggers a no-charge Studio correction
- it does not consume revision allowance
- unresolved voice-quality failure must not be silently released

---

## Defect / revision doctrine

Future customers may still exercise taste and approval. They are not responsible for fixing Studio defects. Studio defect corrections — including choppy or robotic Studio narration, type leaving the safe area, and other production mistakes — are never deducted from paid revision allowance.

---

This requirement is a carry-forward. It is **not** closed by Scenario 2 PASS WITH EXPLICIT LIMITS.
