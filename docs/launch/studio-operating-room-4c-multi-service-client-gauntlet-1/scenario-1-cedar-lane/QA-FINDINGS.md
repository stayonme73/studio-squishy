# QA findings — Scenario 1

Fact-integrity + Letter-contract run `execute-room-4c-scenario-1.mts` (runId `5d70fd84-5238-4e2c-a982-c56bbc2eafeb`):

| Check | Result |
|-------|--------|
| Copy quality | PASS |
| Campaign creative automated QA | PASS |
| Overflow / clip gate | PASS |
| Social 1080×1080 PNG | PASS |
| Phone preview 390×390 full square (not a crop) | PASS |
| Handout PNG 2550×3300 | PASS |
| Handout PDF MediaBox 612×792 pt (US Letter) | PASS |
| Print contract id | `campaign-print-handout-v2-us-letter` |
| PNG/PDF open | PASS |
| Exact phone `(804) 555-0147` on caption, print contact, video CTA plate | PASS |
| Exact URL `cedarlaneorganizing.example/book` on caption, print contact, video CTA plate | PASS |
| Spoken phone/URL on narration | PASS |
| Stale `(804) 555-0172` / `/fall-reset` absent from current render sources | PASS |
| Historical print default remains v1 1024×1536 | PASS (unit tests) |
| Room 4B Nia date color remains muted | PASS (unit tests) |
| Video duration in band | PASS (23.68s) |
| Owner labor | None |

Owner visual / listening / print review is **not** machine-certified.

**Copy attestation (Scout, not Tagia):** Brand voice is calm/practical; no invented price or unsupported claims. Canonical contact facts now match Tagia’s brief.
