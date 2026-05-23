# Supabase Setup

Phase 1 only prepares the database. Phase 2 should not start until this checklist is complete.

## Steps

1. Open the Supabase project dashboard.
2. Go to SQL Editor.
3. Paste the full contents of `supabase-schema.sql`.
4. Run the SQL.
5. Confirm these tables exist:
   - `households`
   - `users`
   - `health_logs`
   - `appointments`
   - `todos`
   - `journal_entries`
   - `milestones`
   - `kick_sessions`
   - `contraction_sessions`
6. Confirm row level security is enabled on each table.
7. Confirm Realtime is enabled for:
   - `todos`
   - `health_logs`
   - `journal_entries`
   - `appointments`
8. Copy the project URL and anon key into `.env.local`.

## Environment

Create `.env.local` from `.env.example`:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

The anon key is client-safe only when RLS policies are correct. Do not add service-role keys to the mobile app.
