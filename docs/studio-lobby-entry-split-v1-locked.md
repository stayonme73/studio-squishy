# Studio Lobby Entry Split — Functional Contract v1

**Status:** LOCKED · Functional contract owner-approved 2026-07-19 · **Lobby Entry Film Design v1 — Design Approved** (Image #1) · Runtime implementation over locked Lobby  
**Package:** Lobby Entry Split  
**Authority context:** `docs/studio-lobby-v1-locked.md` · `docs/studio-guidance-doctrine-v1-locked.md` · `docs/customer-journey-v1-locked.md`  
**Design reference:** `docs/illustration/references/studio-lobby-entry-film-v1.png`  
**Runtime:** `src/config/studio-lobby-entry-v1.ts` · `src/components/entrance/StudioLobbyEntryFilm.tsx` · wired in `WelcomeHallWelcomeScene.tsx`

---

## Owner approval summary (2026-07-19)

| Item | Decision |
|------|----------|
| Shared Lobby entrance | **Approved** |
| Two paths: New to the Studio / Returning Client | **Approved** |
| New ≠ “start a new project” | **Approved / locked principle** |
| Voice silent until New to the Studio | **Approved / locked** |
| Returning → Sign In or Open My Studio Board | **Approved** |
| Additional projects from Board only | **Approved** |
| Hesitation timer (1.2s vs ~8s) in this package | **Removed** — deferred to later UX tuning |
| Help through film | **Available** — assists decision-making; does not bypass entry |
| Phone dock must not bypass film | **Requirement** (not merely a risk) |
| Copy “Returning Client” vs “Returning to Your Studio” | Keep **Returning Client** for now; warmer variant deferred |
| Entry choice permanence | **Visit-level decision** — not a permanent preference |
| Unsupported security copy (e.g. “Always secure”) | **Forbidden** |

---

## Locked product principle

> **“New to the Studio” identifies first-time visitors. It does not mean “start a new project.” Existing clients start all future projects from their Studio Board.**

---

## 1. Shared entrance

- Studio Lobby (`/` · `/studio-lobby`) remains the **single shared public entrance**.
- A **frosted entry film** (runtime chrome only) presents exactly two journey choices.
- The locked Lobby environment, Host identity, and baked podium artwork are **not** redesigned in this package.

---

## 2. Meaning of the two choices

| Choice | Means | Does not mean |
|--------|--------|----------------|
| **New to the Studio** | First-time visitor who does not yet have a Studio Board | Start another / additional project |
| **Returning Client** | Existing client returning to their private workspace | Enter the first-time guided conversation |

---

## 3. New to the Studio — routing

```text
Lobby
  → New to the Studio
  → (film yields; Voice may activate)
  → Guided Studio conversation / intake
  → Service and deadline suitability
  → Payment
  → Account / verification as required
  → Studio Board
```

- Customers complete intake through conversation (speak or type).
- The Studio Guide operates the tablet and presents confirmation panels.
- Conversation Voice invite may be set **only** on this path.

---

## 4. Voice silence gate (HARD)

> **The Studio Voice must not speak before the visitor selects New to the Studio.**

Until that selection:

- No hesitation greeting speech
- No Host “ask guide” speech
- No Conversation Room voice invite

**Deferred (out of this contract):** exact Voice timing *after* New is selected (immediate vs short delay). That is a later UX tuning pass, not architecture.

---

## 5. Returning Client — routing

```text
Lobby
  → Returning Client
  → Sign In  (if no valid session)
  → Studio Board
```

If an authenticated session already exists:

```text
Lobby
  → Returning Client
  → Open My Studio Board
  → Studio Board
```

- Do **not** require sign-in again when the session is valid.
- Do **not** set Studio Voice invite on this path.
- Returning clients start additional projects **from inside Studio Board**, never via New to the Studio.

**Named dependency (not this package):** Board already exposes “New Campaign” / “START A NEW PROJECT” → Route Map. Long-term Board-owned additional-project spine may be redefined later; Lobby must not absorb that job.

---

## 6. Entry choice is visit-level (not a permanent preference)

> **The entry choice is not a permanent preference. It is a decision for the current visit. Session state may change the available actions (e.g. Sign In vs Open My Studio Board), but the visitor is never locked out of the alternate path if appropriate.**

- Do not bake a lifetime “always New” or “always Returning” flag that blocks the other door.
- Session-sticky film state for Back/refresh within a visit is allowed; permanent account preference is not.

---

## 7. Film interaction requirements

| Requirement | Rule |
|-------------|------|
| Journey controls under film | Inactive until a choice (podium, primary start CTAs) |
| **Phone dock CTA** | **Must not bypass the film** — hard requirement |
| Host voice triggers | Blocked until New |
| **Help Center** | **Remains visible and usable through the film** — assists “which option do I need?” without forcing a journey choice first |
| Environment / Host visuals | Remain visible through frost; not primary click for journey start |

---

## 8. Back navigation and close-film

- Choosing either option should be durable for the **current browser visit** so Back does not force a confusing re-onboarding speak.
- Return to Lobby from Conversation Room must not auto-speak Lobby Voice.
- Pre-payment working draft persistence remains in force (existing lock).
- Closing the film without a journey choice is not a silent “start”; Help is the supported escape for uncertainty.

---

## 9. Desktop and real-phone

- Film and both choices must certify on desktop and real phone.
- Phone dock must present or respect the same gate — **no parallel LET’S GET STARTED that skips the film**.
- Browser zoom change to use The Studio remains a bug (existing Studio standard).

---

## 10. Reality Doctrine

- Do not propose or ship unsupported statements such as **“Always secure.”**
- Privacy, security, storage, access, verification, or protection language must be literally supported by current implementation.
- Prefer neutral access language (e.g. “Sign in to open your Studio Board”).

---

## 11. Copy direction (evaluation baseline — not final film art)

**Heading:** Welcome to The Studio  
**Supporting line:** Choose where you’d like to begin.

| State | Option | Subline | CTA |
|-------|--------|---------|-----|
| — | NEW TO THE STUDIO | Begin with a guided conversation. | LET’S GET STARTED |
| Signed out | RETURNING CLIENT | Sign in to access your Studio Board. | SIGN IN |
| Signed in | RETURNING CLIENT | Return to your Studio Board. | OPEN MY STUDIO BOARD |

Warmer label **“Returning to Your Studio”** is noted for a later copy pass; **Returning Client** stays for contract clarity now.

**Design lock (Image #1 — keep; do not regenerate):** frosted glass panel, two-card layout, gold/white palette, Help Center section, premium Studio feel. Runtime UI only — not a flattened plate. X closes film without starting a journey; soft footer must not imply security guarantees.

---

## 12. Explicit out of scope

- Creating, regenerating, or editing Lobby / Host images (locked Lobby plate stays)
- Changing the locked Lobby environment plate
- Password Recovery, Project Claim, Route Protection redesign
- Board additional-project spine rewrite
- Parking Lot
- Final Voice timing after New (UX tuning pass)

---

## 13. Sequence

1. ~~Design — frosted entry film~~  
2. ~~Owner visual approval (Image #1)~~  
3. ~~Engineering — runtime film over locked Lobby~~  
4. **Next critical path:** authentication / Studio Board entry blockers  

---

## Inspection baseline (pre-implementation facts)

Documented at lock time:

- Was: single podium path; no dual film; Lobby did not probe session
- Was: Voice could speak before any choice — **gated under this contract**
- Board new-project CTA exists → `/route-map` (dependency named above)
- No “Always secure” found in repo at inspection

---

**Contract verdict:** Functional + design locked. Implement faithfully as runtime UI over the locked Lobby; then return focus to auth / Studio Board entry.
