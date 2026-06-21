# Pause Handoff - 2026-06-20

## Snapshot
- Branch: main
- Workspace: /Users/dbeveridge/Projects/Blueberry
- Status: Google Calendar OAuth + sync implementation is in place and compiles/lints locally.
- Last verified command: npm run typecheck && npm run lint
- Result: pass (with existing non-blocking local cert warning from environment)

## What Was Completed Before Pause

### 1) Google OAuth connect flow
- File: app/(modals)/google-calendar-connect.tsx
- Implemented:
  - PKCE auth flow via expo-auth-session
  - code exchange to token endpoint via lib/googleAuth.ts
  - secure token save/load/clear
  - duplicate auth-code guard
  - connect/disconnect UI + manual Sync now action

### 2) Google token lifecycle
- File: lib/googleAuth.ts
- Implemented:
  - exchangeGoogleAuthCode
  - refreshGoogleTokens
  - getValidAccessToken
  - expiry handling and secure-store persistence per user

### 3) Google Calendar API wrapper
- File: lib/googleCalendarApi.ts
- Implemented:
  - createCalendarEvent
  - updateCalendarEvent
  - deleteCalendarEvent (404-safe)
  - listCalendarEvents
  - typed API errors

### 4) Two-way sync engine
- File: hooks/useGoogleCalendarSync.ts
- Implemented:
  - exported syncGoogleCalendarForUserHousehold for manual + auto sync
  - auto-create links for local appointments missing google_event_id
  - inbound pull on foreground with debounce (5 min)
  - update/delete behavior for linked appointments
  - sync metadata write (lastSyncedAt)

### 5) Conflict policy + last-sync metadata
- File: lib/googleCalendarSyncPrefs.ts
- Implemented:
  - per-user metadata in AsyncStorage:
    - conflictPolicy: google_wins | blueberry_wins
    - lastSyncedAt

- File: app/(modals)/google-calendar-connect.tsx
- Implemented:
  - policy selector (SegmentedControl)
  - policy persistence
  - last sync display

- File: hooks/useGoogleCalendarSync.ts
- Implemented policy behavior:
  - google_wins:
    - inbound Google differences overwrite local linked rows
    - missing/cancelled linked Google events remove local row
  - blueberry_wins:
    - local differences are pushed back to Google
    - missing/cancelled linked Google events are recreated and relinked

### 6) Appointment write path integration
- File: app/(modals)/add-appointment.tsx
  - on save, attempts Google create and writes google_event_id

- File: app/(tabs)/todo.tsx
  - on delete, attempts Google delete for linked events
  - appointment rows open edit modal

- File: app/(modals)/edit-appointment.tsx
  - edits local appointment
  - attempts Google patch for linked event

- File: app/(modals)/_layout.tsx
  - edit-appointment route registered

- File: app/_layout.tsx
  - useGoogleCalendarSync mounted globally (authenticated context)

## Required Local Env For Resume
- .env.local must include:
  - EXPO_PUBLIC_SUPABASE_URL
  - EXPO_PUBLIC_SUPABASE_ANON_KEY
  - EXPO_PUBLIC_GOOGLE_CLIENT_ID

## Resume Checklist (First 30 Minutes)
1. Pull latest local state and run:
   - npm run typecheck
   - npm run lint
2. Start app and verify Google flow on device:
   - More -> Google Calendar
   - Connect
   - Sync now
3. Validate both conflict policies manually:
   - Set Google wins and create conflict
   - Set Blueberry wins and create conflict
4. Confirm last sync timestamp updates after Sync now and foreground resume.

## Manual Test Plan (Targeted)

### Connect + token
1. Open Google Calendar modal while disconnected.
2. Connect account.
3. Verify status switches to Connected.
4. Leave/re-open More tab and verify status remains connected.

### Create propagation
1. Add appointment in app.
2. Verify Google event is created.
3. Verify appointment row has google_event_id in Supabase.

### Delete propagation
1. Delete linked appointment in app.
2. Verify Google event is removed.

### Edit propagation
1. Edit linked appointment title/date/location in app.
2. Verify Google event is patched.

### Inbound sync
1. Modify linked Google event directly (title/date/location).
2. Background/foreground app.
3. Verify local row updates (Google wins policy).

### Conflict policy
1. Set Blueberry wins.
2. Make divergent edits local + Google.
3. Run Sync now.
4. Verify Google gets local values and pushed counter increments.

## Known Gaps / Risks To Address Next
1. Merge strategy is policy-level, not per-field:
   - Current behavior is full-record directional resolution.
2. No dedicated sync audit log:
   - Counts are shown in modal alerts, but not persisted historically.
3. No dedicated tests yet for calendar sync:
   - Verification is manual at this stage.
4. Wide working tree:
   - Many unrelated modified/untracked files exist; avoid broad git operations.

## Safe Next Work Items
1. Add lightweight sync history panel in modal (last 5 runs with counts).
2. Add guardrails for destructive deletes under google_wins (optional soft-delete confirmation mode).
3. Add deterministic integration test harness for syncGoogleCalendarForUserHousehold using mocked fetch + Supabase responses.

## Current Working Tree Note
- The repo is intentionally dirty with many in-progress files beyond calendar sync.
- Do not run destructive reset commands.
- Continue with surgical commits around calendar files only when resuming.
