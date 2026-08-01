# REFUND-UI-INSPECT-1

**Status:** DEFINED · **INSPECTION NOT AUTHORIZED**  
**Type:** Inspection package definition (docs only until separately authorized)  
**Definition base / protected tip:** `e6be8bd400b60e62dd25688da5d8c1741b4e46ce`  
**Branch:** `fix/discovery-responsive-layout`  
**Active room:** Payment room (Refund authority / customer Refund UI path)  
**Authority:** Working Protocol §1 room-completion rule (LOCKED 2026-08-01)  
**Prior sealed room:** Unified Review / Final / Delivery — **UR-ROOM-CERT-1 SEALED · BROWSER-CERTIFIED WITH EXPLICIT LIMITS**

---

## Objective

Inspect the **Payment room’s actual refund authority** before any customer Refund UI is designed or built.

Determine the **smallest truthful customer-facing Refund UI package** (or package sequence) that the system can honestly support — without putting polished chrome over rules, amounts, approvals, timelines, or provider completion the system does not possess.

**This definition does not authorize the inspection run.** After the definition is sealed, Tagia must separately authorize inspection. Construction remains blocked until sealed inspection evidence plus separate construction authorization.

---

## Why inspect before UI

Refund behavior touches eligibility, payment state, approval authority, status transitions, customer messaging, and potentially provider integration. Defining UI first risks inventing:

- Request / approve / deny / execute paths that do not exist  
- Eligibility or partial-refund rules that are not persisted  
- “Refund completed” claims without provider or ledger truth  
- Timelines and amounts the Studio cannot prove  

**Inspect the cash plumbing before installing a shiny red “Refund” faucet.**

---

## Locked inspection questions (when authorized)

Scout must answer from the repo and sealed Help Center / Payment authorities — **without inventing eligibility, refund amounts, approval authority, timelines, provider success, or completion claims**, and **without calling payment providers**:

1. What **payment, refund, cancellation, and transaction states** already exist (types, enums, records, statuses).  
2. Whether refunds can actually be **requested, approved, rejected, issued**, or **only recorded**.  
3. **Which actor** has refund authority (customer · owner/staff · system · none).  
4. Whether **provider-side refund execution** exists (or only stubs / manual / absent).  
5. Which **eligibility rules** are persisted versus missing business policy.  
6. What the **customer can truthfully see and do** today on Payment / Help / related surfaces.  
7. Whether **refund status history** already exists, or would require an extension of an existing authority (not a second store invented lightly).  
8. Authorities for refund **amount, status, timestamp, actor, reason, and provider reference** (present vs absent).  
9. Honest customer messaging for states that the system can support among:  
   - unavailable  
   - requestable  
   - pending  
   - approved  
   - denied  
   - completed  
   - failed  
   - partially refunded (**only if** supported by evidence)  
10. **Payment-room architecture** and truthful customer-facing placement for any future Refund UI.  
11. Dependencies on checkout, campaign payment records, Owner Desk, Help Center policy copy, and auth.  
12. Whether any of the **113 unrelated dirty WIP** entries overlap this architecture (report only — do not touch).  
13. The **smallest truthful construction package or package sequence**.  
14. Required **unit, integration, browser, and evidence** certification for that construction.  
15. Classification of each missing piece as **launch blocker**, **acceptable certified limit**, or **later enhancement**.

---

## Hard locks for this definition

| Lock | Rule |
|---|---|
| Inspection first | No Refund UI construction from this definition |
| No invention | No invented eligibility, amounts, approvals, timelines, provider success, or completion |
| No provider calls | No payment-provider API calls · no dependency installs for refund providers |
| Prefer existing authorities | Extend existing payment/refund/ledger records if present — do not invent a parallel store without Tagia |
| Sealed Unified Room | Do **not** reopen UR-ROOM-CERT-1 or sealed Review tools without contradictory evidence |
| Out of scope | No PAGE-TABS-1 · no Board Materials dual UX · no project-wide Gate #17 claim |
| Dirty WIP | Leave all **113** unrelated entries untouched |
| Construction combination | Undecided until inspection evidence |

---

## Authorities to consult (read-only when inspection is authorized)

| Authority | Why |
|---|---|
| Payment / checkout / campaign payment records | States and amounts that exist |
| Refund / cancellation / transaction types and APIs | Request vs execute vs record-only |
| Owner Desk / staff refund tools | Who can approve or issue |
| Help Center refund / policy copy | Customer promises already locked — must not contradict |
| Auth / client session gates | Who may see Payment surfaces |
| Dirty tree | Overlap report only |

---

## Required inspection output (when authorized)

1. Repo verification (tip · sync · staging · dirty count)  
2. Payment / refund / cancellation / transaction state map  
3. Actor authority map (request · approve · deny · execute · record)  
4. Provider-side execution truth (exists / stub / absent)  
5. Eligibility: persisted rules vs missing policy  
6. Customer visibility and actions today  
7. Amount / status / timestamp / actor / reason / provider-reference inventory  
8. Honest state matrix (only states evidence supports)  
9. History: existing authority vs required extension  
10. Payment-room placement recommendation for a future UI  
11. Dirty-WIP overlap assessment  
12. Smallest construction package sequence  
13. Certification plan (unit · integration · browser · evidence)  
14. Blocker vs acceptable limit vs later enhancement register  
15. Risks and explicit non-claims  

---

## Hard exclusions

- No Refund UI construction or visual design package  
- No payment-provider calls or provider dependency changes  
- No invented eligibility, refund amounts, approval authority, timelines, provider success, or completion claims  
- Do not reopen sealed Unified Room (UR-ROOM-CERT-1) or sealed Review siblings without contradictory evidence  
- No PAGE-TABS-1 · no Board Materials · no project-wide Gate #17 work  
- No staging, commit, push, cleanup, restore, or format of dirty WIP during inspection  
- Leave all **113** unrelated dirty WIP entries untouched  

---

## Room sequence context

| Step | Status |
|---|---|
| Unified Review / Final / Delivery | **SEALED · BROWSER-CERTIFIED WITH EXPLICIT LIMITS** · UR-ROOM-CERT-1 |
| PAGE-TABS-1 | **Deferred** (not this package) |
| Materials dual UX | Waiting (Board room — not this package) |
| **REFUND-UI-INSPECT-1** | **This package** — defined; inspection waits |
| Refund UI construction | **Not authorized** until inspection seals + Tagia authorizes |
| Project-wide Gate #17 | **Not** claimed by this package |

---

## Authorization gates

### Docs definition (this package document)

Authorized for documentation that defines **REFUND-UI-INSPECT-1**. After this definition is sealed, **inspection remains blocked**.

### Inspection

Scout remains parked for inspection until Tagia explicitly authorizes **REFUND-UI-INSPECT-1**.

### Construction

No Refund UI construction is opened by this definition. Any later UI requires:

1. Sealed inspection evidence  
2. Explicit Tagia construction authorization  
3. Honest blocker vs limit classification from that evidence  

Until then: definition may be sealed · open construction package **none** · open inspection package **none** · product tip holds at protected control point `e6be8bd400b60e62dd25688da5d8c1741b4e46ce`.
