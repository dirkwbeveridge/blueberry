# Blueberry Design System

Single source of truth for tokens, typography, color, component inventory, and usage rules.
Generated from a static audit of `constants/theme.ts` and all screens (2026-06-10).

---

## 1. Token catalog (as-is in `constants/theme.ts`)

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `colors.primary` | `#3D2B6B` | Plum. Primary actions, headings, selected states. |
| `colors.accent` | `#C4B5E8` | Lavender. Progress bars, borders on selected chips, dots, badge tints. |
| `colors.background` | `#FAF8F5` | Ivory. Screen background. |
| `colors.surface` | `#FFFFFF` | Card and input background. |
| `colors.text` | `#1A1A2E` | Body copy, headings on light backgrounds. |
| `colors.textMuted` | `#7B6F8A` | Secondary labels, captions, placeholders. |
| `colors.success` | `#6DBF82` | Positive states, low-priority badge. |
| `colors.warning` | `#F4A261` | Caution states, medium-priority badge. |
| `colors.error` | `#E76F51` | Destructive states, high-priority badge, validation errors. |
| `colors.border` | `#EDE8F5` | Dividers, input borders, segmented control background. |

### Spacing

| Token | Value | Notes |
|-------|-------|-------|
| `spacing.xs` | 4 | Tight gaps: chip padding, small row gaps. |
| `spacing.sm` | 8 | Standard internal gap (badge, row vertical padding). |
| `spacing.md` | 16 | Default section padding, card internal padding. |
| `spacing.lg` | 24 | Screen horizontal padding, section gaps. |
| `spacing.xl` | 48 | Screen top padding (`paddingTop`). |
| `spacing.xxl` | 80 | Bottom scroll padding (safe area clearance). |
| _(missing)_ | 32 | No token between `lg` and `xl`; screens improvise — see SYS-07. |

### Radii

| Token | Value | Usage |
|-------|-------|-------|
| `radii.sm` | 8 | Checkboxes, small chips, calendar day cells. |
| `radii.md` | 12 | Input fields, picker triggers, segmented control buttons. |
| `radii.lg` | 24 | Cards, hero cards, modal sheets. |
| `radii.full` | 9999 | Pills (badges, buttons, date-urgency chips). |

### Typography families (from `fonts`)

| Key | Font | Role |
|-----|------|------|
| `fonts.heading.bold` | `PlayfairDisplay_700Bold` | Display numbers, screen titles, hero week number. |
| `fonts.heading.semibold` | `PlayfairDisplay_600SemiBold` | Section headings, card titles, accordion headers. |
| `fonts.body.regular` | `DMSans_400Regular` | Body copy, notes, captions. |
| `fonts.body.medium` | `DMSans_500Medium` | Labels, secondary interactive text, nav labels. |
| `fonts.body.semibold` | `DMSans_600SemiBold` | Buttons, section labels (uppercase), emphasis. |

### Shadow / card preset

`cardStyle` in `theme.ts` is the canonical card surface. Use `<Card>` — never replicate these shadow values inline.

```ts
shadowColor:   '#3D2B6B'   // == colors.primary
shadowOpacity: 0.06
shadowRadius:  12
shadowOffset:  { width: 0, height: 4 }
elevation:     3
```

---

## 2. Proposed typography scale

The current codebase contains 23 distinct `fontSize` values (9 pt through 64 pt) applied ad hoc. The table below proposes seven named steps that cover every real use case. Screens should import and apply these; when `theme.ts` is updated, every screen normalizes automatically.

| Step | Size | Line height | Family | Usage |
|------|------|-------------|--------|-------|
| `type.display` | 56–64 | size + 4 | `fonts.heading.bold` | Hero week number (`WeekHeroCard`, `week-detail.tsx`). Keep current sizes for these two; pick 64 for the hero, 56 for week-detail. |
| `type.title` | 26 | 32 | `fonts.heading.bold` | Screen titles (`Health`, `Memories`, `More`, Home greeting). |
| `type.heading` | 20–22 | 28 | `fonts.heading.bold` | Modal sheet titles, step titles in login. |
| `type.subheading` | 17–19 | 24 | `fonts.heading.semibold` | Card section headings, accordion headers, prompt question. |
| `type.body` | 15–16 | 24 | `fonts.body.regular` | Body copy, tool sub-labels, appointment text, partner screen body. |
| `type.label` | 13–14 | 20 | `fonts.body.medium` or `semibold` | Form labels, segment labels, nav labels, badge text. |
| `type.caption` | 11–12 | 16 | `fonts.body.regular` | Timestamps, date sub-labels, tick marks, history-row metadata. |

Implementation: add a `typography` export to `theme.ts` with these seven objects, each containing `{ fontSize, lineHeight, fontFamily }`. Replace inline `fontFamily + fontSize` pairs across all screens.

---

## 3. Color token additions (proposed)

These values appear hardcoded across the codebase and need to become tokens.

| Proposed token | Value | Replaces |
|----------------|-------|---------|
| `colors.primaryTint` | `#F5F0FF` | `backgroundColor: '#F5F0FF'` in `login.tsx` (×3), `add-todo.tsx`, `log-symptom.tsx` (×2), `todo.tsx` (×2), `partner.tsx`, `memories.tsx` |
| `colors.successTint` | `#E8F8ED` | `bg` in `Badge` variant success, `kick-counter.tsx` goal card, `add-todo.tsx` low-priority chip |
| `colors.warningTint` | `#FEF3E8` | `bg` in `Badge` variant warning, `add-todo.tsx` medium-priority chip |
| `colors.errorTint` | `#FEF0ED` | `bg` in `Badge` variant error, `add-todo.tsx` high-priority chip |
| `colors.shadow` | `#1A0F3A` | `shadowColor` in `WeekHeroCard.tsx`, `partner.tsx` (focusCard). Darker-plum shadow, currently hardcoded in 2 files. |

**Off-brand colors to reconcile (SYS-04):**

| File | Value | Replace with |
|------|-------|-------------|
| `week-detail.tsx` | `#EDF5FF` (trim 2 bg), `#93C5FD` (trim 2 border) | `colors.primaryTint`, `colors.accent` |
| `week-detail.tsx` | `#EDFFED` (trim 3 bg), `#86EFAC` (trim 3 border) | `colors.successTint`, `colors.success` |
| `week-detail.tsx` | `#EDF5FF` (partnerCard bg) | `colors.primaryTint` |
| `week-detail.tsx` | `#2563EB` (partnerLabel) | `colors.primary` |

Trimester-differentiated hero colors are a valid design idea but must use brand-system tints, not Tailwind defaults.

---

## 4. Component inventory

### Exists in `components/ui/`

| Component | File | Status |
|-----------|------|--------|
| `Button` | `Button.tsx` | Solid. Three variants (primary / secondary / ghost). 48 pt min height. |
| `Input` | `Input.tsx` | Mostly solid. Known issues: hardcoded `height: 52` breaks multiline (PS-55); no `accessibilityLabel` forwarding (PS-56). |
| `Card` | `Card.tsx` | Solid. Thin wrapper around `cardStyle`. |
| `Badge` | `Badge.tsx` | Solid. Five variants. Tint values should be drawn from token additions above. |
| `ProgressBar` | `ProgressBar.tsx` | Solid. |

### Exists in `components/home/`

| Component | File | Notes |
|-----------|------|-------|
| `WeekHeroCard` | `WeekHeroCard.tsx` | Duplicates `FRUIT_EMOJIS` from `week-detail.tsx` (PS-47). |
| `TrimesterProgress` | `TrimesterProgress.tsx` | Clean. |
| `TodoList` | `TodoList.tsx` | Clean. |
| `QuickActions` | `QuickActions.tsx` | Stage-agnostic — shows contraction timer regardless of stage (PS-58). |

### Should be extracted to `components/ui/` (SYS-08)

| Component | Proposed API | Currently duplicated in |
|-----------|-------------|------------------------|
| `ModalSheet` | `<ModalSheet title="…" onClose={…}>` wraps handle + header row + cancel button | `add-todo.tsx`, `add-appointment.tsx`, `log-symptom.tsx`, `kick-counter.tsx`, `contraction-timer.tsx`, `week-detail.tsx` — identical scaffold in all six |
| `ScreenHeader` | `<ScreenHeader title="…" subtitle="…" action={<Button>}>` | `health.tsx`, `memories.tsx`, `more.tsx`, `todo.tsx`, `partner.tsx` |
| `DateField` | `<DateField label="…" value={date} onChange={…} minimumDate={…}>` wraps trigger row + `DateTimePicker` | `add-todo.tsx`, `add-appointment.tsx`; also needed in `login.tsx` setup step (PS-01) |
| `TimeField` | `<TimeField label="…" value={time} onChange={…}>` wraps trigger row + spinner + Done button | `add-appointment.tsx` |
| `SegmentedControl` | `<SegmentedControl options={[…]} value={…} onChange={…}>` | `todo.tsx` (tab bar, calendar view toggle), `login.tsx` (create/join toggle), `todo.tsx` CalendarPane view toggle |
| `EmptyState` | `<EmptyState emoji="…" title="…" body="…" action={{ label, onPress }}>` | `todo.tsx` (todos + appointments), `health.tsx`, `memories.tsx`, `CalendarPane` |
| `Chip` | `<Chip label="…" selected={bool} onPress={…} emoji?="…">` | `log-symptom.tsx` (mood chips, symptom chips), `add-todo.tsx` (priority chips), `login.tsx` (role, stage, gender selectors) |

---

## 5. Usage rules

### Tokens first

Never hardcode a hex color or `rgba(...)` value in a screen or component `StyleSheet`. If the right token does not exist, add it to `theme.ts` first, then consume it.

### Typography: use the scale

Once the `typography` export is added, all font size + font family pairs should reference a named step. Do not mix arbitrary `fontSize` literals with font family strings inline.

### No `#FFFFFF` literals

Use `colors.surface`. The only exception is on `colors.primary` backgrounds where readability requires white text — use `colors.surface` there too, or add `colors.onPrimary` as an alias.

### Card vs. raw View

Use `<Card>` for every elevated, rounded content block. Do not replicate `cardStyle` fields inline.

### Touch targets

All interactive elements must have a minimum touch area of 44×44 pt (iOS HIG) and 48×48 dp (Material). Use `minHeight: 44`, `minWidth: 44`, or `hitSlop` to achieve this — do not rely on content size alone.

### Accessibility

- Set `accessibilityRole` on every `TouchableOpacity` that acts as a button or link.
- Use `accessibilityLabel` for icon-only or emoji-only buttons.
- Forward the `label` prop from `Input` to `TextInput`'s `accessibilityLabel`.
- Avoid conveying state solely through color (e.g. selected/unselected chips must also change border or use a visible indicator).

### Copy and voice

- No em dashes anywhere.
- No "Hey Mama!" energy, no exclamation point overload.
- Avoid hardcoding gendered pronouns ("her", "she") in component or screen strings. Route those through a content layer keyed on household role data.
- `Alert.alert('Coming soon', ...)` is not a substitute for a proper disabled/badge state on a visible CTA. Use the `comingSoon` prop pattern from `more.tsx` consistently.

### Stage-aware rendering

Components and quick-action lists must filter against `household.stage`. Kick counter and contraction timer are pregnancy-only features — do not surface them to TTC or postpartum households.

### Shared constants

Lookup tables (e.g. `FRUIT_EMOJIS`, `MOOD_EMOJI`, `PRIORITY_BADGE`) that appear in more than one file belong in `constants/`. Create the constant once, import everywhere.

---

## 6. Open items mapped to this doc

| Backlog ID | This section |
|------------|-------------|
| SYS-01 | This document |
| SYS-02 | Section 3 — `colors.primaryTint`, `colors.shadow` |
| SYS-03 | Section 3 — `successTint / warningTint / errorTint / accentTint` (= `primaryTint`) |
| SYS-04 | Section 3 — off-brand reconciliation table |
| SYS-05 | Section 2 — proposed typography scale |
| SYS-06 | Section 3 — rgba literals should become named overlay tokens (add to `colors` once the set is enumerated) |
| SYS-07 | Section 1 — add `spacing` step at 32 |
| SYS-08 | Section 4 — component inventory and extraction list |
