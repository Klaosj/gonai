# GoNai

**plan · go · never over budget** — a one-day Bangkok trip planner that prices the whole day (venues, transport, food) before you leave the house.

🔗 **Live:** https://gonai-three.vercel.app

![GoNai](public/og.png)

## Why

Most trip planners list places. None tell you what the day will actually cost end-to-end. GoNai is mobile-first and deliberately narrow — one launch zone (Siam) with a curated, field-checked venue catalog and real route costs — so the budget number is real, not estimated.

## What it does

- Pick your vibe and budget → get a full-day itinerary with every baht itemized
- **Chat-to-plan** — describe your day in plain language; parsed by an LLM (Claude or Ollama, whichever is configured) with a keyword-parser fallback so it never fails hard
- Explore venues, save plans, share a public plan page (`/p/[id]`), keep trip history
- Optional LINE Login — the app is fully usable anonymously
- Installable PWA (manifest + icons)

## Stack

Next.js 15 (App Router) · React 19 · Tailwind v4 · Supabase (Postgres) · Vercel · Anthropic SDK / Ollama · IBM Plex Sans Thai

## Run locally

```bash
npm install
cp .env.example .env    # every key is optional in dev — see comments in the file
npm run dev
```

Dev uses a local JSON store; set `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` to switch to Supabase automatically.

| Command | What it does |
|---|---|
| `npm run check` | logic + infra + pipeline test suites |
| `npm run journey` | headless-browser user journey |
| `npm run preflight` | env sanity check before deploying |
| `npm run seed:w2` | load field-collected venues/routes into Supabase |

## Project docs (mostly Thai)

- [`PLAN.md`](PLAN.md) — build plan, design tokens, decision log
- [`docs/LAUNCH-RUNBOOK.md`](docs/LAUNCH-RUNBOOK.md) — deploy/ops runbook, SLOs, backup & recovery
- [`docs/QA-RESULTS.md`](docs/QA-RESULTS.md) — 10-round QA run
- [`design/`](design/) — theme plans · [`Gonai Design/`](Gonai%20Design/) — HTML mockups

## Status

Live since 2026-08-16. Field-day venue verification and LINE Login rollout are still in progress — the runbook's status block is the source of truth.

## How it was built

Built nights and weekends by [Klao](https://github.com/Klaosj), AI-assisted with Claude Code. I own the product decisions, data model, and integrations; the AI writes most of the code. Full story on [klao-site.vercel.app](https://klao-site.vercel.app).
