---
workstream: family-mode
created: 2026-06-09
updated: 2026-06-21
---

# Project State

## Current Position

**Status:** In progress
**Current Phase:** 01-family-mode
**Last Activity:** 2026-06-20
**Last Activity Description:** Baby-arrived trigger, postpartum tab visibility, and consolidated baby tracker logging are implemented; postpartum variants for Home/Health/Together and shared support surfaces remain pending.

## Progress

**Phases Complete:** 0
**Current Plan:** 01-family-mode/PLAN.md (partially executed)

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

## Data Model Reality (Current)

Implementation currently uses a consolidated `baby_logs` table (`log_type` + JSONB `details`) for postpartum tracker entries.

- Implemented tracker types: feeding, sleep, diaper, handoff
- Milestones/pediatric flows currently route through existing app surfaces rather than dedicated tables
- Dedicated normalized postpartum tables from original plan are not yet implemented

## Current Gaps (Blocking Full Family Mode Usability)

1. `home.tsx` postpartum hero/weekly guidance variant needs completion and verification.
2. `health.tsx` postpartum recovery check-in path needs completion and verification.
3. `together.tsx` postpartum support/night-shift surfaces need completion.
4. Dedicated postpartum sync abstractions (`usePostpartumSync`, stats components) are still not implemented.

## Session Continuity

**Stopped At:** Core trigger + logging implemented; remaining work is postpartum screen variants and shared support surfaces.
**Resume File:** .planning/workstreams/family-mode/phases/01-family-mode/PLAN.md

## Next Action

1. Complete and verify postpartum variants for `home.tsx`, `health.tsx`, and `together.tsx`.
2. Add shared night-shift visibility surfaces (table/model finalization if needed).
3. Keep planning docs aligned to the consolidated `baby_logs` architecture until/unless a normalized schema migration is approved.
