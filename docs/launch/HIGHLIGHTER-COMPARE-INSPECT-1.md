# HIGHLIGHTER-COMPARE-INSPECT-1

**Status:** DEFINED · **NOT AUTHORIZED**  
**Type:** Inspection only — no edits, no staging, no commits  
**Control point:** `1e1308e9f0e4c8b5728a605e4c930198fc2d17e6`  
**Branch:** `fix/discovery-responsive-layout`  
**Active room:** Unified Review / Final / Delivery Room  
**Authority:** Working Protocol §1 room-completion rule (LOCKED 2026-08-01)

---

## Objective

Inspect **highlighter and version comparison** as the next capability required to **finish the Unified Review / Final / Delivery Room**.

This is still **contract-only** in product. Inspect what version data, file relationships, review surfaces, and annotation behavior already exist. Do **not** invent comparison behavior or a second version system.

Do **not** inspect or build Refund UI.

---

## Room-completion context

1. Customer Update History — **SEALED** · UPDATE-HISTORY-1 @ `1e1308e…` · BROWSER-CERTIFIED WITH LIMITS
2. Highlighter / version comparison ← **this inspection**
3. Any remaining launch-critical gaps discovered inside that same room
4. Certify the room as complete with explicit limits
5. Only then move to the Payment room for Refund UI

---

## Scout must determine (when authorized)

1. What versions and file relationships are actually recorded today
2. Whether a customer can identify the current version versus the prior version
3. What review annotations, comments, selections, or correction references already exist
4. Whether “highlighting” means visual markup, changed-content emphasis, selected feedback regions, or something else in the current contracts
5. Which file types can truthfully support comparison
6. What is missing versus merely hidden
7. Whether the feature needs one package or a safe sequence
8. What browser certification is required
9. Whether any other launch-critical gap remains in this room after comparison is finished
10. Whether the 113 unrelated dirty WIP entries overlap this area (report only — do not touch)

---

## Hard exclusions

- Inspection only
- No product or documentation edits during the inspection
- No staging, commit, or push
- No Refund UI or Payment work
- Do not create invented versions, diffs, annotations, or file relationships
- Do not reopen sealed Update History, correction accounting, issue reporting, or C8a–C8e without contradictory evidence
- Leave the 113 unrelated dirty WIP entries untouched

---

## Authorization gate

Scout remains parked until Tagia explicitly says:

> **authorize HIGHLIGHTER-COMPARE-INSPECT-1**

Until then: control point holds · open package **none** · no code moves.
