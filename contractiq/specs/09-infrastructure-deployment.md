# Spec 09 — Infrastructure & Deployment

Source: `docs/engineering/engineering-doc.md` §6, Open Items #5.

## Decision

Hosting: **Netlify**, running the Next.js app via Netlify's Next.js runtime
adapter (per the PRD's cost assumptions and this project's Lab 3 deployment
walkthrough).

## Concrete Constraint

Netlify Functions default to a synchronous execution limit in roughly the
same range as Vercel's Hobby tier (~10s). `POST /api/contracts/:id/process`
(spec 03) is budgeted up to 30s P95 (includes a GPT-4o call budgeted up to
20s), which exceeds this on a free/default tier.

Two acceptable mitigations (decide before Stage 6 deploy):
1. Upgrade to a Netlify plan/configuration that allows extended function
   duration for this specific route.
2. Restructure `/api/contracts/:id/process` as a Background Function
   (Netlify's async function type, no response-time ceiling), with the
   client polling `GET /api/contracts/:id` (spec 04) for completion rather
   than awaiting the process call directly.

This is a function-timeout problem inherent to any serverless host at this
budget, not specific to Netlify.

## Required Env Vars

See `.env.local.example` at the project root -- all Supabase and OpenAI
vars. No Netlify-specific runtime env vars beyond what Netlify's build
system sets automatically.
