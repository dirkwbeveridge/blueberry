---
phase: 01-family-mode
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/02-postpartum.sql
  - types/index.ts
  - store/household.ts
  - lib/postpartumWeeks.ts
  - constants/postpartumContent.ts
  - app/(tabs)/_layout.tsx
  - app/(tabs)/home.tsx
  - app/(tabs)/health.tsx
  - app/(tabs)/together.tsx
  - app/(tabs)/baby.tsx
  - app/(modals)/baby-arrived.tsx
  - app/(modals)/log-feeding.tsx
  - app/(modals)/log-diaper.tsx
  - app/(modals)/log-sleep.tsx
  - app/(modals)/add-milestone.tsx
  - components/postpartum/NightShiftCard.tsx
  - components/postpartum/BabyStatsBar.tsx
  - components/postpartum/FeedingTimer.tsx
  - hooks/usePostpartumSync.ts
autonomous: true
requirements:
  - POST-01
must_haves:
  truths:
    - "When baby_dob is set, the tab bar changes to postpartum layout without an app restart"
    - "Mom sees a postpartum check-in form and recovery timeline on the Health tab"
    - "Partner sees night-shift swap tracker and baby stats at a glance on the Together tab"
    - "Either user can log a feeding, diaper change, or sleep session in under 3 taps"
    - "Baby milestones can be created with text and an optional image URL"
    - "Postpartum data is scoped to the household and never visible to another household"
    - "Pregnancy features remain intact when stage is pregnant or ttc"
  artifacts:
    - path: "supabase/02-postpartum.sql"
      provides: "Additive migration for 5 postpartum tables + household_events + RLS + indexes"
    - path: "types/index.ts"
      provides: "Postpartum domain types: FeedingLog, DiaperLog, SleepLog, BabyMilestone, PediatricianVisit, HouseholdEvent"
    - path: "lib/postpartumWeeks.ts"
      provides: "getPostpartumWeek(baby_dob) → clamped 1–52"
    - path: "constants/postpartumContent.ts"
      provides: "PostpartumWeekContent array, weeks 1–12 with mom recovery + partner focus"
    - path: "app/(tabs)/baby.tsx"
      provides: "Baby tracking hub: feeding, diaper, sleep logs + milestones"
    - path: "app/(modals)/baby-arrived.tsx"
      provides: "Baby has arrived flow: set baby_dob, confirm name, confirm gender"
  key_links:
    - from: "store/household.ts setBabyDob()"
      to: "households.stage = postpartum"
      via: "optimistic local update; Supabase UPDATE confirms"
      pattern: "setBabyDob.*postpartum"
    - from: "app/(tabs)/_layout.tsx"
      to: "isPostpartum selector"
      via: "useHousehold().isPostpartum conditional href"
      pattern: "isPostpartum.*href"
    - from: "app/(tabs)/baby.tsx"
      to: "feeding_logs / diaper_logs / sleep_logs"
      via: "supabase.from insert + usePostpartumSync realtime"
      pattern: "supabase.from.(feeding|diaper|sleep)"
---

<objective>
Deliver Family Mode: the postpartum stage of the app that activates when baby_dob is set.

Purpose: The test household's due date was 2025-10-11; they are already postpartum as of 2026-06-09. This phase makes the app useful for the stage they are actually in, not the stage they were in when the project started.

Output:
- Supabase migration restoring 5 postpartum tables plus a new household_events table for night-shift swaps
- Six new TypeScript domain types
- A postpartum week-content system (weeks 1-12, mirroring the pregnancy weekContent.ts pattern)
- Stage-aware tab layout: postpartum adds a Baby tab, hides kick/contraction tools
- Baby tab: feeding, diaper, sleep logging + milestone creation
- Health tab postpartum variant: recovery check-in replaces symptom logging
- Together tab postpartum variant: night-shift swap tracker + baby stats bar
- Baby Arrived modal flow to trigger the stage transition
</objective>

<execution_context>
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/CLAUDE.md
</execution_context>

<context>
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/.planning/ROADMAP.md
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/types/index.ts
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/supabase-schema.sql
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/store/household.ts
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/hooks/useRealtimeSync.ts
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/lib/pregnancy.ts
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/constants/weekContent.ts
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/app/(tabs)/_layout.tsx
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/app/(tabs)/home.tsx
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/app/(tabs)/health.tsx
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/app/(tabs)/together.tsx
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/constants/theme.ts
@/Users/dbeveridge/Library/CloudStorage/OneDrive-Deloitte(O365D)/_claude-codex/Personal Projects/Blueberry/hooks/useHousehold.ts

<interfaces>
<!-- Existing types executor will import against. From types/index.ts. -->

type Stage = 'ttc' | 'pregnant' | 'postpartum'
type UserRole = 'mother' | 'partner'
type BabyGender = 'male' | 'female' | 'unknown'

interface Household {
  id: string; invite_code: string; due_date: string | null;
  stage: Stage; baby_name: string | null; baby_gender: BabyGender | null;
  baby_dob: string | null; created_at: string;
}

interface AppUser { id: string; household_id: string; role: UserRole;
  display_name: string | null; avatar_url: string | null; created_at: string; }

<!-- Store actions available on useHouseholdStore -->
setBabyDob(dob: string): void   // already sets stage: 'postpartum' optimistically
setBabyName(name: string): void
setBabyGender(gender: BabyGender): void

<!-- useHousehold() selector already exposes -->
isPostpartum: boolean   // household?.stage === 'postpartum'
isPregnant:   boolean
isPartnerRole: boolean
isMotherRole:  boolean

<!-- useRealtimeSync signature (hooks/useRealtimeSync.ts) -->
useRealtimeSync<T>({ table, householdId, onInsert?, onUpdate?, onDelete? })
// table filter is household_id=eq.{householdId}

<!-- Tab routing pattern from app/(tabs)/_layout.tsx -->
href: isPartnerRole ? null : undefined   // show/hide per role
// Extend this pattern with isPostpartum to show/hide per stage
</interfaces>
</context>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- GUARDRAILS (read before writing any code)                              -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<guardrails>
1. Stage is ALWAYS derived from baby_dob / due_date — never hardcoded. Do not
   seed any specific date in code, fixtures, or migrations.

2. 02-postpartum.sql is ADDITIVE ONLY. It must not drop or alter any table
   that exists in supabase-schema.sql. Open with a comment block stating this.

3. Pregnancy features must continue to work when stage is 'pregnant'. The tab
   layout change is additive — hide Baby tab via href:null when !isPostpartum,
   not via route removal.

4. RLS on all new tables must use the same pattern as existing tables:
   household_id = public.get_my_household_id()

5. night-shift swap data lives in household_events (see Task 1). Do NOT create
   a separate night_shift_swaps table. Rationale: swap state is ephemeral and
   event-sourced (last event wins); a generic events table avoids schema churn
   as new ephemeral signals are added in later phases.

6. No TypeScript `any` outside the Supabase client cast site. New types go in
   types/index.ts with `as unknown as MyType` casts at call sites.

7. Use StyleSheet tokens from constants/theme.ts only. No inline hex values,
   no NativeWind.
</guardrails>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- STAGE TRANSITION DESIGN                                               -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<stage_transition_design>
## How baby_dob triggers the UI shift

### Entry points (two paths to the same outcome)

Path A — "Baby has arrived" modal:
  User navigates to More → Baby has arrived.
  app/(modals)/baby-arrived.tsx collects baby_dob (DateTimePicker or manual
  text entry), optionally updates baby_name, confirms baby_gender.
  On confirm: calls setBabyDob(dob) on the store (optimistic) then
  supabase.from('households').update({ baby_dob, stage: 'postpartum' }).
  No app restart needed because the store mutation triggers a re-render of
  _layout.tsx which reads isPostpartum from useHousehold().

Path B — Setup flow (future):
  If the partner or mother enters baby_dob during household setup at a later
  date, the same setBabyDob() action produces the same result. This plan does
  not build the setup integration — that is wired when auth/household setup is
  built in Phases 2–3. The modal covers the test household's immediate need.

### Store reactivity chain

  setBabyDob(dob) in store/household.ts already sets stage: 'postpartum'
  synchronously on the Zustand slice. No additional store action needed.

  app/(tabs)/_layout.tsx reads isPostpartum = household?.stage === 'postpartum'
  via useHousehold(). When this value becomes true, the Tabs re-render:
  - Baby tab: href changes from null → undefined (becomes visible)
  - Health tab: same route, content branch changes inside health.tsx
  - Together tab: same route, content branch changes inside together.tsx
  - kick-counter and contraction-timer entries: hidden inside health.tsx
    when isPostpartum is true

  No conditional route imports, no navigator resets, no app restart.

### Supabase confirmation

  After the optimistic local update, the modal issues:
    supabase.from('households').update({ baby_dob, baby_name, baby_gender, stage: 'postpartum' })
      .eq('id', household.id)
  If it fails, show an error and call setStage back to the prior stage.
  The store does not revert baby_dob automatically on failure — the modal
  handles the rollback explicitly.
</stage_transition_design>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- NIGHT-SHIFT SWAP RECOMMENDATION                                        -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<night_shift_recommendation>
## Decision: household_events table (not Zustand-only)

Rationale:
  Night-shift swaps must be visible to BOTH users. A Zustand-only approach
  would mean the Partner's "I've got this" tap is invisible to Mom unless both
  devices are on realtime simultaneously. Supabase realtime + a persistent row
  solves this without polling.

  A dedicated night_shift_swaps table would be single-purpose and create
  schema churn as new ephemeral household signals emerge. household_events is
  a lightweight event-source table covering any household-level event by type.

Schema (included in 02-postpartum.sql):
  household_events (
    id           uuid pk default gen_random_uuid(),
    household_id uuid not null references households(id) on delete cascade,
    actor_id     uuid not null references users(id) on delete cascade,
    event_type   text not null,   -- 'night_shift_swap' | future types
    payload      jsonb not null default '{}',
    created_at   timestamptz not null default now()
  )

  event_type = 'night_shift_swap'
  payload = { "handler": "partner" | "mother", "note": "optional" }

  RLS: household_id = get_my_household_id() (select/insert/delete)
  Realtime: enabled (both users need live updates)

UI reads the most recent event of type 'night_shift_swap' to show:
  - Who is "on" right now
  - When the last swap happened
  - Running tally for the night (count events since 8pm local)

Ephemeral enough that rows older than 7 days can be pruned — add a comment
in the migration noting a future pg_cron job. Do not implement pruning now.
</night_shift_recommendation>

<tasks>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- TASK 1: Schema + Types Foundation                                      -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 1: Postpartum schema migration and TypeScript types</name>
  <files>
    supabase/02-postpartum.sql
    types/index.ts
    lib/postpartumWeeks.ts
    constants/postpartumContent.ts
  </files>
  <action>
    Create supabase/02-postpartum.sql. Open with a comment block stating it is
    additive-only and must not be run before supabase-schema.sql. Do not drop
    any existing table. Create the following tables:

    baby_milestones (
      id           uuid primary key default gen_random_uuid(),
      household_id uuid not null references households(id) on delete cascade,
      logged_by    uuid references users(id) on delete set null,
      title        text not null,
      occurred_on  date not null,
      notes        text,
      media_url    text,
      created_at   timestamptz not null default now()
    )

    pediatrician_visits (
      id              uuid primary key default gen_random_uuid(),
      household_id    uuid not null references households(id) on delete cascade,
      visit_date      timestamptz not null,
      provider        text,
      reason          text,
      notes           text,
      weight_kg       numeric(4,3),
      height_cm       numeric(5,2),
      completed       boolean not null default false,
      created_at      timestamptz not null default now()
    )

    diaper_logs (
      id           uuid primary key default gen_random_uuid(),
      household_id uuid not null references households(id) on delete cascade,
      logged_by    uuid references users(id) on delete set null,
      logged_at    timestamptz not null default now(),
      diaper_type  text not null check (diaper_type in ('wet','dirty','both'))
    )

    sleep_logs (
      id           uuid primary key default gen_random_uuid(),
      household_id uuid not null references households(id) on delete cascade,
      started_at   timestamptz not null,
      ended_at     timestamptz,
      quality      int check (quality between 1 and 3),
      notes        text
    )

    feeding_logs (
      id              uuid primary key default gen_random_uuid(),
      household_id    uuid not null references households(id) on delete cascade,
      logged_by       uuid references users(id) on delete set null,
      started_at      timestamptz not null,
      ended_at        timestamptz,
      feed_type       text not null check (feed_type in ('breast_left','breast_right','bottle','formula')),
      duration_secs   int,
      amount_ml       numeric(6,2),
      notes           text
    )

    household_events (
      id           uuid primary key default gen_random_uuid(),
      household_id uuid not null references households(id) on delete cascade,
      actor_id     uuid not null references users(id) on delete cascade,
      event_type   text not null,
      payload      jsonb not null default '{}',
      created_at   timestamptz not null default now()
    )

    For each of the six new tables, apply RLS with the same four-policy pattern
    as existing data tables in supabase-schema.sql (household select/insert/
    update/delete using household_id = public.get_my_household_id()).

    Enable Realtime for: feeding_logs, diaper_logs, sleep_logs, household_events.
    Do NOT enable Realtime for baby_milestones or pediatrician_visits (low-churn
    content; pull-on-load is sufficient).

    Add indexes:
      idx_baby_milestones_household  on baby_milestones(household_id)
      idx_ped_visits_household       on pediatrician_visits(household_id)
      idx_diaper_logs_household      on diaper_logs(household_id, logged_at desc)
      idx_sleep_logs_household       on sleep_logs(household_id, started_at desc)
      idx_feeding_logs_household     on feeding_logs(household_id, started_at desc)
      idx_household_events_type      on household_events(household_id, event_type, created_at desc)

    Add a comment near household_events: "Rows older than 7 days may be pruned
    via pg_cron in a future migration. No pruning implemented here."

    ---

    Append to types/index.ts (do not remove existing types):

    FeedType: 'breast_left' | 'breast_right' | 'bottle' | 'formula'
    DiaperType: 'wet' | 'dirty' | 'both'

    FeedingLog: id, household_id, logged_by (string|null), started_at,
      ended_at (string|null), feed_type (FeedType), duration_secs (number|null),
      amount_ml (number|null), notes (string|null)

    DiaperLog: id, household_id, logged_by (string|null), logged_at,
      diaper_type (DiaperType)

    SleepLog: id, household_id, started_at, ended_at (string|null),
      quality (1|2|3|null), notes (string|null)

    BabyMilestone: id, household_id, logged_by (string|null), title, occurred_on,
      notes (string|null), media_url (string|null), created_at

    PediatricianVisit: id, household_id, visit_date, provider (string|null),
      reason (string|null), notes (string|null), weight_kg (number|null),
      height_cm (number|null), completed, created_at

    HouseholdEvent: id, household_id, actor_id, event_type, payload (Record<string,unknown>),
      created_at

    NightShiftPayload: { handler: 'partner' | 'mother'; note?: string }
    (This is the payload shape for event_type === 'night_shift_swap')

    ---

    Create lib/postpartumWeeks.ts:

    Export getPostpartumWeek(babyDobIso: string): number
      Computes weeks since baby_dob using the same ms-per-week math as
      getCurrentWeek() in lib/pregnancy.ts. Clamps to 1–52.
      Returns 0 if babyDobIso is null/empty.

    Export getPostpartumAge(babyDobIso: string): { weeks: number; days: number }
      Returns the total age broken into weeks and remainder days.
      Used in UI display ("8 weeks 3 days").

    ---

    Create constants/postpartumContent.ts:

    Export interface PostpartumWeekContent:
      week: number         // 1–12
      momRecovery: string  // Physical/emotional recovery reality for this week
      partnerFocus: string // One concrete thing for partner this week

    Export postpartumContent: PostpartumWeekContent[] with entries for weeks 1–12.

    Write the content in the voice established in constants/weekContent.ts:
    honest, specific, neither alarming nor dismissive. No exclamation points.
    No "Hey Mama!" energy. Examples:

    Week 1: momRecovery about the physical reality of day 1–7 (perineal healing
    or C-section wound, lochia, milk coming in, sleep deprivation hitting hard
    before adrenaline fades); partnerFocus: shield her from every non-essential
    decision this week.

    Week 2: momRecovery about the emotional crash many mothers experience as
    adrenaline fades and sleep debt accumulates; baby blues vs PPD distinction,
    what to watch for; partnerFocus: ask specifically how she is feeling once
    per day, not in passing.

    Continue through week 12 with recovery-arc awareness (week 6 check, return
    to activity, hormonal shifts, breastfeeding normalization, partner intimacy
    reintegration handled honestly around weeks 8–10).

    Weeks 13–52 are not written in this phase. The UI will clamp to week 12
    content for weeks > 12 and display "Week {n}" in the header regardless.
  </action>
  <verify>
    npm run typecheck passes with no new errors introduced.
    supabase/02-postpartum.sql contains CREATE TABLE for all six tables.
    types/index.ts exports FeedingLog, DiaperLog, SleepLog, BabyMilestone,
    PediatricianVisit, HouseholdEvent, NightShiftPayload.
    lib/postpartumWeeks.ts exports getPostpartumWeek and getPostpartumAge.
    constants/postpartumContent.ts exports postpartumContent with length 12.
  </verify>
  <done>
    Migration file is additive, covers all 6 tables, RLS matches existing pattern.
    TypeScript types are exported and strictly typed (no any).
    Postpartum week math functions exist and accept an ISO date string.
    12 weeks of postpartum content exist in the established voice.
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- TASK 2: Stage-aware tab shell + Baby Arrived modal                    -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 2: Stage-aware tab layout, Baby tab scaffold, and Baby Arrived modal</name>
  <files>
    app/(tabs)/_layout.tsx
    app/(tabs)/baby.tsx
    app/(modals)/baby-arrived.tsx
    store/household.ts
  </files>
  <action>
    Update app/(tabs)/_layout.tsx:

    Pull isPostpartum from useHousehold() alongside isPartnerRole (it is already
    returned by the hook). Add two new conditional tab entries:

    Baby tab (name="baby"):
      href: isPostpartum ? undefined : null
      title: 'Baby'
      tabBarIcon: emoji 🍼
      This tab is hidden when stage is not postpartum. No route is removed.

    The Health tab, Together tab, and existing tabs are unchanged in name/route.
    The stage-specific content branching is handled inside the screen files
    (Tasks 3 and 4), not by swapping routes. This keeps the tab count at 6 for
    both stages (Baby replaces nothing; the five existing tabs remain).

    ---

    Create app/(tabs)/baby.tsx — the postpartum Baby tracking hub:

    This screen is only reachable when isPostpartum is true (href gate above
    plus a defensive guard at top: if !isPostpartum return null or redirect to
    home). It does NOT show kick/contraction tools.

    Layout (ScrollView, same structural pattern as health.tsx):

    Header: "Baby" title, sub-text showing age via getPostpartumAge(baby_dob)
    formatted as "8 weeks 3 days" or "2 days old" for week 0.

    Section 1 — Today at a glance (BabyStatsBar component, see Task 4):
    Last feed time + type, last diaper time + type, last sleep start.
    Data fetched on mount from feeding_logs, diaper_logs, sleep_logs
    (limit 1 each, order by started_at/logged_at desc).

    Section 2 — Quick log row (three tappable cards in a row):
      Feed → router.push('/(modals)/log-feeding')
      Diaper → router.push('/(modals)/log-diaper')
      Sleep → router.push('/(modals)/log-sleep')
    Each card: emoji + label + "Log" CTA text.

    Section 3 — Recent feeds (last 5 from feeding_logs, ordered by started_at desc).
    Each row: feed_type label (map 'breast_left' → 'Left breast', etc.),
    duration_secs formatted as "mm:ss" if set, started_at formatted as
    relative time ("2h ago") or clock time if today.

    Section 4 — Milestones (last 3 from baby_milestones, ordered by occurred_on desc).
    Each row: title, occurred_on formatted as locale date.
    "Add milestone" link → router.push('/(modals)/add-milestone').

    Realtime: use useRealtimeSync for feeding_logs, diaper_logs, sleep_logs
    (same pattern as home.tsx / health.tsx). Invalidate and re-fetch the
    last-record queries on any insert or update.

    ---

    Create app/(modals)/baby-arrived.tsx — the stage transition flow:

    This modal is reached from More → "Baby has arrived" (the More tab wiring
    is NOT part of this task — add a comment "// Wire from More tab in Phase 2
    household setup integration"). The modal can also be deep-linked directly
    for testing.

    Three-step form (single scroll, no multi-page wizard — keep it simple):

    Step 1 — Date of birth:
      Label: "When did your baby arrive?"
      TextInput with placeholder "YYYY-MM-DD" and keyboard type "numeric".
      Validate on submit: must be a valid past date (not future, not more than
      365 days ago). Error message inline below the input on failure.

    Step 2 — Baby name (pre-filled from household.baby_name if set):
      Label: "Baby's name" — optional, user can leave it as-is.

    Step 3 — Gender confirmation (pre-filled from household.baby_gender):
      Three pills: Boy / Girl / Prefer not to say (maps to 'male'/'female'/'unknown').

    Confirm button: "Welcome, {baby_name || 'little one'}."
    On press:
      1. Call setBabyDob(dob) on the store (optimistic — stage flips immediately).
      2. Call setBabyName(name) if name changed.
      3. Call setBabyGender(gender) if gender changed.
      4. Issue Supabase UPDATE on households row: { baby_dob, baby_name, baby_gender, stage: 'postpartum' }.
      5. On Supabase error: show error, revert stage to prior value via setStage.
      6. On success: router.back() — the tab layout has already updated.

    Do not seed a default date. Do not reference October 2025.

    ---

    Update store/household.ts — add setStage export for rollback:

    setStage already exists in the store. Confirm it is exported from the
    useHouseholdStore create() call. If the function is defined but not
    surfaced on the interface type (HouseholdState), add it explicitly.
    No new store actions are needed beyond what already exists.
  </action>
  <verify>
    npm run typecheck passes.
    npm run lint passes.
    With stage = 'postpartum': Baby tab is visible, href is undefined.
    With stage = 'pregnant': Baby tab is absent from tab bar (href null).
    baby-arrived.tsx validates that a future date produces an inline error.
    baby-arrived.tsx calls setBabyDob and issues a Supabase update on confirm.
  </verify>
  <done>
    Tab bar shows Baby tab only when isPostpartum is true.
    Baby tab renders today's stats, quick log buttons, recent feeds, milestones.
    Baby Arrived modal collects dob/name/gender, updates store and Supabase,
    rolls back on Supabase failure without requiring a restart.
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- TASK 3: Postpartum logging modals                                      -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 3: Feeding, diaper, sleep, and milestone logging modals</name>
  <files>
    app/(modals)/log-feeding.tsx
    app/(modals)/log-diaper.tsx
    app/(modals)/log-sleep.tsx
    app/(modals)/add-milestone.tsx
    components/postpartum/FeedingTimer.tsx
  </files>
  <action>
    Create components/postpartum/FeedingTimer.tsx:

    A self-contained component that displays a running timer (HH:MM:SS) and
    Start/Stop controls. Props: onStop(durationSecs: number) => void.
    Uses useRef for the interval ID and useState for elapsedSecs.
    Displays elapsed time formatted as mm:ss (no hours needed for feeds).
    Start button: starts the interval, records startTime in a ref.
    Stop button: clears interval, computes duration, calls onStop(durationSecs).
    If the component unmounts while running, clear the interval in useEffect
    cleanup. Do not persist timer state across app backgrounding in this phase.

    ---

    Create app/(modals)/log-feeding.tsx:

    Header: "Log feed"

    Feed type selector — four pills in a 2x2 grid:
      Left breast (breast_left)
      Right breast (breast_right)
      Bottle (bottle)
      Formula (formula)
    Active pill uses colors.primary background with white text.

    Below type selector: FeedingTimer component.
    When user taps Stop, duration_secs is captured.
    Alternatively, user can skip the timer and enter duration manually
    (a TextInput for minutes, keyboard type "numeric") — show this as
    "Or enter manually" below the timer.

    Optional: amount_ml TextInput ("Amount in ml") — numeric keyboard.
    Optional: notes TextInput, multiline: false.

    Save button: "Save feed"
    On press: insert into feeding_logs with household_id, logged_by (currentUser.id),
    started_at (computed from now - duration_secs if timer was used, else now),
    ended_at (now), feed_type, duration_secs (null if not entered),
    amount_ml (null if not entered), notes (null if empty).
    Cast response: as unknown as FeedingLog.
    On success: router.back().
    On error: inline error message below Save button.

    ---

    Create app/(modals)/log-diaper.tsx:

    Header: "Log diaper"

    Three large tappable tiles in a row:
      Wet (diaper_type: 'wet') — emoji 💧
      Dirty (diaper_type: 'dirty') — emoji 💩
      Both (diaper_type: 'both') — emoji 💧💩
    Each tile shows the emoji, label, and a subtle border. Active tile uses
    colors.primary border with accent background fill.

    This is a single-tap save: selecting a tile immediately triggers the insert
    without a Save button. Show a brief loading indicator on the selected tile
    during the Supabase call, then router.back().

    Insert into diaper_logs: household_id, logged_by (currentUser.id),
    logged_at (now), diaper_type.
    On error: show a Toast-style error using a brief Text component that fades
    after 3 seconds (no external library; use opacity animation via Animated.Value
    from react-native core). Do not dismiss the modal on error.

    ---

    Create app/(modals)/log-sleep.tsx:

    Header: "Log sleep"

    Two time pickers: "Started" and "Ended".
    Use TextInput fields with placeholder "HH:MM" and keyboard type "numeric"
    as the entry mechanism (no native DateTimePicker — avoid the platform
    permission/style inconsistency in this phase). Pre-fill "Started" with
    the current time minus 1 hour and "Ended" with the current time.
    Validate: ended must be after started.

    Quality selector: three pills labeled "Light", "Okay", "Solid"
    (maps to quality 1, 2, 3). Optional — user can skip.

    Optional notes TextInput.

    Save button: "Save sleep"
    On press: insert into sleep_logs with household_id, started_at (ISO from
    the two time inputs combined with today's date), ended_at, quality, notes.
    On success: router.back(). On error: inline error.

    ---

    Create app/(modals)/add-milestone.tsx:

    Header: "Add milestone"

    TextInput: "What happened?" (milestone title), required.
    TextInput: "Date (YYYY-MM-DD)", required, defaults to today.
    TextInput: "Notes" (optional, multiline: true, maxHeight: 100).
    TextInput: "Photo URL (optional)" — media_url. Plain URL input in this
    phase; camera/picker integration is deferred.

    Save button: "Save milestone"
    On press: insert into baby_milestones with household_id, logged_by
    (currentUser.id), title, occurred_on (from date input), notes, media_url.
    Validate title is non-empty and date is a valid ISO date.
    On success: router.back(). On error: inline error below Save.

    ---

    All four modals follow the same visual structure:
    - Screen background: colors.background
    - Header section: padding spacing.lg top and horizontal; title in
      fonts.heading.bold 24px, back button via router.back() in top-left corner
    - Content in a ScrollView with paddingHorizontal: spacing.lg
    - Save buttons use the same pill style as log-symptom modal if it exists,
      otherwise: full-width, backgroundColor: colors.primary, borderRadius:
      radii.full, paddingVertical: 14, text in fonts.body.semibold white 16px
    - All StyleSheet — no inline styles
  </action>
  <verify>
    npm run typecheck passes.
    npm run lint passes.
    FeedingTimer renders a running mm:ss and calls onStop with elapsed seconds.
    log-feeding.tsx inserts into feeding_logs with the correct shape.
    log-diaper.tsx inserts on tile tap without a Save button.
    log-sleep.tsx validates that ended > started before allowing save.
    add-milestone.tsx validates title non-empty before allowing save.
  </verify>
  <done>
    All four logging modals are functional. Each inserts to its respective
    Supabase table with household_id scoping. No TypeScript errors.
    Diaper log is single-tap. Feeding log captures timer-based or manual duration.
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════════════════ -->
<!-- TASK 4: Stage-aware Home, Health, and Together screens                 -->
<!-- ═══════════════════════════════════════════════════════════════════════ -->

<task type="auto">
  <name>Task 4: Stage-aware screen variants for Home, Health, and Together</name>
  <files>
    app/(tabs)/home.tsx
    app/(tabs)/health.tsx
    app/(tabs)/together.tsx
    components/postpartum/NightShiftCard.tsx
    components/postpartum/BabyStatsBar.tsx
    hooks/usePostpartumSync.ts
  </files>
  <action>
    Create hooks/usePostpartumSync.ts:

    A hook that returns the latest record from feeding_logs, diaper_logs, and
    sleep_logs for a given householdId. Also fetches the latest night-shift swap
    event from household_events where event_type = 'night_shift_swap'.

    Signature:
      usePostpartumSync(householdId: string | null): {
        lastFeed:   FeedingLog | null;
        lastDiaper: DiaperLog | null;
        lastSleep:  SleepLog | null;
        lastSwap:   HouseholdEvent | null;
        loading:    boolean;
        refresh:    () => Promise<void>;
      }

    Fetches on mount. Subscribes to realtime inserts on feeding_logs,
    diaper_logs, sleep_logs, and household_events using separate
    useRealtimeSync calls. On insert of a newer record, replace the
    current last* value if the new record's timestamp is more recent.

    ---

    Create components/postpartum/BabyStatsBar.tsx:

    Props: lastFeed, lastDiaper, lastSleep (all nullable).
    Three horizontal stat cells in a Card:
      Left: "Last feed" — feed_type label + relative time ("2h ago")
      Center: "Last diaper" — diaper_type label + relative time
      Right: "Last sleep" — "sleeping" if ended_at is null, else duration formatted
      as "Xh Ym" + relative time of started_at
    If a value is null: show "—" in the stat value position.
    No onPress — display only. Uses colors/fonts/spacing from theme.ts.

    ---

    Create components/postpartum/NightShiftCard.tsx:

    Props: lastSwap (HouseholdEvent | null), currentUser (AppUser),
           onSwap: () => Promise<void>, swapLoading: boolean.

    Displays:
      Heading: "Night shift" in fonts.heading.semibold
      Current handler line: "On duty: {handler}" where handler comes from
      lastSwap.payload.handler cast as NightShiftPayload. If null: "Not set".
      Last swap time: "Swapped {relative time}" — use the same relative format
      as BabyStatsBar ("2h ago", "Just now" for < 2 minutes).
      Tally line: "You've taken {n} of {total} shifts tonight" — computed from
      the count passed in via props (see Together integration below).

    "I've got this" button: full-width, colors.primary, calls onSwap().
    Shows ActivityIndicator inside the button when swapLoading is true.

    The button copy changes based on current handler:
      If current handler is already currentUser.role: "Taking over again"
      Otherwise: "I've got this"

    ---

    Update app/(tabs)/home.tsx:

    Add isPostpartum = useHousehold().isPostpartum.

    When isPostpartum is true, replace WeekHeroCard and TrimesterProgress with:
      A "Family Mode" hero card showing:
        - Baby age via getPostpartumAge(household.baby_dob) formatted as
          "{n} weeks {d} days" (or "newborn" for day 0)
        - baby_name if set
        - Postpartum week content headline: postpartumContent[week-1]?.momRecovery
          truncated to 2 lines (numberOfLines={2})
      Background: colors.primary (same style as focusCard in together.tsx)

    The BabyStatsBar (via usePostpartumSync data) renders below the hero card
    in a Card when isPostpartum. Call usePostpartumSync only when isPostpartum is
    true (conditional hook call is NOT allowed in React — instead always call the
    hook but pass null for householdId when not postpartum, which causes the hook
    to skip all fetches).

    Todos and QuickActions remain for both stages. When isPostpartum, QuickActions
    should include a "Log feed" shortcut routing to /(modals)/log-feeding and a
    "Log diaper" shortcut routing to /(modals)/log-diaper, in place of or
    alongside the pregnancy quick actions. Update QuickActions or pass a prop —
    do not hardcode postpartum-only routes in QuickActions; instead accept an
    optional overrides prop or detect stage inside QuickActions via useHousehold.

    ---

    Update app/(tabs)/health.tsx:

    Add isPostpartum and isMotherRole from useHousehold().

    When isPostpartum AND isMotherRole:
      Header: title "Recovery", sub "Postpartum check-in"
      Replace the Apple Health placeholder and existing log form area with:

      Recovery Check-in card:
        - Mood selector (same moods as health_logs: great/good/okay/tired/
          anxious/emotional/happy — health_logs still receives these)
        - Energy 1–5 dots (same energy_level field)
        - Feeding method currently using: pill selector
          breast / bottle / formula / mixed / not feeding
          Store this in health_logs.notes as a structured prefix:
          "feeding_method:{value}|" followed by any free-text notes.
          This avoids a schema change while capturing the field.
        - Notes TextInput (optional)
        - "Log check-in" button → inserts into health_logs (same table, same RLS)
          with the same fields. No new table needed.

      Recovery timeline card:
        Title "Week {postpartumWeek}" with sub-text from
        postpartumContent[week-1]?.momRecovery (clamped to index 11 for week > 12).

      Postpartum-specific: hide the kick counter and contraction timer rows.
      Show instead a "Pediatric visits" row routing to /(modals)/ped-visits
      with a "Soon" badge — this is a placeholder for Phase 2 of the workstream.

    When isPostpartum AND isPartnerRole:
      RLS already blocks health_logs reads for the partner unless their own logs.
      The guard inside health.tsx already existed — preserve it.
      Show an empty state: "This is {mom's display_name}'s recovery space."
      No log form for partner.

    When NOT isPostpartum: no changes to health.tsx behavior.

    ---

    Update app/(tabs)/together.tsx:

    Add isPostpartum from useHousehold().

    When isPostpartum:
      Replace the pregnancy-specific content (weekContent, babyDevelopment,
      TRIMESTER_ACTIONS, CONNECTION_PROMPTS) with postpartum content.
      Keep the AccordionCard and general layout structure — it works well.

      Call usePostpartumSync(household?.id ?? null) for lastFeed, lastDiaper,
      lastSleep, lastSwap.

      Night tally computation for NightShiftCard: count household_events rows
      where event_type = 'night_shift_swap' and created_at > start of today
      at 8pm local time (i.e., after 20:00 yesterday if current time is before
      8pm, after 20:00 today otherwise). Fetch this count on mount alongside
      usePostpartumSync. It does not need realtime — show stale count, user can
      pull to refresh.

      onSwap handler: insert into household_events with actor_id = currentUser.id,
      event_type = 'night_shift_swap', payload = { handler: currentUser.role }.
      On success, usePostpartumSync's realtime subscription will update lastSwap.

      Screen structure (postpartum variant):
        Header: "Together" title, sub "Week {postpartumWeek} postpartum"

        NightShiftCard (full-width, near top) — prominent

        BabyStatsBar inside a Card — "Right now"

        AccordionCard "This week for you" — postpartumContent[week-1]?.partnerFocus
          for partner; momRecovery for mother

        AccordionCard "How to help this week" — write 4–6 postpartum-specific
          action items per week band (weeks 1–2, 3–4, 5–8, 9–12) as a constant
          POSTPARTUM_ACTIONS keyed by week band. These do not need to be
          per-week — week band is sufficient.

        Connection prompt — reuse the CONNECTION_PROMPTS array from the existing
          together.tsx; these are stage-agnostic questions that remain relevant.

    When NOT isPostpartum: no changes to together.tsx behavior.
  </action>
  <verify>
    npm run typecheck passes.
    npm run lint passes.
    With household.stage = 'postpartum': home.tsx renders family hero card,
    health.tsx renders recovery check-in, together.tsx renders NightShiftCard.
    With household.stage = 'pregnant': all three screens render their existing
    pregnancy content unchanged.
    NightShiftCard onSwap inserts a household_events row with the correct shape.
  </verify>
  <done>
    Home, Health, and Together tabs each have a working postpartum variant.
    Pregnancy variant is unbroken.
    NightShiftCard logs night-shift swaps to household_events.
    Recovery check-in writes to health_logs (no new table).
    BabyStatsBar shows last feed/diaper/sleep from usePostpartumSync.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → Supabase anon API | All postpartum inserts cross here; household_id is supplied by the client |
| household_events.payload | Free-form JSONB; consumed by UI without schema enforcement |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-FM-01 | Tampering | household_id on insert | mitigate | RLS policy `household_id = get_my_household_id()` blocks cross-household writes on all 6 new tables |
| T-FM-02 | Information Disclosure | health_logs (mom's recovery) | mitigate | Existing partner guard in health.tsx preserved; RLS restricts reads to own household only |
| T-FM-03 | Tampering | household_events.payload | accept | Low-value field; no PII; shape validated at read site via NightShiftPayload cast |
| T-FM-04 | Elevation of Privilege | baby-arrived.tsx stage flip | mitigate | setBabyDob is store-local; Supabase UPDATE requires authenticated session and household membership via RLS |
| T-FM-05 | Denial of Service | feeding_logs insert rate | accept | Private two-user household; abuse surface is negligible |
| T-FM-06 | Repudiation | night-shift swaps | accept | No auditability requirement; actor_id is stored for basic attribution |
</threat_model>

<verification>
## Phase Completion Checks

1. npm run typecheck — zero errors
2. npm run lint — zero errors
3. supabase/02-postpartum.sql — contains all 6 CREATE TABLE statements, all RLS policies, all indexes. Does not contain DROP TABLE for any existing table.
4. types/index.ts — exports FeedingLog, DiaperLog, SleepLog, BabyMilestone, PediatricianVisit, HouseholdEvent, NightShiftPayload
5. Stage transition: set household.stage = 'postpartum' in the store directly (can be done in a test screen or via Reactotron) — Baby tab becomes visible without restart
6. Baby tab guard: set stage back to 'pregnant' — Baby tab disappears
7. log-feeding modal: tap a feed type, start and stop the timer, tap Save — row appears in Supabase feeding_logs
8. log-diaper modal: tap "Wet" — row appears in Supabase diaper_logs without a Save button press
9. NightShiftCard: tap "I've got this" — household_events row appears with correct event_type and payload.handler
10. Recovery check-in (Health tab, postpartum, mother): log a check-in — row appears in health_logs with feeding_method prefix in notes field
</verification>

<success_criteria>
1. Stage transition is driven entirely by baby_dob — no hardcoded postpartum state, no date seeds.
2. All new tables are household-scoped with RLS. A user from a different household cannot read or write postpartum records.
3. Pregnancy features work when stage is 'pregnant'. Postpartum features work when stage is 'postpartum'. No cross-contamination.
4. The night-shift swap flow allows one user to log "I've got this" and the other user sees the update via realtime without pulling to refresh.
5. A feed can be logged from start to stop in under 3 taps (open Baby tab → tap Feed → tap a type → timer running → tap Stop → Save).
6. A diaper can be logged in 2 taps (open Baby tab → tap Diaper → tap type tile).
7. TypeScript strict mode: zero `any` usages introduced outside the existing Supabase cast site.
</success_criteria>

<output>
After completion, create `.planning/workstreams/family-mode/phases/01-family-mode/01-family-mode-01-SUMMARY.md`

Include:
- What was built (tables, types, screens, components)
- Stage transition mechanism confirmed working
- Night-shift swap implementation (household_events)
- Any deviations from this plan and why
- Open items for Phase 2 of this workstream
</output>
