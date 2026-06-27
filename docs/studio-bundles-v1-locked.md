# Studio Bundles — Locked (V1)

**Status:** Locked — bundle names, descriptions, included services, billing type, and bundle rules are frozen unless Tagia approves a business change.

**Code reference:** `src/project-summary/types.ts` (`PROJECT_SUMMARY_LABELS`, `PROJECT_SUMMARY_MOCK`)

**Related locks:** [Recommendation Engine Philosophy](recommendation-engine-philosophy-v1-locked.md) · [Recommendation, Not Direction](recommendation-not-direction-v1-locked.md)

---

## ⚡ Spark

**Best for businesses just getting started.**

Perfect for launching a new business, product, or service with a strong foundation.

**Includes:** Brand Identity Refresh, Brand Messaging, Marketing Campaign, Social Media Marketing

**One-Time Investment**

---

## 🚀 Momentum

**Best for established businesses that need ongoing creative support.**

Designed for business owners who want to free up time while maintaining a consistent marketing presence.

**Includes:** Social Media Marketing, Email Marketing, SMS Marketing, Marketing Calendar, Marketing Campaign, Marketing Copywriting

**Monthly Plan**

---

## 📈 Growth

**Best for businesses focused on growth.**

For businesses ready to increase visibility, expand their reach, and accelerate growth through a more comprehensive marketing partnership.

**Includes:** Marketing Campaign, Social Media Marketing, Email Marketing, SMS Marketing, Marketing Calendar, Marketing Copywriting, Marketing Video Production, Marketing Optimization, Marketing Assets

**Monthly Plan**

---

## Bundle Rules (LOCKED)

- Studio Bundles are **fixed offerings**
- Bundle contents **cannot** be added to, removed from, or customized
- Clients needing a personalized solution → **Custom Studio Plan** from Discovery answers
- Recommendation Engine may recommend a bundle when appropriate; client is free to choose a different bundle or continue with their personalized Studio Plan

---

## Where bundles appear

| Context | Role |
|---------|------|
| **Project Summary** | Optional **Prefer a bundled option?** section — fixed bundle cards after Our Recommendation |
| **Studio Guide** | Compare packages — marketing / education (deliverable quotas; separate from bundle service lists) |
| **Secure Checkout** | Payment for approved plan — uses Studio Guide package config until slide-out checkout ships |
| **Recommendation Engine** | May suggest a bundle when mapping supports it (wiring **paused** per build order) |

**Custom Studio Plan** (Path A) remains the primary recommendation path. Bundles are optional shortcuts — not customizable.

---

## What this lock does *not* change

- Studio Guide V1 deliverable quotas and pricing (`src/config/studio-guide-v1-lock.ts`) — payment page source of truth
- Recommendation Engine bundle-matching scoring (wiring **paused**)
- Service Catalog entries, production allocation, or Discovery Mapping rules
- Discovery board UI or split-layout mechanics

---

## Related locks

- [Recommendation Engine Philosophy](recommendation-engine-philosophy-v1-locked.md) — bundles as optional fixed shortcuts
- [Customer Journey V1](customer-journey-v1-locked.md) — Project Summary in post-discovery path
- Agent rules: `AGENTS.md` — business rule freeze section
