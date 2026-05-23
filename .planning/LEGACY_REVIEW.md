# Blueberry Legacy Review

**Reviewed:** 2026-05-15  
**Source:** `/Users/dbeveridge/Documents/00 - Claude/Personal Projects/Blueberry`

## Summary

The old Claude project contains useful product planning for a private two-user pregnancy companion app. It also contains legacy Firebase registry/demo artifacts and a prior GSD/git history that should not be carried into this Codex-owned repo.

This new project should preserve the product intent, safety/security constraints, and phased roadmap structure, but it should regenerate all code, app scaffolding, database SQL, and execution plans inside this clean workspace.

## Preserve

- Private two-user app scope: mother plus partner, one shared household, no public product or multi-tenant growth goal.
- Core value: both users see the same pregnancy state, todos, health logs, journal entries, and appointments from separate devices.
- Platform direction: Expo React Native with TypeScript, Expo Router, Supabase Auth/Postgres/Realtime/Storage, Zustand, and AsyncStorage for non-auth local persistence.
- Security boundary: every household-owned query must filter by `household_id`; RLS must enforce household isolation.
- Safety boundary: contraction timer must function fully offline and sync later.
- Design direction: warm, personal, premium companion rather than clinical tracker; deep blueberry purple, Playfair headings, DM Sans body.
- GSD phase structure: foundation, auth/household, home, logging, tracking, journal/appointments, integrations.
- Requirement inventory from the old plan, with stale facts and integration scope reviewed before execution.

## Discard

- Old Firebase registry app and any registry-specific implementation.
- Old `index.html`, `404.html`, `.firebaserc`, `firebase.json`, `outputs/`, `audit.jsonl`, `skills-lock.json`, `baby_registry.csv`, and generated artifacts.
- Existing git history, prior commits, old branch assumptions, and Claude-specific handoff instructions that only describe the old repo state.
- Old generated execution plans as authoritative instructions. They can inform sequencing, but Codex should produce new phase plans in this repo before code is written.
- Any requirement that assumes dated pregnancy facts without reconfirmation.

## Needs Confirmation

- The old spec says the mother was 15 weeks pregnant with a due date around **October 5, 2025**. As of **May 15, 2026**, that date is in the past, so the app should not initialize around that pregnancy state without a fresh date or stage.
- Whether Google Calendar sync and push notifications belong in v1 or should move to v1.5 after the private household app works.
- Whether AI/Anthropic weekly content is still desired. The old docs conflict: the tech stack mentions Anthropic, but requirements defer AI-generated content to v2.
- Whether the app should live at the repo root or inside a nested `blueberry/` Expo folder. For this clean Codex repo, root-level Expo is simpler unless there is a reason to preserve the nested structure.

## Clean Initialization Recommendation

1. Initialize GSD planning in this repo only: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md`.
2. Use root-level Expo app structure when implementation starts, not a nested `blueberry/` folder, because this repository is already named Blueberry and contains no competing app.
3. Generate fresh Phase 1 plans before code: foundation scaffold, Supabase schema/setup docs, typed app model, and store/router wiring.
4. Create implementation files from fresh Codex-authored plans, not by copying the old repo or old generated files.
5. Gate Phase 2 on a manual Supabase checkpoint: schema deployed, RLS active, two-user household access verified.
