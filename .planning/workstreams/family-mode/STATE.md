---
workstream: family-mode
created: 2026-06-09
updated: 2026-06-09
---

# Project State

## Current Position

**Status:** Planned
**Current Phase:** 01-family-mode
**Last Activity:** 2026-06-09
**Last Activity Description:** Phase 01 plan written; ready for execution

## Progress

**Phases Complete:** 0
**Current Plan:** 01-family-mode/PLAN.md (4 tasks, 1 wave, fully autonomous)

## Urgency Note

The test household's real due date was 2025-10-11. As of 2026-06-09 they are
already 34 weeks postpartum. Family Mode should be executed as soon as the
core Phase 1–6 golden path is verified on device. It does not depend on
Phases 7a/7b/7c (calendar, push) and can be built in parallel with those workstreams.

## Stage Transition Mechanism

Trigger: households.baby_dob is set (via the "Baby has arrived" modal at
More → Baby has arrived, or via household setup in a future phase).

Chain:
  store.setBabyDob(dob)        — sets stage: 'postpartum' synchronously in Zustand
  Supabase UPDATE households   — confirms the transition server-side
  useHousehold().isPostpartum  — becomes true immediately
  app/(tabs)/_layout.tsx       — Baby tab href flips from null → undefined (visible)
  home.tsx / health.tsx / together.tsx — each reads isPostpartum and branches content

No app restart required. Rollback on Supabase failure: modal calls setStage()
back to prior value.

## New Tables (supabase/02-postpartum.sql)

Additive migration — does not drop any existing table.

- baby_milestones      — milestone events with optional media_url
- pediatrician_visits  — scheduled/completed ped appointments
- diaper_logs          — wet/dirty/both with logged_at
- sleep_logs           — start/end/quality 1-3
- feeding_logs         — breast L/R/bottle/formula; timer-based duration; amount_ml
- household_events     — generic event table; used for night-shift swaps
                         (event_type = 'night_shift_swap', payload.handler = role)

## Night-Shift Swap Storage Decision

household_events table (not Zustand-only, not a dedicated night_shift_swaps table).
Rationale: both users need live visibility; Zustand-only is single-device.
A generic events table avoids schema churn as new ephemeral signals are added.
Realtime is enabled on household_events.
Rows older than 7 days are candidates for pruning via pg_cron (future migration).

## Session Continuity

**Stopped At:** N/A — not yet executed
**Resume File:** .planning/workstreams/family-mode/phases/01-family-mode/PLAN.md
