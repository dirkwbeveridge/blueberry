# Phase Plan: Calendar Sync (7a + 7b)

**Workstream:** calendar-sync  
**Phase:** 01-calendar-sync  
**Sub-phases:** 7a (Google Calendar) + 7b (Apple Calendar / EventKit)  
**Status:** Planned  
**Dependency:** core-app workstream — Phase 6 (appointments CRUD) must be live and verified before sync can be tested end-to-end.

---

## Goal

Enable both partners to sync household appointments bidirectionally with Google Calendar (7a) and with iOS EventKit (7b), so appointments created in Blueberry appear on each user's native calendar and changes in those calendars flow back into Supabase.

---

## Guardrails

- Never add a service-role key to the client-side Supabase client.
- Never hardcode any household ID, due date, or user identifier.
- All Supabase reads and writes must be household-scoped via RLS (`get_my_household_id()`).
- Google OAuth tokens are per-user (`users.id`), not per-household. Store in `expo-secure-store`, never in AsyncStorage.
- Payload privacy boundary: appointment `title`, `appointment_date`, and `location` may be synced. `notes`, `health_logs`, symptom data, and any field from other tables must never leave the device to an external calendar service.
- Do not install NativeWind. Use StyleSheet tokens from `constants/theme.ts`.
- Do not start Phase 7d (AI content) features.
- Apple Calendar sync (7b) is iOS-only. Guard every EventKit call with `Platform.OS === 'ios'`.
- `expo-auth-session` is already present via `expo-web-browser` (transitively); confirm before installing a duplicate.
- `expo-calendar` is not yet installed — add it explicitly.

---

## Schema Changes

### 7a — no schema change needed
`google_event_id text` already exists in `supabase-schema.sql` (line 93) and in `types/index.ts` (`Appointment` interface, line 57).

### 7b — add `apple_event_id` column

Add the following to `supabase-schema.sql` in the `appointments` table block (after `google_event_id`):

```sql
apple_event_id    text,
```

Migration fragment to run against an already-deployed database (add to a new file `supabase-migration-7b.sql`):

```sql
-- Phase 7b: add Apple EventKit identifier column
alter table appointments add column if not exists apple_event_id text;
```

Update `types/index.ts` — add `apple_event_id: string | null` to the `Appointment` interface.

---

## New Packages Required

| Package | Reason | Install command |
|---|---|---|
| `expo-calendar` | EventKit wrapper for iOS (7b) | `npx expo install expo-calendar` |
| `expo-auth-session` | PKCE OAuth flow for Google (7a) | `npx expo install expo-auth-session` |

Note: `expo-web-browser` is already installed and is a peer dep of `expo-auth-session`. Confirm `expo-auth-session` is not already present before installing.

---

## Work Plan

Tasks are sequenced so each can be executed independently in one agent session. Later tasks depend on earlier ones only where noted.

---

### Task 1 — Schema + type update (7b prerequisite)

**Files to create or modify:**
- `supabase-schema.sql` — add `apple_event_id text` column to `appointments` table
- `supabase-migration-7b.sql` (new file) — migration fragment for deployed databases
- `types/index.ts` — add `apple_event_id: string | null` to `Appointment` interface

**What to do:**

In `supabase-schema.sql`, locate the `appointments` table definition. After the line `google_event_id text,`, add `apple_event_id text,`. No other changes to the table.

Create `supabase-migration-7b.sql` at the repo root with the single `alter table` statement above.

In `types/index.ts`, update the `Appointment` interface to add `apple_event_id: string | null` after `google_event_id`.

**Acceptance criteria:**
- `npm run typecheck` passes with no new errors.
- `supabase-schema.sql` contains `apple_event_id text` in the `appointments` block.
- `types/index.ts` `Appointment` interface contains `apple_event_id: string | null`.
- `supabase-migration-7b.sql` exists and contains the `alter table` statement.

---

### Task 2 — Google OAuth token store (7a)

**Files to create or modify:**
- `lib/googleAuth.ts` (new file) — Google OAuth PKCE helpers and secure token storage

**What to do:**

Create `lib/googleAuth.ts`. This module owns all Google OAuth logic. It must not import anything from `store/` (no Zustand coupling) and must not import the Supabase client.

Implement and export:

- `GOOGLE_CALENDAR_SCOPES: string[]` — the minimum required scopes: `https://www.googleapis.com/auth/calendar.events` (read/write individual events, not full calendar access).
- `saveGoogleTokens(userId: string, tokens: { access_token: string; refresh_token?: string; expires_at: number }): Promise<void>` — stores to `expo-secure-store` under the key `google_tokens_${userId}`.
- `loadGoogleTokens(userId: string): Promise<{ access_token: string; refresh_token?: string; expires_at: number } | null>` — reads from `expo-secure-store`, returns null if not found or parse fails.
- `clearGoogleTokens(userId: string): Promise<void>` — deletes the key.
- `isTokenExpired(tokens: { expires_at: number }): boolean` — returns true if `expires_at` (unix seconds) is within 60 seconds of now.

The token shape is a plain serializable object stored as JSON. Use `SecureStore.setItemAsync` / `getItemAsync` / `deleteItemAsync` directly (same pattern as `lib/supabase.ts`).

Do not store tokens in the Zustand store. Do not persist tokens to AsyncStorage.

**Acceptance criteria:**
- `npm run typecheck` passes.
- `npm run lint` passes.
- File exports the five identifiers above with correct TypeScript signatures (no `any`).
- SecureStore key pattern is `google_tokens_${userId}` (verifiable by grep).

---

### Task 3 — Google Calendar connect screen (7a)

**Files to create or modify:**
- `app/(modals)/google-calendar-connect.tsx` (new file) — OAuth PKCE flow modal
- `app/(modals)/_layout.tsx` — register new modal route

**What to do:**

Create `app/(modals)/google-calendar-connect.tsx`. This is a modal screen presented from the More tab's "Connected" section.

Use `expo-auth-session` `useAuthRequest` hook with `ResponseType.Code` and `CodeChallengeMethod.S256` (PKCE). The redirect URI must use `AuthSession.makeRedirectUri({ scheme: 'blueberry' })` — check `app.json` for the scheme value and use whatever is configured there (do not hardcode `blueberry` if it differs).

The modal has three visual states:
1. **Not connected:** Shows a "Connect Google Calendar" button. Tapping it initiates the PKCE flow via `promptAsync()`.
2. **Loading/exchanging:** Shows a loading indicator while the auth code is being exchanged.
3. **Connected:** Shows "Google Calendar connected" with a "Disconnect" button. This state is determined by whether `loadGoogleTokens(currentUser.id)` returns a non-null value on mount.

On successful code exchange:
- Call Google's token endpoint (`https://oauth2.googleapis.com/token`) with the auth code, code verifier, redirect URI, client ID, and client secret.
- The Google client ID and client secret must come from env vars `EXPO_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Note: `GOOGLE_CLIENT_SECRET` is not prefixed `EXPO_PUBLIC_` — it must not be readable in client bundle. For now, the token exchange must happen server-side or be deferred. See Open Questions below.
- Call `saveGoogleTokens(currentUser.id, { access_token, refresh_token, expires_at })`.

On disconnect:
- Call `clearGoogleTokens(currentUser.id)`.
- Show confirmation before clearing.

Wire the route in `app/(modals)/_layout.tsx` following the same `presentation: 'modal'` pattern as the existing modal entries.

Style using `constants/theme.ts` tokens only. Follow the same visual language as other modal screens in `app/(modals)/`.

**Acceptance criteria:**
- `npm run typecheck` passes.
- `npm run lint` passes.
- Route `/google-calendar-connect` is registered and reachable from the More tab.
- Connected/disconnected state reflects SecureStore contents on mount.
- The disconnect flow calls `clearGoogleTokens`.

---

### Task 4 — More tab: wire "Connected" section (7a + 7b entry points)

**Files to create or modify:**
- `app/(tabs)/more.tsx` — replace `comingSoon: true` entries for Google Calendar (and scaffold Apple Calendar entry point for 7b)

**What to do:**

In `app/(tabs)/more.tsx`, update the "Connected" section. The three rows are currently all `comingSoon: true`. Make the following changes:

Google Calendar row: Remove `comingSoon: true`. Add `onPress: () => router.push('/(modals)/google-calendar-connect')`. Update the `sub` text to reflect connected/disconnected state. On mount, call `loadGoogleTokens(currentUser?.id ?? '')` and set local state `googleConnected: boolean`. Show `rightLabel: 'Connected'` when `googleConnected` is true, otherwise show the chevron.

Apple Calendar row (iOS): Remove `comingSoon: true` on iOS. The Apple Calendar connection is permission-based (no OAuth modal needed) — the row should call the permission-request helper from Task 6 (`lib/appleCalendar.ts`) and show the current permission state. Wrap the entire Apple Calendar row in a `Platform.OS === 'ios'` guard — if not iOS, keep `comingSoon: true`.

Notifications row: Leave `comingSoon: true` — this is Phase 7c scope.

Load state in a `useEffect` on mount to determine current Google connection status. Keep the effect lightweight (one SecureStore read).

**Acceptance criteria:**
- `npm run typecheck` passes.
- `npm run lint` passes.
- On iOS, Google Calendar row shows `onPress` behavior and reflects connected state.
- Apple Calendar row is active on iOS, `comingSoon` on other platforms.
- No import of `useEffect` unless it was already imported (check existing imports before adding).

---

### Task 5 — Google Calendar API client (7a)

**Files to create or modify:**
- `lib/googleCalendarApi.ts` (new file) — Google Calendar REST API wrapper

**What to do:**

Create `lib/googleCalendarApi.ts`. This module wraps the Google Calendar v3 REST API. It must not know about Supabase or the household store.

Implement and export:

- `GoogleCalendarEvent` interface with fields: `id?: string`, `summary: string`, `start: { dateTime: string; timeZone: string }`, `end: { dateTime: string; timeZone: string }`, `location?: string`, `description?: string`.
- `createCalendarEvent(accessToken: string, event: Omit<GoogleCalendarEvent, 'id'>): Promise<string>` — POSTs to `https://www.googleapis.com/calendar/v3/calendars/primary/events`, returns the created event `id`.
- `updateCalendarEvent(accessToken: string, eventId: string, event: Partial<Omit<GoogleCalendarEvent, 'id'>>): Promise<void>` — PATCHes to `.../events/{eventId}`.
- `deleteCalendarEvent(accessToken: string, eventId: string): Promise<void>` — DELETEs `.../events/{eventId}`. Does not throw if the event is already gone (handle 404 gracefully).
- `listCalendarEvents(accessToken: string, timeMin: string, timeMax: string): Promise<GoogleCalendarEvent[]>` — GETs `.../events` with `timeMin`, `timeMax`, `singleEvents=true`, `orderBy=startTime`. Returns the `items` array.

All functions must:
- Set `Authorization: Bearer {accessToken}` header.
- Throw a typed error `{ code: 'GOOGLE_API_ERROR'; status: number; message: string }` on non-2xx responses (except the 404-forgiveness in `deleteCalendarEvent`).
- Use `fetch` (available globally in React Native + Expo's Hermes runtime).

Do not use any Google SDK package — raw `fetch` calls only.

**Acceptance criteria:**
- `npm run typecheck` passes.
- `npm run lint` passes.
- All five exports are present with correct signatures.
- 404 in `deleteCalendarEvent` is handled without throwing.

---

### Task 6 — Apple Calendar / EventKit helpers (7b)

**Files to create or modify:**
- `lib/appleCalendar.ts` (new file) — EventKit permission + CRUD helpers

**What to do:**

Create `lib/appleCalendar.ts`. All exports must be no-ops (returning `null` or `false`) when `Platform.OS !== 'ios'`.

Install `expo-calendar` before implementing: `npx expo install expo-calendar`.

Implement and export:

- `requestCalendarPermission(): Promise<boolean>` — calls `Calendar.requestCalendarPermissionsAsync()`, returns `true` if `status === 'granted'`. Returns `false` on non-iOS.
- `getCalendarPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined' | 'unavailable'>` — calls `Calendar.getCalendarPermissionsAsync()`. Returns `'unavailable'` on non-iOS.
- `getDefaultCalendarId(): Promise<string | null>` — finds the first writable calendar from `Calendar.getCalendarsAsync('event')` where `allowsModifications === true` and `type === Calendar.EntityTypes.EVENT`. Returns null if none found or not iOS.
- `createCalendarEvent(params: { title: string; startDate: Date; endDate: Date; location?: string; notes?: string; calendarId: string }): Promise<string | null>` — calls `Calendar.createEventAsync(params.calendarId, { title, startDate, endDate, location, notes })`. Returns the EventKit event ID string, or null on failure or non-iOS.
- `updateCalendarEvent(eventId: string, params: Partial<{ title: string; startDate: Date; endDate: Date; location?: string; notes?: string }>): Promise<void>` — calls `Calendar.updateEventAsync(eventId, params)`. No-op on non-iOS.
- `deleteCalendarEvent(eventId: string): Promise<void>` — calls `Calendar.deleteEventAsync(eventId)`. Does not throw if the event is not found. No-op on non-iOS.

Add `expo-calendar` to `app.json` plugins array under `"plugins"` (create the array if it does not exist): `["expo-calendar", { "calendarPermission": "Allow Blueberry to add appointments to your calendar." }]`. Check `app.json` before editing — do not duplicate existing plugin entries.

**Acceptance criteria:**
- `npm run typecheck` passes (with `expo-calendar` installed).
- `npm run lint` passes.
- All six exports present with correct signatures.
- `app.json` has the `expo-calendar` plugin entry.
- Every function has a non-iOS guard that returns the safe default.

---

### Task 7 — Appointment save with Google Calendar sync (7a)

**Files to create or modify:**
- `app/(modals)/add-appointment.tsx` — call Google Calendar API on save; persist `google_event_id`
- `lib/googleAuth.ts` — add a `getValidAccessToken(userId)` helper (token refresh logic)

**What to do:**

First, add to `lib/googleAuth.ts`:

`getValidAccessToken(userId: string): Promise<string | null>` — loads tokens via `loadGoogleTokens`, returns null if none. If `isTokenExpired(tokens)` is true and a `refresh_token` is present, calls Google's token refresh endpoint (`https://oauth2.googleapis.com/token` with `grant_type=refresh_token`), updates stored tokens via `saveGoogleTokens`, returns the fresh `access_token`. If no refresh token is available and the token is expired, calls `clearGoogleTokens` and returns null (the user will need to reconnect).

In `app/(modals)/add-appointment.tsx`, update `handleSave`:

After the successful Supabase insert, read the new appointment's `id` from the insert response (use `select()` on the insert chain to get the returned row). Then:

1. Call `getValidAccessToken(currentUser.id)`. If null, skip calendar sync silently — do not show an error to the user (calendar sync is additive, not blocking).
2. If a token is available, build a `GoogleCalendarEvent` from the appointment fields. `summary` = appointment title. `start.dateTime` and `end.dateTime` = ISO datetime of `appointment_date` (set `end` to `start + 1 hour` as default duration). `location` = location field if present. Do not put `notes` in the event `description` — notes are private and must not leave the app.
3. Call `createCalendarEvent(accessToken, event)` from `lib/googleCalendarApi.ts`. On success, update the Supabase appointment row with the returned `google_event_id` using a `supabase.from('appointments').update({ google_event_id }).eq('id', appointmentId)` call.
4. If the Google API call throws, log to console and continue — do not surface a sync error to the user for a successful appointment save.

The `household` value from `useHousehold()` is already available. Add `currentUser` destructuring from `useHousehold()` (it is exported from `hooks/useHousehold.ts`).

**Acceptance criteria:**
- `npm run typecheck` passes.
- `npm run lint` passes.
- A saved appointment with no Google token still saves to Supabase and closes the modal.
- A saved appointment with a valid Google token attempts `createCalendarEvent` and updates `google_event_id` in Supabase.
- Notes field is not passed to the Google Calendar event payload.

---

### Task 8 — Appointment save with Apple Calendar sync (7b)

**Files to create or modify:**
- `app/(modals)/add-appointment.tsx` — add EventKit sync after Supabase save; persist `apple_event_id`

**What to do:**

This task extends Task 7's version of `add-appointment.tsx`. Both changes live in the same file; execute Task 7 first.

After the Google sync block, add Apple Calendar sync (guard with `Platform.OS === 'ios'`):

1. Call `getCalendarPermissionStatus()` from `lib/appleCalendar.ts`. If `'undetermined'`, call `requestCalendarPermission()`. If the result is not `'granted'`, skip silently.
2. Call `getDefaultCalendarId()`. If null, skip silently.
3. Call `createCalendarEvent({ title, startDate, endDate, location, calendarId })` from `lib/appleCalendar.ts`. `notes` must not be passed — same payload privacy rule as Google. Set `endDate` to `startDate + 1 hour`.
4. On success, update the Supabase appointment row with `apple_event_id` using `supabase.from('appointments').update({ apple_event_id }).eq('id', appointmentId)`. This can be combined with the `google_event_id` update if both are non-null (one `update()` call with both fields).

The permission request happens at the moment the user saves their first appointment, not at app launch. That satisfies the ROADMAP 7b requirement.

Do not request calendar permission anywhere except inside this save flow (not in `_layout.tsx`, not in `more.tsx`, not on app start).

**Acceptance criteria:**
- `npm run typecheck` passes.
- `npm run lint` passes.
- On iOS with permission granted, the EventKit event is created and `apple_event_id` is written to Supabase.
- Permission request fires only during appointment save, not at app launch.
- Notes are not passed to EventKit.
- On non-iOS, the Apple sync block is skipped entirely.

---

### Task 9 — Appointment update and delete sync (7a + 7b)

**Files to create or modify:**
- `app/(modals)/edit-appointment.tsx` (new file, or existing file if it exists — check before creating) — propagate edits to Google and Apple Calendar
- `hooks/useAppointments.ts` (new file) — shared appointment CRUD with sync side effects

**What to do:**

First check whether `app/(modals)/edit-appointment.tsx` exists. If it does, modify it. If not, create it as a minimal edit form reusing the same field layout as `add-appointment.tsx`.

Create `hooks/useAppointments.ts` to centralize appointment mutation logic (keeping `add-appointment.tsx` from growing further):

Export:
- `useDeleteAppointment(): (appointment: Appointment) => Promise<void>` — deletes from Supabase, then calls `deleteCalendarEvent` for both `google_event_id` (via `lib/googleCalendarApi.ts`) and `apple_event_id` (via `lib/appleCalendar.ts`) if the respective IDs are non-null. Failures in external calendar deletes are caught and logged but do not block the Supabase delete.
- `useUpdateAppointment(): (appointment: Appointment, updates: Partial<Pick<Appointment, 'title' | 'appointment_date' | 'location'>>) => Promise<void>` — updates Supabase, then calls `updateCalendarEvent` for Google (if `google_event_id` non-null) and Apple (if `apple_event_id` non-null). Same failure-isolation pattern.

Both hooks must read `currentUser.id` from `useHousehold()` to obtain the access token for Google.

Wire `useDeleteAppointment` wherever appointment deletion currently lives (check `app/(tabs)/partner.tsx` and `app/(tabs)/plan.tsx` for existing delete calls — read those files before editing).

**Acceptance criteria:**
- `npm run typecheck` passes.
- `npm run lint` passes.
- Deleting an appointment with a `google_event_id` calls `deleteCalendarEvent` on the Google API.
- Deleting an appointment with an `apple_event_id` calls `deleteCalendarEvent` on EventKit (iOS only).
- External calendar failures do not prevent the Supabase delete from completing.

---

### Task 10 — Inbound sync: Google Calendar poll (7a)

**Files to create or modify:**
- `hooks/useGoogleCalendarSync.ts` (new file) — poll-on-resume hook
- `app/_layout.tsx` — mount the sync hook

**What to do:**

Create `hooks/useGoogleCalendarSync.ts`. This hook polls Google Calendar for changes to synced appointments when the app returns to the foreground. It does not use webhooks — Google Calendar push notifications require a server-side receiver which is outside Phase 1 scope.

The hook must:
1. Use `AppState.addEventListener('change', handler)` to detect foreground transitions (`nextAppState === 'active'`).
2. On foreground, call `getValidAccessToken(currentUser?.id ?? '')`. Skip if null.
3. Call `listCalendarEvents(accessToken, timeMin, timeMax)` where `timeMin` = now (ISO) and `timeMax` = now + 90 days. This window covers upcoming appointments.
4. Load all household appointments from Supabase (`supabase.from('appointments').select('*')`), filtered to those with a non-null `google_event_id`.
5. For each synced appointment, find the matching Google event by `google_event_id`. If found and the Google event `summary`, `start.dateTime`, or `location` differ from the Supabase row, update the Supabase row with the Google values. If not found (event deleted in Google), delete the Supabase row.
6. Debounce the sync to at most once per 5 minutes. Store last-sync timestamp in a `useRef`.

Field mapping (Google Calendar event → Supabase appointment):
- `summary` → `title`
- `start.dateTime` → `appointment_date`
- `location` → `location`
- Do not write `notes` or any health data from Google into the app.

Mount the hook in `app/_layout.tsx` inside the authenticated branch (after the household is loaded), alongside the existing `useRealtimeSync` call pattern.

**Acceptance criteria:**
- `npm run typecheck` passes.
- `npm run lint` passes.
- Hook only runs sync when `currentUser` is non-null and a Google token is available.
- Hook does not fire more than once per 5 minutes (debounce ref).
- Supabase updates triggered by Google changes use household-scoped queries.

---

### Task 11 — Inbound sync: Apple Calendar on-resume hook (7b)

**Files to create or modify:**
- `hooks/useAppleCalendarSync.ts` (new file) — EventKit on-resume sync hook
- `app/_layout.tsx` — mount the hook (alongside the Google sync hook from Task 10)

**What to do:**

Create `hooks/useAppleCalendarSync.ts`. iOS only — the hook must return early immediately on non-iOS platforms.

The hook must:
1. Use `AppState.addEventListener('change', handler)` to detect foreground transitions.
2. On foreground, call `getCalendarPermissionStatus()`. Skip if not `'granted'`.
3. Load all household appointments from Supabase with a non-null `apple_event_id`.
4. For each, call `Calendar.getEventByIdAsync(apple_event_id)` from `expo-calendar`. If the event no longer exists (returns null or throws), delete the Supabase appointment row. If the event exists and `title`, `startDate`, or `location` differ, update the Supabase row.
5. Debounce to once per 5 minutes, same pattern as Task 10.

Field mapping (EventKit event → Supabase appointment):
- `title` → `title`
- `startDate` → `appointment_date` (convert Date to ISO string)
- `location` → `location`
- Do not write `notes` from EventKit to Supabase.

**Acceptance criteria:**
- `npm run typecheck` passes.
- `npm run lint` passes.
- Hook returns early and does nothing on non-iOS platforms.
- Sync fires on foreground only, not at app launch or on a timer.
- Debounced to once per 5 minutes.

---

## Completion Criteria

Sub-phase 7a (Google Calendar) is complete when:
- [ ] User can connect Google Calendar from More > Connected > Google Calendar.
- [ ] A new appointment saved in Blueberry appears on Google Calendar within the user's session.
- [ ] Editing or deleting an appointment in Blueberry propagates to Google Calendar.
- [ ] A change made directly in Google Calendar (title, date, or delete) is reflected in Blueberry after the app returns to foreground.
- [ ] `appointments.google_event_id` is populated for all synced appointments.
- [ ] `npm run typecheck` and `npm run lint` pass with no new errors.

Sub-phase 7b (Apple Calendar) is complete when:
- [ ] `apple_event_id text` column exists in `supabase-schema.sql` and the migration fragment exists.
- [ ] `types/index.ts` `Appointment` interface includes `apple_event_id: string | null`.
- [ ] On iOS, saving a new appointment (after granting calendar permission) creates an EventKit event.
- [ ] The permission request fires at appointment save, not at app launch.
- [ ] Editing or deleting an appointment propagates to the iOS calendar.
- [ ] An EventKit change (title, date, or delete) is reflected in Blueberry after foreground resume.
- [ ] `npm run typecheck` and `npm run lint` pass.

---

## Open Questions (Require Human Decision Before Execution)

**OQ-1 — Google OAuth client secret handling (blocking for Task 3)**

The Google OAuth token exchange requires the client secret (`GOOGLE_CLIENT_SECRET`). In a pure client-side React Native app, there is no safe place to store a client secret that cannot be extracted from the bundle. Options:

- **Option A: Use a Supabase Edge Function as a token exchange proxy.** The Edge Function holds the secret server-side. The client sends the auth code + code verifier to the Edge Function; the Edge Function calls Google's token endpoint and returns tokens. This is the correct pattern for production.
- **Option B: Use Google's "installed app" / native app OAuth flow, which does not require a client secret for public clients.** Set the client type to "iOS" in Google Cloud Console — iOS OAuth clients do not require a secret for the native PKCE flow.
- **Option C: Accept the risk and embed the secret in the app bundle behind an `EXPO_PUBLIC_` var.** Not recommended for any production use.

Recommendation: Option B if this app will never distribute publicly (it is a private two-user app). Option A if you want the correct production pattern. Decision needed before Task 3 can be executed.

**OQ-2 — Google Cloud project setup (blocking for Tasks 3, 5, 7, 10)**

Tasks 3 and 5 require:
- A Google Cloud project with the Google Calendar API enabled.
- An OAuth 2.0 client ID configured for iOS (native) with the correct bundle identifier from `app.json`.
- The resulting `client_id` stored in `.env.local` as `EXPO_PUBLIC_GOOGLE_CLIENT_ID`.
- A redirect URI allowlist entry matching `AuthSession.makeRedirectUri({ scheme: '<scheme-from-app-json>' })`.

This is a dashboard task in Google Cloud Console that cannot be automated. It must be completed before any Google auth code can be tested.

**OQ-3 — Conflict resolution rule for two-way sync**

When the same appointment has been modified in both Blueberry and Google Calendar before a sync runs, which wins? The poll-based sync in Task 10 will overwrite the Supabase row with the Google Calendar value. This means Google Calendar wins in a conflict. Confirm this is acceptable, or define an alternative rule (e.g., last-write-wins by timestamp comparison) before Task 10 is executed.

**OQ-4 — Appointment edit screen**

Task 9 references `app/(modals)/edit-appointment.tsx`. This file does not currently exist in the repo. Before executing Task 9, confirm whether to create a new edit modal or to make the existing `add-appointment.tsx` serve both create and edit modes via a route param (`?appointmentId=...`).
