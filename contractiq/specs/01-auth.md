# Spec 01 — Auth & Session Management

Source: `docs/engineering/engineering-doc.md` §4.1, §6; PRD US-001, FR-01, FR-13.

## Overview

Email/password signup, login, logout via Supabase Auth. Session is cookie-based
(`@supabase/ssr`) and checked on every request to a protected route by
`middleware.ts`. There is a single user role at MVP (no admin/team roles).

## Files to create/modify

- `app/(auth)/login/page.tsx` — replace placeholder with real form (Client Component)
- `app/(auth)/signup/page.tsx` — replace placeholder with real form (Client Component)
- `app/(auth)/reset-password/page.tsx` — replace placeholder; calls `supabase-js` client directly
- `app/api/auth/signup/route.ts` — new
- `app/api/auth/login/route.ts` — new
- `app/api/auth/logout/route.ts` — new
- `components/ui/Input.tsx` — new, design-system input primitive
- `lib/supabase/client.ts`, `lib/supabase/server.ts` — already exist, reuse as-is

## User Flow

```
Signup:  Landing "Sign Up" -> signup form -> POST /api/auth/signup
         -> supabase.auth.signUp() server-side (@supabase/ssr sets cookies)
         -> verification email sent -> user clicks link -> session active
         -> redirect to /dashboard (empty state)
Login:   "Log In" -> POST /api/auth/login -> signInWithPassword() server-side
         -> session cookie set -> redirect to /dashboard
Logout:  POST /api/auth/logout -> supabase.auth.signOut() server-side -> redirect to /login
```

## Data Model

Table `profiles` (already created by `supabase-schema.sql` in this folder):

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| display_name | text | nullable |
| onboarding_completed_at | timestamptz | nullable, drives v1.0 onboarding tooltips |
| created_at, updated_at | timestamptz | standard |

Populated automatically by the `handle_new_user()` trigger on `auth.users`
INSERT — no app code needs to insert into `profiles` directly.

## API Contract

| Method & Path | Request | Response | Validation |
|---|---|---|---|
| `POST /api/auth/signup` | `{ email: string, password: string }` | `201 {}`, session cookie set | Zod: valid email; password ≥8 chars |
| `POST /api/auth/login` | `{ email, password }` | `200 {}`, session cookie set | `401` generic "Invalid email or password" on failure (no leakage of which field was wrong) |
| `POST /api/auth/logout` | — | `204` | requires valid session |

Route Handler pattern for all three (using `lib/supabase/server.ts`):
```ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 422 });
  }
  const supabase = createClient();
  const { error } = await supabase.auth.signUp(body.data); // or signInWithPassword for login
  if (error) {
    return NextResponse.json({ error: "AUTH_ERROR" }, { status: 401 });
  }
  return NextResponse.json({}, { status: 201 });
}
```

## State Management

No TanStack Query needed here — session presence is read server-side by
`middleware.ts` on every request to `(app)/**`. Client forms use local
`useState` for field values + a simple `isSubmitting` flag; no caching needed
for a one-shot form submit.

## Component Spec

`components/ui/Input.tsx` (new primitive, needed by login/signup forms):
```tsx
import { cn } from "@/lib/utils/cn";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-grey-200 px-4 py-2.5 text-body-lg text-grey-900",
        "focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
        className
      )}
      {...props}
    />
  );
}
```

Login/signup pages: `'use client'`, a `<form>` with `Input` for email/password,
`Button` (existing primitive) for submit, inline error text below the field on
failure.

## Design

Per `docs/design.md`: form card = White surface, radius-lg (8px); inputs
radius-md (6px), focus ring = Blue 500 (brand); error text = Red 700 on
Paragraph Small Regular, below the field, using the Error state block
(`bg-red-50 border-red-500 text-red-700` per the State Colors table).

## Edge Cases

- Duplicate email on signup → Supabase returns a conflict → "An account with
  this email already exists."
- Login before email verification → block with "Please verify your email
  first, check your inbox."
- Password reset on a non-existent email → always show a generic success
  message (never leak whether the account exists).
- Empty/invalid fields → client-side validation blocks submit before any
  network call.

## Acceptance Criteria (from PRD US-001)

- Auth flow completes within 10 seconds.
- Successful signup/login redirects to `/dashboard`.
- Invalid credentials return a clear, generic error message.
