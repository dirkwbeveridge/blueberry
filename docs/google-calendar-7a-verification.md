# Google Calendar 7a Deterministic Verification

This runbook adds repeatable, non-destructive verification for Phase 7a behaviors:

- OAuth connect viability
- Sync now create propagation
- Sync now update propagation
- Sync now delete propagation
- Conflict policy behavior (`google_wins`, `blueberry_wins`)

## What changed

- Added readiness checker: `scripts/google-calendar-7a-readiness.mjs`
- Added deterministic verifier: `scripts/verify-google-calendar-7a.mjs`
- Added npm scripts:
  - `npm run gc:7a:readiness`
  - `npm run gc:7a:verify`

## Safety model

The verifier is intentionally non-destructive toward production data.

- Uses a unique run tag: `[GC7A:<timestamp>]`
- Creates fixture appointments only in a dedicated verifier household
- Touches only fixture rows tagged with this run
- Deletes only fixture Google events created for this run
- Cleans up fixture appointments + verifier household after execution
- Refuses to run if `GC7A_USER_EMAIL` already belongs to an existing household

## Prerequisites

1. `.env.local` contains:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
2. A dedicated verifier auth account exists in Supabase Auth:
   - `GC7A_USER_EMAIL`
   - `GC7A_USER_PASSWORD`
3. A valid Google Calendar access token is exported:
   - `GC7A_GOOGLE_ACCESS_TOKEN`
4. Optional timezone override:
   - `GC7A_TZ` (default `America/Chicago`)

## How to run

Run readiness gate first:

```bash
npm run gc:7a:readiness
```

Run deterministic verification:

```bash
GC7A_USER_EMAIL='verifier@example.com' \
GC7A_USER_PASSWORD='your-password' \
GC7A_GOOGLE_ACCESS_TOKEN='ya29.your-token' \
npm run gc:7a:verify
```

Optional timezone override:

```bash
GC7A_TZ='America/New_York' \
GC7A_USER_EMAIL='verifier@example.com' \
GC7A_USER_PASSWORD='your-password' \
GC7A_GOOGLE_ACCESS_TOKEN='ya29.your-token' \
npm run gc:7a:verify
```

## Expected pass output

Readiness pass should include:

- `PASS  EXPO_PUBLIC_SUPABASE_URL`
- `PASS  EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `PASS  EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- `PASS  EXPO_PUBLIC_GOOGLE_CLIENT_ID format looks valid`
- `PASS` for all required files
- `All readiness checks passed.`

Verifier pass should include these behavior checks:

- `PASS  Google OAuth/connect viability`
- `PASS  Sync now create propagation`
- `PASS  Conflict policy google_wins behavior`
- `PASS  Conflict policy blueberry_wins behavior`
- `PASS  Delete propagation (Google -> Blueberry)`
- `PASS  Update propagation (Blueberry -> Google)`
- `PASS  Cleanup`
- Summary line where `FAIL=0`

## Expected fail output

Readiness fail examples:

- `FAIL  EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- `FAIL  lib/googleAuth.ts`
- `Readiness check failed. Fix FAIL items before running gc:7a:verify.`

Verifier fail examples:

- `FAIL  Supabase auth -> Invalid login credentials`
- `FAIL  Google OAuth/connect viability -> Request had invalid authentication credentials`
- `FAIL  Verification run -> GC7A_USER_EMAIL already belongs to a household...`
- Summary line with `FAIL>0` and populated `Failures` section

## Notes on determinism

The verifier uses deterministic fixture naming and explicit assertions for each behavior boundary. It does not depend on UI interactions, simulator timing, or manual state setup beyond required credentials and token input.
