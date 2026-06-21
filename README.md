# The Studio

> **Product name:** The Studio · **Repository name:** `studio-squishy` (technical identifier until post–Phase 1 rename).

A separate, web-first workspace experience hosted by Squishy.

**This project is independent from [StayOnMeVoice](https://github.com) (Personal Squishy app).**

## MVP Scope

### In scope

- Studio entrance experience
- Semi-realistic warm industrial Studio environment (CSS scaffold first)
- Original Squishy greeting visitors as a host
- Whiteboard wall (visual only)
- Builder workspace
- Strategy room

### Out of scope (MVP)

- File storage
- Vaults
- Payments
- User accounts
- Supabase implementation
- Changes to Personal Squishy / StayOnMeVoice

## Tech stack

- [Next.js](https://nextjs.org) 16 (App Router)
- TypeScript
- Tailwind CSS
- Deployed on [Vercel](https://vercel.com)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Routes

| Route     | Purpose                          |
| --------- | -------------------------------- |
| `/`       | Entrance — narrative welcome     |
| `/studio` | Main Studio environment          |

## Environment variables

Copy `.env.example` to `.env.local`. Only `NEXT_PUBLIC_SITE_URL` is used in MVP.

Supabase variables are documented but **not installed or configured** during MVP.

## Project structure

```
src/
├── app/              # Routes
├── components/       # UI (entrance, studio, ui)
├── config/           # Site config and design tokens
├── lib/              # Utilities and future Supabase clients
└── types/            # Shared TypeScript types
```

## Deployment

Connected to Vercel. Pushes to `main` deploy to production; pull requests receive preview URLs.
