# COMMUNICATION-FULL-LOOP-CERTIFICATION — COMM-CERT-1

**Package:** `COMM-CERT-1 — Full Project Communication Certification`
**Status:** Certification evidence staged · awaiting Tagia commit approval · **Master Launch List not edited**
**Date:** 2026-07-28
**Protected tip:** `ea32bfde4b9aa8c22fd8478038edb87661e49f5c`

---

## 1. Protected tip and scope

| Field | Value |
|---|---|
| Tip | `ea32bfd` — COMM-5 protected remotely |
| Branch | `fix/discovery-responsive-layout` |
| Sync at cert start | 0 ahead / 0 behind |
| Scope | End-to-end certification of COMM-2 → COMM-5 as one workflow |
| Product code changes | **None** |

Certification only. No feature build. No MLL edit in this package.

---

## 2. COMM-2 through COMM-5 protected contracts

| Package | Role certified |
|---|---|
| COMM-2 | Durable campaign stream · `customer` / `studio_staff` · accepted-only · idempotency · domain separation |
| COMM-3 | File Room receive/reply · session staff identity · exact reply confirmation |
| COMM-4 | Board send/list · session customer identity · ownership · You / The Studio |
| COMM-5 | New reply indicator · View project messages ack · newer-reply restore |

---

## 3. Certification environment

- Runtime: Next.js dev at `http://127.0.0.1:3000` against tip `ea32bfd`
- Customer: `client-a@local.dev`
- Owner/staff: `tagia@local.dev`
- Disposable campaigns under `data/campaigns/` cleaned after runs
- Communication + acknowledgment records cleaned after runs

---

## 4. Test identities

| Role | Account | Use |
|---|---|---|
| Customer | `client-a` / `client-a@local.dev` | Board send, indicator, ack |
| Other customer | `client-b` / `client-b@local.dev` | Cross-customer 403 / File Room denied |
| Owner | `tagia` / `tagia@local.dev` | File Room receive/reply |

---

## 5. Disposable campaign setup

Smoke seeds campaign envelopes with `clientUserId: client-a`, payment-received project status, unique `comm-cert-*` ids. Cleanup removes campaign JSON, communication JSON, and matching ack files.

---

## 6. Customer send proof

Desktop + phone:

- Project communication section visible
- Materials We Still Need present
- Natural composer send
- Exact copy: `Message sent to The Studio.`
- Message labeled **You**
- Survives refresh
- No new-reply indicator from customer-only message

---

## 7. Staff receive proof

File Room `/file-room/[campaignId]`:

- Same customer message body visible
- Campaign context visible
- Reply action / awaiting state before Studio reply

---

## 8. Staff reply proof

- Natural File Room submit
- Exact copy: `Reply saved to the project communication record.`
- Reply visible in stream
- Survives File Room refresh
- No delivered / email / seen / live / Host / Voice / AI claims

---

## 9. Customer notification proof

After Studio reply:

- `New reply from The Studio`
- `View project messages`
- Studio reply labeled **The Studio**
- Customer message still **You**
- No read / seen / delivered / email / response-time claims

---

## 10. Customer acknowledgment proof

- Explicit **View project messages**
- Studio reply visible
- Indicator clears
- Reload keeps indicator cleared
- Thread remains usable
- COMM-2 message status unchanged (ack domain separate)

---

## 11. Newer-reply return proof

- Second Studio reply via File Room
- Board indicator returns
- Newer reply visible
- Other campaign shows no false indicator

---

## 12. Authorization proof

| Check | Result |
|---|---|
| Unauth customer GET/POST | 401 |
| Unauth staff GET | 401 |
| Unauth ack GET | 401 |
| Cross-customer campaign | 403 |
| Customer on staff reply route | 403 |
| Customer File Room | access-denied |
| Spoofed customer identity | ignored · session customer |
| Nonexistent ack marker | 404 |

Automated suite also covers customer-message-as-marker rejection, cross-campaign marker rejection, and staff route spoof rejection.

---

## 13. Cross-campaign isolation

Acknowledging / indicating on campaign A does not create a false indicator on campaign B (browser). Automated tests prove ack files are campaign+customer scoped.

---

## 14. Persistence proof

Customer message, staff reply, and acknowledgment survive refresh. Automated tests prove ack survives store recreation path and newer-reply restore after ack.

---

## 15. Idempotency and duplicate protection

Covered by COMM-2 / COMM-3 / COMM-4 / COMM-5 Vitest: replay returns original; conflicting key → 409; duplicate submit does not create extra records.

---

## 16. Domain separation

Customer-visible API views omit staff ids and idempotency keys. Thread excludes complaint / refund / Intake / activity / outbox / owner-decision domains. Acknowledgment store is separate from COMM-2 message status.

---

## 17. Desktop proof

~1440px: full loop PASS · no horizontal overflow · composers reachable.

---

## 18. Phone proof

~390px: full loop PASS · no horizontal overflow · composers reachable.

---

## 19. Accessibility

- Customer textarea labeled `Message to The Studio`
- Staff reply labeled `Reply to this customer message` (after intentional reply selection)
- Notification uses text status + explicit action (not color alone)
- No pulsing indicator
- Multiline Enter preserved on textareas

---

## 20. Automated regression result

```text
npx vitest run \
  src/lib/project-communication/access.test.ts \
  src/lib/project-communication/actions.test.ts \
  src/lib/project-communication/customer-ui.test.ts \
  src/lib/project-communication-staff-route.test.ts \
  src/lib/project-communication-customer-route.test.ts \
  src/lib/project-communication-ack/actions.test.ts \
  src/lib/project-communication-ack-route.test.ts
```

**36/36 PASS** · 0 failures

---

## 21. Browser certification result

```text
COMM_CERT_BASE_URL=http://127.0.0.1:3000 node scripts/smoke-comm-cert-full-loop.mjs
```

**67/67 PASS** · 0 failures

Script remains **untracked**.

---

## 22. Data cleanup

Disposable campaigns, communication files, and acknowledgment files removed after cert. Smoke artifacts under `tmp/comm-cert-smoke` removed.

---

## 23. Remaining limitations (not defects for this boundary)

In-product only. Still absent by design:

- email · SMS · push · browser notifications
- attachments
- read / delivered / seen receipts
- live chat · typing indicators · response-time promises
- global inbox / notification center
- Host / Voice / AI-generated replies

Purchased-room Auth Route/Data Protection remains a separate Customer-One lock (Hierarchy C #6 / Gate #4–#5) and is **not** claimed complete by this communication cert.

---

## 24. Customer-One readiness impact

Full in-product project communication loop is certified at tip `ea32bfd`. Gate #7 and Hierarchy C #4 may be truth-refreshed to **COMPLETE WITH LIMITS** in a **separate** MLL package — not in this commit.

---

## 25. Master Launch List recommendation

### Hierarchy C item #4 — current wording (quoted)

```text
4. [ ] **Customer communication and follow-up access** — MISSING
```

**Recommend:** `COMPLETE WITH LIMITS`

Limits:

- in-product Studio Board + File Room communication only
- campaign-scoped
- no external notification channels
- no attachments
- no read or delivery receipts

Do **not** edit the MLL in COMM-CERT-1.

### Gate #7 — current wording (quoted)

```text
| 7 | Customer can communicate with The Studio | **MISSING** |
```

**Recommend:** `COMPLETE WITH LIMITS` (same in-product limits as above).

Do **not** edit the MLL in COMM-CERT-1.

---

## 26. Final certification decision

**CERTIFIED** — full customer ↔ Studio project communication loop passes at tip `ea32bfd` with zero product-code changes required.

**Next Tagia actions (separate packages):**

1. Approve / commit this certification doc (if desired)
2. Authorize a Master Launch List truth-refresh package for Hierarchy C #4 and Gate #7
3. Continue Auth / Board truth work as separate launch items

Smoke script: `scripts/smoke-comm-cert-full-loop.mjs` (untracked unless Tagia later approves committing a reusable cert script).
