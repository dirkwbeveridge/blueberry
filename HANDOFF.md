# Handoff — Design System Foundation

**Last updated:** 2026-06-18
**Branch:** `design-system-foundation` (9 commits ahead of `main`, working tree clean)
**Status:** All 4 foundation tasks DONE (code-complete). Pending: full typecheck confirmation + device verification, then merge.

---

## Where things are

Consolidating the design system before building remaining feature phases. Six reusable
primitives extracted; every tab and modal refactored to consume them and the design tokens.

### Done (committed on this branch)

| Commit | What |
|--------|------|
| `cb5bdaf` | Task 1 — `theme.ts`: 7-step `typography` scale + tint colors (`primaryTint/successTint/warningTint/errorTint/shadow`); Badge wired to tokens |
| `7bd944c` | Task 2 — extracted `DateField`, `TimeField`, `Chip`; refactored add-todo / add-appointment / log-symptom; fixed **PS-41** (Save enables with only a note) |
| `9b844e2` | Logged PS-60 (mood selector → horizontal chips) |
| `4c98f87` | `docs/prototype-v2.html` (12-screen design-build prototype); fixed **textMuted contrast** `#7B6F8A → #675B78` (was 4.49:1 on ivory, now 5.92:1 — AA) |
| `40d42b4` | Task 3a — extracted `ModalSheet`; refactored all 6 modal scaffolds (handle + title + accessible Cancel) |
| `5c8d497` | Task 3b — extracted `ScreenHeader`, `EmptyState`, `SegmentedControl`; refactored health/memories/more/todo/partner/login; bonus: partner.tsx `@/`-alias removed |
| `0ff1a5b` | Added this HANDOFF.md |
| `20323ae` | Task 4 — color-token sweep: all remaining `#FFFFFF`/`#F5F0FF`/`#1A0F3A`/`#E8F8ED` literals → tokens; reconciled `week-detail.tsx` off-brand Tailwind palette (SYS-04) to brand tints. Verified: grep for the 10 target literals returns zero hits. |

Primitives now in `components/ui/`: Button, Input, Card, Badge, ProgressBar (pre-existing) +
**DateField, TimeField, Chip, ModalSheet, ScreenHeader, EmptyState, SegmentedControl** (new).

### Decisions made
- **Foundation-first**: consolidate the design system on this branch before building feature phases in parallel. (User chose this.)
- Foundation tasks run **sequentially** (all touch shared files); parallelism is reserved for the feature phases afterward.
- **PS-60 resolved**: keep mood chips horizontal (user reviewed the prototype, did not object).
- Kept Blueberry's brand in Stage 1 of `/design-build`; rejected ui-ux-pro-max's off-brand cyan/green palette, adopted only its a11y guardrails.

---

## RESUME HERE — verify, then merge

All 4 foundation tasks are code-complete and committed. Two verification gates remain before merging to `main` (both blocked only by the OneDrive environment, not the code):

1. **Full typecheck.** Committed but never confirmed clean past Task 3a — `tsc` times out on the OneDrive-synced `node_modules` (same I/O issue that hung Metro). To confirm: **pause OneDrive sync**, then `npm run typecheck`. Expect green (no `error TS` lines). Every token referenced exists in `theme.ts`; risk is low.
2. **Device-verify the branch.** All 6 tabs + 6 modals now render through new primitives + tokens — never seen on device. `pkill -f metro` then `npx expo start --port 8081 -c`, scan with Expo Go. Confirm: all 6 tabs load; To Do segmented control + calendar 14-Day/Month toggle work; each modal opens with handle + title + Cancel (Cancel closes); log-symptom mood chips horizontal + Save-enables-on-note; date/time pickers open; week-detail trimester colors now look plum/lavender (not blue/green). Watch for blank/mis-aligned/crashing screens.

If both pass → **merge `design-system-foundation` → `main`** (reconcile the `ui-backlog.md` conflict — see Hazards), then move to the items below.

---

## Remaining work

### Typography-scale adoption (the one unfinished design-system thread)
Task 1 created the 7-step `typography` export but **nothing consumes it yet** — screens still use inline `fontSize` + `fontFamily` pairs (~23 distinct sizes). Migrating those to `typography.display/title/heading/subheading/body/label/caption` is the last design-system sweep (SYS-05). Bounded and mechanical; deferred out of Task 4 to keep that task to color only. Do as a "Task 5" via subagent-driven-development after the merge, or fold into the per-screen UI review.

### Separate functional pass (NOT design-system — do after foundation lands)
Three real P1 bugs from the second UI audit (on `main`'s `ui-backlog.md`):
- **PS-61** — setup step unreachable: `handleHousehold` calls `setCurrentUser` before `setStep('setup')`, so the auth gate redirects to tabs and new households never save due date / stage. Needs an onboarding-flow decision (separate setup screen inside tabs, or collect inline before setCurrentUser).
- **PS-62** — Journal tab unwired: `app/(tabs)/journal.tsx` exists but has no `<Tabs.Screen>` entry / nav path. (Designed in `prototype-v2.html`.)
- **PS-53** — contraction timer can save a corrupt mid-contraction record (`endedAt: null`); add a guard.

---

## Hazards / gotchas
- **`ui-backlog.md` has DIVERGED** between `main` (PS-60..PS-85, includes the 3 P1s above) and this branch (different PS-60 = mood-chip note). It WILL merge-conflict — reconcile PS numbering when merging this branch to main.
- **`tsc` / Metro are unreliable on the OneDrive path.** Pause OneDrive sync before heavy Node I/O. Long-term fix: work from a non-synced local clone.
- `.planning/STATE.md` and `ROADMAP.md` are stale (2026-05-23) — predate all auth + foundation work. Refresh before relying on `gsd-manager` / `gsd-stats`.
- `npm run ios`/`android` were switched to native builds (`expo run:*`) on `main`; this branch still uses Expo Go (`npx expo start`), which is fine for verification.

## Reference docs
- `docs/design-system.md` — the spec driving Tasks 1–4 (token catalog, type scale, primitive inventory).
- `docs/ui-backlog.md` (this branch) — SYS-01..08 + per-screen findings.
- `docs/prototype-v2.html` — visual target for the foundation + the Journal/setup designs.
- `docs/project-dashboard.html` — phase status overview.
- `.planning/.continue-here.md` + `.planning/HANDOFF.json` — earlier (pre-3a) GSD handoff, now superseded by this file.
