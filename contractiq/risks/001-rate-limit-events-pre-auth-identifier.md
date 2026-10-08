---
status: open
date: 2026-10-08
severity: High
---

# Risk: rate_limit_events schema must not be keyed by user_id alone

**Status:** open
**Date:** 2026-10-08 (PST)
**Severity:** High

## Details

I caught a real design flaw before finishing this: the skill's own template keys `rate_limit_events` by `user_id`, but the "Authentication: 10/min" limit is explicitly meant for pre-auth requests (login/signup) — where there's often no valid user_id yet (failed logins against nonexistent emails, signups for new accounts). A user_id-only table can't rate-limit the exact case that matters most: brute-force login attempts. I'm switching the table to a generic identifier (either `user:<uuid>` post-auth or `ip:<address>` pre-auth) instead of a strict FK — fixing this now before it ships broken.
