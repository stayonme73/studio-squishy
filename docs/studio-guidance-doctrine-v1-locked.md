# Studio Guidance Doctrine — LOCKED

| Field | Value |
|---|---|
| Status | **LOCKED** |
| Owner | Tagia |
| Date | 2026-07-18 |
| Scope | Studio-wide assistance timing (Lobby first; applies later to other rooms) |

## Locked principle

**The Studio should guide based on user behavior, not assumptions.**

- It remains quiet when the customer is progressing naturally.
- If the customer hesitates or appears uncertain, the Studio offers brief voice guidance.
- The goal is assistance without interruption.

## Version 1 application — Studio Lobby

- First-visit storage (`studioLobbyVisited`) avoids repeating the same spoken greeting on every return.
- The **hesitation timer** (approximately 8 seconds with no podium progress) is the primary trigger — not “first visit” alone.
- Someone new who clicks immediately hears nothing.
- Someone returning who is distracted may still need help later (future iterations may extend hesitation beyond first visit; V1 arms the timer on first visit only).
- Spoken guidance plays at most once per cooldown while waiting and cancels when the customer begins progressing.
- If browser audio is blocked: fail silently for audio — a runtime chrome label still shows direction. No permission popup. Podium interaction stays fully functional.
- **Lobby greeting script LOCKED (Tagia 2026-07-19)** — see `studioLobbyPodiumGuidanceV1.spokenLine` / `hesitationPrompt` in `src/config/studio-lobby-podium-guidance-v1.ts`. Do not revise without Tagia approval.

## Deferred (not this package)

**Deferred voice refinement:** System/browser TTS may remain for playback. Do **not** spend time tuning personality or cadence in this package.

Later:

- Replace the **voice source** with a warmer, more natural Studio voice — keep the locked greeting script unless Tagia revises it.
- Keep the voice implementation modular so the **voice source** can change without rebuilding Lobby interaction.

**Hard truth:** “More natural” is not just picking a prettier voice. It depends on script length, pacing, pauses, pronunciation, and **when** the Studio chooses to speak. Even an excellent voice will sound robotic if the sentence is too long or fires at the wrong moment.

The greeting script is locked. Final Studio voice *delivery* comes later. This is **not** a blocker for the Lobby foundation.

## Related

- Lobby implementation: `src/config/studio-lobby-podium-guidance-v1.ts`, `src/lib/studio-lobby-podium-guidance.ts`
- Lobby environment lock: `docs/studio-lobby-v1-locked.md`
