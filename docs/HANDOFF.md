# Blueberry — Handoff

**Status:** Phase 1 build. Framework + schema below are LOCKED unless this document is amended in PR.

A private, two-user pregnancy companion. Mother + Partner share one household. Mom opens the **Daily Companion**; Partner opens **Couple OS**. When baby arrives, the app transitions into **Family Mode** (Phase 2). The story, schema, and privacy boundary are summarized here for any contributor or stakeholder picking the project up cold.

---

## 1 · Product framework

### One-line positioning
> Most apps watch you. Blueberry sits with you.

### Four belief pillars
1. **Two views, one household.** Same source of truth, two different lenses.
2. **Private by default.** Mom's logs are hers; Partner sees only what she shares.
3. **Quiet, not anxious.** One focal week, one paced focus list, one upcoming appointment.
4. **Grows with the family.** Pregnancy → Family Mode. No data is left behind.

### Differentiation from typical pregnancy apps
| Typical pregnancy app | Blueberry |
| --- | --- |
| Solo-mom view; partner is bolted on | Dual-view from day one — Mom and Partner each have their own surface |
| Engagement loops, streaks, feeds | Calm editorial tone, no streaks, no feed |
| Exhaustive symptom tracking | One-tap log; trends quiet underneath |
| Forums / community | None. Audience is one household |
| Retires at delivery | Transitions into Family Mode; story persists |

### Storyline (per `docs/blueberry-story.html`)
- **Chapter 1 — The same morning, two phones.** Side-by-side Mom Home (Daily Companion) and Partner Home (Couple OS).
- **Chapter 2 — For her.** Health, this-week detail, Memories.
- **Chapter 3 — For him.** Together (her shared signal + AI support + conversation prompt + household handoff), To Do (preparing for the big day), Be Ready (readiness meter, where-to-be plan, "if labor starts tonight" walkthrough).
- **Chapter 4 — Phase 2 · Family Mode.** When `households.baby_dob` is set, the household enters postpartum. Feeds, sleep, diapers; Mom postpartum check-in; honest night-shift swap; same household + memories continue.

---

## 2 · Locked navigation (role-aware tabs)

Bottom tab bar has **5 slots**. Slot 2 is the only role-varying slot.

| Slot | Mom (Daily Companion) | Partner (Couple OS) | Both share data? |
| ---- | --------------------- | ------------------- | ---------------- |
| 1 | Home | Home | Same backing data, different rendering |
| 2 | **Health** | **Together** | NO — Health is Mom-only; Together is Partner-only |
| 3 | To Do | To Do | Yes (household-scoped) |
| 4 | Memories | Memories | Yes (household-scoped) |
| 5 | More | More | Yes, but Partner's More omits Mom-health surfaces |

Color, type, and component system are **identical** between roles. Role differentiation lives in **content and tab placement only**.

### Tab capabilities

| Tab | Mom view | Partner view |
| --- | -------- | ------------ |
| **Home** | Week focal card, today's focus list (her), next appointment, quick actions | Same week framed as support; "How Olivia is feeling" (shared chips + sentence — never raw logs); "How I can help today"; appointment with "I'll be there" |
| **Health** (Mom only) | Mood-first ask; symptom log in one tap; energy/sleep trends; saved questions for provider | Not present |
| **Together** (Partner only) | Not present | "What she needs today" (translated from her share); AI support suggestions (week-aware); tonight's conversation prompt; tonight's household handoff |
| **To Do** | Todos, Appointments, Calendar segmented; owner/must-do/AI filters | Same; partner sees stage-timed prep items (car seat, hospital bag) prominently |
| **Memories** | Mosaic for this week; milestone ladder; quiet feed of each other's notes | Same |
| **More** | Household card; tools (Kick counter, Contraction timer, role-switch); Connected (Apple Health, Google Calendar); Privacy; Notifications | Same household card; **no Mom-health surfaces**; partner-side notifications + privacy |

### Atmospheres per surface
- `.atmos.mom` — lavender + rose, used on Mom Home / Week detail
- `.atmos.partner` — lavender + warm beige, used on Partner Home / Together
- `.atmos.calm` — symmetrical lavender, used on Health and shared To Do
- `.atmos.memo` — peach + lavender, used on Memories
- `.atmos.prep` — lavender + honey, used on Partner Be-Ready
- `.atmos.family` / `.atmos.nursery` — warm honey + sage, used on Family Mode (Phase 2)

---

## 3 · Data schema (locked — `supabase-schema.sql`)

### Tables

| Table | Scope | Purpose | Realtime? |
| ----- | ----- | ------- | --------- |
| `households` | global | One row per household. Stage (`ttc` / `pregnant` / `postpartum`), `due_date`, `baby_name`, `baby_gender`, `baby_dob`, `invite_code` | No |
| `users` | `household_id` | Mirrors `auth.users`. `role IN ('mother','partner')`. Unique `(household_id, role)` — structurally enforces 2-user cap | No |
| `health_logs` | `household_id` | Mom's symptoms, mood, energy (1-5), notes, weight. **Mom-only surface** | **Yes** |
| `appointments` | `household_id` | Title, datetime, location, notes, `google_event_id` placeholder | **Yes** |
| `todos` | `household_id` | Title, `is_done`, `due_date`, `priority` (low/med/high), `source` (manual/ai), `created_by` | **Yes** |
| `journal_entries` | `household_id` | `author_id`, `week_number`, content, `milestone_tag`, `media_urls[]` | **Yes** |
| `kick_sessions` | `household_id` | Start/end, kick count, duration. Single-user logging tool | No |
| `contraction_sessions` | `household_id` | Start/end, `contractions JSONB[]`. Offline-first | No |

### Stage transitions
```
ttc → pregnant → postpartum
```
- `pregnant` is the Phase 1 focus.
- Setting `households.baby_dob` flips `stage` to `postpartum` and unlocks Family Mode in the client (Phase 2).
- The schema reserves space for Family Mode (`baby_milestones`, `pediatrician_visits`, `diaper_logs`, `sleep_logs`, `feeding_logs`) — currently dropped; will return in a `02-postpartum.sql` migration when Phase 2 ships. **Do not pre-seed these tables.**

### Helper functions (`security definer`, `search_path = public`)
- `get_my_household_id()` — returns the calling user's `household_id`. Underpins every RLS policy.
- `household_member_count(household_id)` — used by the user-insert policy to enforce the 2-member cap.
- `join_household_by_code(code)` — bypasses RLS for partner signup: validates `invite_code`, enforces cap, returns the `household_id`. The client then inserts its own `users` row.

### Indexes
`household_id` is the hot path on every query. Indexes exist on:
`users(household_id)`, `health_logs(household_id, logged_at desc)`, `appointments(household_id, appointment_date)`, `todos(household_id, due_date)`, `journal_entries(household_id)`, `kick_sessions(household_id)`, `contraction_sessions(household_id)`.

---

## 4 · Privacy contract (RLS-enforced)

The anon key is client-safe **only because RLS is correctly configured**. The boundary is structural, not policy-by-convention.

### Tenant isolation
Every data table has policies of the form:
```sql
USING  (household_id = public.get_my_household_id())
WITH CHECK (household_id = public.get_my_household_id())
```
No row crosses households. Period.

### Two-user cap
- `users(household_id, role)` is unique → at most one `mother` and one `partner` per household (schema-level).
- The `users` insert policy double-enforces via `household_member_count(household_id) < 2` (policy-level).

### Mom-only surfaces (UI contract, not schema)
- `health_logs` is technically readable by both users in the household via RLS (they share `household_id`).
- **The client MUST NOT render Mom's `health_logs` rows on Partner surfaces.** This is a UI-layer privacy boundary, locked by:
  - Partner Home shows only shared chips + a sentence Mom explicitly shared — never the raw `health_logs` row.
  - Partner's Together tab consumes a derived/shared signal, not the underlying log.
  - Partner's More tab omits Mom-health surfaces entirely.
- If/when shared-vs-private distinction needs to be enforced at the data layer, add a `health_logs.shared_with_partner boolean default false` column and tighten the partner-side select policy. **Not done in Phase 1.**

### Realtime subscriptions
`todos`, `health_logs`, `journal_entries`, `appointments` are added to `supabase_realtime`. These four tables must have Realtime enabled in the Supabase dashboard or `useRealtimeSync` goes stale silently. Kick / contraction sessions are deliberately excluded — they're single-user.

---

## 5 · Phase boundary

### Phase 1 (current, pregnant stage + integrations)
- Auth + invite-code household join
- Five tabs role-aware (Health vs Together in slot 2)
- Health logging (Mom), shared To Do + Appointments, Memories, Kick/Contraction tools
- Realtime sync on the four collaborative tables
- **Google Calendar two-way sync** for appointments (promoted from Phase 7, 2026-05-23)
- **Apple Calendar (EventKit) two-way sync** for appointments (promoted from Phase 7, 2026-05-23)
- **Push notifications** for shared household events (promoted from Phase 7, 2026-05-23)
- Static mockups: `docs/mockups.html`, `docs/blueberry-story.html`

### Phase 2 (Family Mode, triggered when `baby_dob` is set)
- `02-postpartum.sql` migration restores `feeding_logs`, `sleep_logs`, `diaper_logs`, `pediatrician_visits`, `baby_milestones`
- Tab slot 2 evolves: Mom's Health becomes an optional Postpartum surface; Partner's Together carries forward
- Mom Home becomes baby-rhythm centric; partner Home carries Couple-OS pattern into night-shift swap + postpartum check-ins
- `journal_entries`, `appointments`, `memories` continue forward. The book gets longer; nothing is deleted.
- Color shifts atmosphere only (honey + sage); tokens and components unchanged

### Setup-flow rule (locked)
- Due date and `baby_dob` are entered by the user during initial household setup or postpartum transition.
- App derives `stage` from these values. Never seed either in code, fixtures, or migrations.
- The test household's real due date is 2025-10-11 (already postpartum). For Phase 1 golden-path testing while Family Mode is unbuilt, use a future placeholder.

### Not in Phase 1 (deferred)
- Firebase, NativeWind, service-role keys on the client
- Apple Health pull (UI placeholder only; not on the calendar/push priority)
- AI content generation pipelines (the `todos.source = 'ai'` enum and Partner-side suggestion UI exist; the producer is Phase 7d)

---

## 6 · Hard guardrails

- **No Firebase.** Supabase is the backend.
- **No NativeWind.** StyleSheet + `constants/theme.ts` tokens.
- **No service-role key in the mobile client.** Ever.
- **Max 2 users per household.** Enforced in the schema (unique role) and RLS (member count) and `join_household_by_code` RPC.
- **Mom's `health_logs` never render on Partner surfaces.** UI contract — see §4.
- **Stale "October 5, 2025" due date is forbidden.** Don't seed it anywhere.
- **No files copied from the prior `Blueberry App/blueberry` or `z-Archive-Blueberry` prototypes.** Both were intentionally dropped.
- **`web` is not a Phase 1 target.** `import.meta` breaks the web bundle; ignore that warning.

---

## 7 · Canonical artifacts

| Purpose | File |
| ------- | ---- |
| Tab gallery (7 screens, Mom + Partner) | `Design Samples/blueberry-app-tab-mockups.html` |
| Story narrative (four chapters, includes Phase 2) | `docs/blueberry-story.html` |
| Legacy deck handoff (HTML) | `docs/HANDOFF.html` |
| Schema | `supabase-schema.sql` |
| Supabase setup runbook | `SUPABASE-SETUP.md` |
| Project architecture for new contributors | `CLAUDE.md` |
| Engineering planning state | `.planning/STATE.md` |
