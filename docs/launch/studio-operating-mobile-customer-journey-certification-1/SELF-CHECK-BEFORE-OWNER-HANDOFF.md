# Self-check before owner handoff (LOCKED 2026-09-05)

**Package:** `STUDIO-OPERATING-MOBILE-CUSTOMER-JOURNEY-CERTIFICATION-1`  
**Status:** LOCKED for the remainder of this package.  
**Mobile:** remains OPEN. **Merge:** no until the package is actually certified.

Owner Samsung is **final acceptance**, not the first QA pass.

Sequence: **builder QA → proof → owner acceptance.**  
Forbidden: builder change → owner finds the problem → builder fixes → repeat.

---

## Rule

Do not return work to the owner immediately after making a change.

Before every owner handoff, complete your own QA pass and provide proof that the change works.

### 1. Implement it

### 2. Inspect your own work

Verify the **actual rendered result**, not just the source code or intended CSS.

### 3. Test the behavior

Run the relevant automated regressions and exercise the exact customer path affected.

### 4. Capture proof

Provide screenshots or equivalent visual proof for the changed screen/state **before** asking the owner to test it.

The proof must show the actual result you are claiming.

If a state changes quickly, such as a selected button before navigation, create a safe local/test proof method that verifies the selected state **without changing production/customer behavior**. Do not add delay, animation, or an extra stop just so a flash is easier to photograph.

Do not ask the owner to “see if it works” when you can verify it yourself first.

### 5. Compare against the written Studio standards

Before handoff, check:

- tile system
- button hierarchy
- typography
- selected/unselected states
- mobile layout
- protected/frozen screens
- functional behavior

### 6. Keep working until your own QA passes

If your screenshot still shows the wrong color, wrong tile, broken state, dead button, layout issue, or regression, **fix it before returning**.

Do not hand the owner known-bad or unverified work.

### 7. Owner handoff comes last

When you return, report:

- what changed
- what you tested
- regression result
- screenshots/proof
- what remains open, if anything

If the dev server dies, hangs, loses hydration, or serves stale assets, resolve that before owner handoff too.

---

## Authority

Config: `src/config/studio-mobile-customer-journey-certification-v1.ts` (`selfCheckBeforeOwnerHandoff`)  
Cursor rule: `.cursor/rules/mobile-self-check-before-owner-handoff.mdc`
