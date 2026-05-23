# Supabase Setup

One file, one run. The consolidated `supabase-schema.sql` is destructive (drops
the prior Blueberry tables before recreating) and idempotent (safe to re-run).

## Steps

1. Open the Supabase project dashboard.
2. **SQL Editor → New query.**
3. Paste the full contents of `supabase-schema.sql`.
4. **Run.**
5. **Table Editor →** confirm the 8 tables exist, RLS on each:
   - `households`, `users`, `health_logs`, `appointments`, `todos`,
     `journal_entries`, `kick_sessions`, `contraction_sessions`
6. **Database → Replication → supabase_realtime →** confirm Realtime is on for
   exactly these 4 tables (the schema adds them via `alter publication`, but
   the dashboard toggle is what surfaces in the UI):
   - `todos`, `health_logs`, `journal_entries`, `appointments`
7. **Settings → API →** copy the **Project URL** and **publishable key**
   (`sb_publishable_*` — Supabase's new client-safe key, replaces the legacy
   `anon` JWT).

## Environment

Create `.env.local` at repo root from `.env.example`:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

Note: Expo only exposes env vars prefixed `EXPO_PUBLIC_*` to the client.
`NEXT_PUBLIC_*` (Next.js convention) is silently ignored — the values won't
reach `lib/supabase.ts`. The variable is still named `ANON_KEY` for backward
compatibility; `sb_publishable_*` keys go in that slot.

The publishable key is client-safe only because RLS policies enforce
household-scoped access. Never put `sb_secret_*` keys (the new service-role
equivalent) in the mobile app.

## What the schema enforces

- One mother + one partner per household (`unique (household_id, role)`).
- 2-user cap on insert (`household_member_count(...) < 2` RLS check).
- Household-scoped read/write on every data table via `get_my_household_id()`.
- Partner-join flow goes through `join_household_by_code(code)` — a
  `security definer` RPC that bypasses RLS to look up the household by code
  before the joining user has a `users` row.

## Re-running

Re-running drops all Blueberry tables (cascading away policies, FKs, indexes,
and realtime publication membership) and recreates them clean. Any test data
in those tables is lost. `auth.users` is untouched — Supabase Auth identities
survive a schema re-run.
