---
status: open
date: 2026-10-08
severity: High
---

# Risk: Netlify deploy served raw build output instead of running the Next.js runtime

**Status:** open
**Date:** 2026-10-08 (PST)
**Severity:** High

## Details

The Netlify was failing and so the .env.local variables were added to Netlify

Fix Netlify 404s: add Next.js runtime plugin config
Site had no netlify.toml, so Netlify served the raw .next build output
statically instead of running @netlify/plugin-nextjs to wrap App Router
SSR routes/API handlers as Functions. Adds a root netlify.toml
(base=contractiq, publish=.next, @netlify/plugin-nextjs) and pins the
plugin as a devDependency.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
