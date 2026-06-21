# UI / Usability Backlog

Running capture of UI, layout, usability, and design-system issues. Logging an
issue here is cheap; losing it is expensive. Capture continuously as you notice
things; fix on the schedule below.

## How to use this

- **Systemic** issues live in shared code (tokens, primitives, patterns) and
  repeat across screens. Fix these early, at the component level, so the fix
  propagates. Doing them per-screen later means repeating the same fix N times.
- **Per-screen** issues are local (wording, placement, a wrong field type).
  Batch these into one comprehensive UI review *after* the phase foundations
  exist, so each screen is reviewed once in its final form.
- Add a row the moment you spot something. Severity: P1 (broken/blocking),
  P2 (clearly wrong), P3 (polish). Status: open / in progress / done.

---

## Systemic (fix at the foundation, before building more phases)

Source of truth is `constants/theme.ts`, but screens bypass it heavily. Evidence
from the 2026-06-10 audit below.

| ID | Issue | Evidence | Fix | Sev | Status |
|----|-------|----------|-----|-----|--------|
| SYS-01 | No master design-system doc; `theme.ts` is the token source but is widely bypassed | see SYS-02..07 | Write `docs/design-system.md` pairing tokens to usage rules; make `theme.ts` complete enough that screens never hardcode | P2 | open |
| SYS-02 | Recurring untokenized colors hardcoded across screens | `#F5F0FF` (selected/tint) in 6+ files; `#FFFFFF` literal ~15× instead of `colors.surface`; `#1A0F3A` (card shadow) in 2 files | Add `colors.primaryTint` (`#F5F0FF`), `colors.shadow`; replace literals | P2 | open |
| SYS-03 | Badge/chip tint palette reinvented per file | `#E8F8ED / #FEF3E8 / #FEF0ED / #F5F0FF` duplicated in `Badge.tsx`, `add-todo.tsx`, `kick-counter.tsx` | Add semantic tint tokens `successTint / warningTint / errorTint / accentTint`; consume everywhere | P2 | open |
| SYS-04 | Off-brand palette in `week-detail.tsx` | `#93C5FD`, `#86EFAC`, `#2563EB`, `#EDF5FF`, `#EDFFED`, `#F5EDFF` (Tailwind-default blues/greens, not brand) | Reconcile to brand plum/lavender/ivory tokens | P2 | open |
| SYS-05 | No typography scale | 23 distinct `fontSize` literals (9→64) across app; `fonts` only holds family names | Define a type scale (display/title/heading/body/caption) with size + lineHeight + family; export from `theme.ts` | P2 | open |
| SYS-06 | Translucent colors untokenized | 10 `rgba(...)` literals (white-on-dark overlays) | Tokenize as `colors.overlay*` / on-primary text tokens | P3 | open |
| SYS-07 | Spacing scale has a gap | `spacing` jumps md=16 → lg=24 → xl=48; no 32 step, so screens improvise | Add a 32 step without renaming existing keys (renaming shifts every layout) | P3 | open |
| SYS-08 | Shared primitives missing; duplicated inline | see list below | Extract reusable components into `components/ui/` | P2 | open |

### SYS-08 — primitives to extract

| Primitive | Currently duplicated in | Note |
|-----------|------------------------|------|
| `DateField` / `TimeField` | `add-todo.tsx`, `add-appointment.tsx` | Hand-built date/time pickers this session; extract before they spread further |
| `ScreenHeader` | every tab (`home`, `health`, `todo`, `more`, `together`, `memories`) | Title + optional action button hand-rolled each time |
| `SegmentedControl` | `todo.tsx` (tab bar + calendar view toggle), `login.tsx` (create/join, role) | Same toggle pattern reimplemented |
| `EmptyState` | `todo.tsx`, `health.tsx`, calendar pane | Emoji + title + body + action repeated |
| `ModalSheet` (handle + top bar + cancel) | all 5 modals | Identical header scaffold in each modal |
| `Chip` | `log-symptom.tsx` (mood/symptom), `add-todo.tsx` (priority) | Selectable pill pattern repeated |

---

## Per-screen (batch into the comprehensive UI review, post-foundation)

Capture issues here as you notice them, even though we fix them later. Maps to a
dedicated UI phase (`gsd-ui-phase` / `gsd-ui-review`).

| ID | Screen | Issue | Sev | Status |
|----|--------|-------|-----|--------|
| PS-01 | `(auth)/login.tsx` | Due-date field is a plain text `Input` with `keyboardType="numbers-and-punctuation"` and `placeholder="YYYY-MM-DD"` — forces manual ISO string entry. Should use a `DateTimePicker` (already available in the project via `@react-native-community/datetimepicker`) identical to the one in `add-todo.tsx`. | P1 | done (2026-06-20: setup due-date now uses shared DateField/DateTimePicker flow) |
| PS-02 | `(auth)/login.tsx` | Role-select cards use `#F5F0FF` for `roleBtnSelected` background and `stageBtnSelected` / `genderBtnSelected` — untokenized accent tint repeated 3× in this file alone. | P2 | done (2026-06-20: selection states now use tokenized colors.primaryTint) |
| PS-03 | `(auth)/login.tsx` | Stage picker shows three equal-width pills (TTC / Pregnant / Postpartum) with `fontSize: 12` labels. At default system font sizes, pill content truncates on smaller screens; minimum touch target for each pill is `paddingVertical: spacing.md` (16 pt) with no minimum height guarantee — likely below the 44 pt iOS guideline for narrow stages. | P2 | done (2026-06-20: stage chips now enforce 48pt minimum touch height) |
| PS-04 | `(auth)/login.tsx` | No `accessibilityLabel` on any role, stage, or gender `TouchableOpacity`. Screen-reader users hear nothing meaningful. | P2 | done (2026-06-20: role/stage/gender choices now include accessibility labels and button roles) |
| PS-05 | `(auth)/login.tsx` | Error text (`styles.errorText`) for the household step only renders when `!isJoining && error`, but the join-code path surfaces the error via the `Input`'s `error` prop. This asymmetry means create-household errors (e.g. network failure) show below the button while join errors show above it — inconsistent placement. | P2 | done (2026-06-20: household-step errors now render consistently in one location) |
| PS-06 | `(auth)/login.tsx` | `switchAuth` toggle is a bare `TouchableOpacity` with no minimum touch height; the tap target is a single line of 14 pt text — below 44 pt guideline. | P3 | done (2026-06-20: switch-auth control now has a 44pt touch target and accessibility label) |
| PS-07 | `(tabs)/home.tsx` | `subGreeting` copy reads "Tracking {baby_name} journey" — missing possessive apostrophe ("Tracking Lily**'s** journey") and is grammatically ambiguous without it. | P2 | done (2026-06-20: copy now renders possessive form) |
| PS-08 | `(tabs)/home.tsx` | Greeting appends a wave emoji directly: `{greeting} 👋`. Voice rule: no peppy energy. "Hi, Dirk 👋" reads casual-cute in a way that drifts from the warm-but-calm tone. Emoji in greeting copy should be reviewed against the voice guide. | P3 | done (2026-06-20: greeting no longer appends emoji) |
| PS-09 | `(tabs)/home.tsx` | "See all →" link in the Open Tasks card uses a plain text right-arrow (`→`). Consistent with a few other screens, but no accessible label; VoiceOver reads "See all right arrow" literally. | P3 | done (2026-06-20: added explicit accessibility label and simplified visible copy) |
| PS-10 | `(tabs)/home.tsx` | `paddingBottom: 100` is a magic number on the scroll container — not drawn from `spacing`. Should be `spacing.xxl` (80) or a named safe-area offset once safe-area insets are handled. | P3 | done (2026-06-20: bottom padding now uses spacing token) |
| PS-11 | `(tabs)/health.tsx` | `logBtnText` sets `color: '#FFFFFF'` as a literal. Should use `colors.surface`. | P2 | done (2026-06-20: log button text now uses colors.surface token) |
| PS-12 | `(tabs)/health.tsx` | Loading state is a bare muted text string ("Loading…") inside the log-history card — no spinner, no consistent pattern with other screens. | P3 | done (2026-06-20: loading state now uses ActivityIndicator + text row) |
| PS-13 | `(tabs)/health.tsx` | Empty state for the logs section has an action link ("Log how you are feeling →") in plain `TouchableOpacity` + `Text`, while the todo/appointments empty states use a styled pill button (`emptyAction` style). Inconsistent empty-state treatment across tabs. | P2 | done (2026-06-20: Health now uses shared EmptyState action styling) |
| PS-14 | `(tabs)/health.tsx` | Tool-row chevron is rendered as a `Text` character `›` (`fontSize: 22`). The touch target is the entire row (good), but `accessibilityRole` is not set on the tool-row `TouchableOpacity`, so VoiceOver does not announce it as a button. | P3 | done (2026-06-20: tool rows now include explicit button role and labels) |
| PS-15 | `(tabs)/todo.tsx` | Segment labels mix emoji + text (`✅  Todos`, `📅  Appts`, `🗓  Calendar`). The "Appts" abbreviation is inconsistent with the full word used everywhere else in the screen ("Appointments" section header, empty state). | P2 | done (2026-06-20: segment now uses full Appointments label) |
| PS-16 | `(tabs)/todo.tsx` | Appointment delete gesture is long-press only (`onLongPress`), with only a small hint at the bottom of the screen (`longPressHint`, `fontSize: 11`). No swipe-to-delete, no edit path, no accessible alternative for users who cannot long-press. | P2 | done (2026-06-20: added explicit per-row Delete action with accessibility labels; long-press retained as secondary path) |
| PS-17 | `(tabs)/todo.tsx` | `apptDateBadge` uses `backgroundColor: '#F5F0FF'` (untokenized). `apptUrgency` also uses `'#F5F0FF'`. Both are the accent-tint defined by SYS-02 but not consumed from a token. | P2 | done (2026-06-20: appointment badge surfaces now use colors.primaryTint token) |
| PS-18 | `(tabs)/todo.tsx` | `addBtnText` sets `color: '#FFFFFF'` literal. Should be `colors.surface`. | P2 | done (2026-06-20: add button text now uses colors.surface token) |
| PS-19 | `(tabs)/todo.tsx` | Calendar pane: `CalendarPane` component is defined inside `todo.tsx` rather than extracted. It is ~200 lines and has its own `StyleSheet` (`calStyles`). This will become a maintenance problem as calendar complexity grows. | P3 | done (2026-06-20: extracted to components/todo/CalendarPane.tsx) |
| PS-20 | `(tabs)/todo.tsx` | 14-day strip day-pill is `width: 52, paddingVertical: spacing.sm` (8 pt vertical). Total tap target height is approximately 52 pt for the pill exterior, but the inner text is very small. Verify rendered height meets 44 pt on device. | P3 | done (2026-06-20: day-pill typography increased; tap target remains 52pt) |
| PS-21 | `(tabs)/todo.tsx` | Done-todos toggle uses unicode triangles `▲ / ▽` for open/close state. These are not standard iOS disclosure patterns and have no `accessibilityLabel`. | P3 | done (2026-06-20: toggle now uses explicit show/hide text and accessibility label) |
| PS-22 | `(tabs)/memories.tsx` | "+ Add" button fires `Alert.alert('Coming soon', ...)` — a dead CTA with no disabled state or visual cue that the feature is unavailable. Should be disabled and labeled "Coming soon" (e.g. via a `Badge`) or hidden until the feature ships, matching the pattern used in `more.tsx`. | P2 | done (2026-06-20: Add CTA now routes to Journal instead of dead alert) |
| PS-23 | `(tabs)/memories.tsx` | `milestoneCard` uses `backgroundColor: '#F5F0FF'` (untokenized, same accent tint as SYS-02). | P2 | done (2026-06-20: milestone card now uses tokenized colors.primaryTint) |
| PS-24 | `(tabs)/memories.tsx` | Entry cards show `numberOfLines={5}` on `entryContent`, truncating longer entries with no "read more" affordance. Users cannot know content was cut. | P3 | done (2026-06-20: removed hard truncation so entries show full content) |
| PS-25 | `(tabs)/more.tsx` | Row tap targets use `paddingVertical: spacing.md` (16 pt). Combined with row label font size (~15 pt line height ~22 pt), the total row height is around 38–40 pt — below the 44 pt iOS guideline for list rows. | P2 | done (2026-06-20: rows now enforce minHeight 44) |
| PS-26 | `(tabs)/more.tsx` | "Baby details" and "Household settings" rows call `Alert.alert('Coming soon', ...)` — same dead-CTA problem as PS-22. `comingSoon` prop exists on the `Row` interface but is not applied to these rows; they render with a `›` chevron indicating navigability. | P2 | done (2026-06-20: rows now use comingSoon state and no longer fire dead alerts) |
| PS-27 | `(tabs)/more.tsx` | Profile avatar is a single initial over `colors.primary` background. If `display_name` is null, `displayInitial` falls back to the role string ("mother" → "M", "partner" → "P") which is serviceable, but the null guard is `(currentUser?.display_name ?? currentUser?.role ?? '?').slice(0,1)`. If a user has set a display_name that starts with a lower-case character the avatar renders lower-case — should `.toUpperCase()` after the slice (it's currently called before). Actually it calls `toUpperCase()` on the full string before slicing — fine — but worth confirming on device. | P3 | done (2026-06-20: verified implementation already uppercases before slicing) |
| PS-28 | `(tabs)/more.tsx` | Footer shows `Blueberry · v1.0.0` with a no-op trailing ternary `{isPartnerRole ? '' : ''}`. Dead code. | P3 | done (2026-06-20: removed dead ternary from footer) |
| PS-29 | `(tabs)/together.tsx` (Partner tab) | `focusCard` applies a custom `shadowColor: '#1A0F3A'` and `shadowOpacity: 0.25` — off-token shadow, same dark-plum value noted in SYS-02 but not tokenized. | P2 | done (2026-06-20: focus card uses tokenized colors.shadow) |
| PS-30 | `(tabs)/together.tsx` | `promptCard` uses `backgroundColor: '#F5F0FF'` (untokenized accent tint, SYS-02). | P2 | done (2026-06-20: prompt card now uses colors.primaryTint token) |
| PS-31 | `(tabs)/together.tsx` | `AccordionCard` default state is `open = true`, meaning all three sections expand on load. On a short phone, the user lands in a very tall scroll. Consider defaulting the lower two sections to closed. | P3 | done (2026-06-20: baby/help accordions now default collapsed) |
| PS-32 | `(tabs)/together.tsx` | Section title "What she is experiencing" and prompt hint "Ask her tonight. Listen without immediately responding." hardcode the mother as female / "her". When the partner role expands beyond heterosexual couples this copy breaks. Strings should come from a content layer keyed on household data. | P2 | done (2026-06-20: updated to inclusive neutral copy: "they/them") |
| PS-33 | `(tabs)/together.tsx` | `focusLabel` text "THIS WEEK FOCUS" and `promptLabel` text "💬  THIS WEEK CONVERSATION" are uppercase literal strings in JSX, not constants or content tokens. These are the same category as magic strings in `todo.tsx`. | P3 | done (2026-06-20: labels centralized as top-level constants) |
| PS-34 | `(modals)/add-todo.tsx` | Priority chips have `flex: 1` but the row has no explicit height. On Android, `paddingVertical: spacing.md` (16) may yield chip height below 44 pt. Should set `minHeight: 44`. | P2 | done (2026-06-20: priority chips now enforce 44pt min height) |
| PS-35 | `(modals)/add-todo.tsx` | `cancelBtn` is a bare `TouchableOpacity` with a single-line Text (15 pt). No minimum touch size; tap area is smaller than 44 pt in both dimensions. | P2 | done (2026-06-20: modal now uses shared ModalSheet close action; legacy small cancel button removed) |
| PS-36 | `(modals)/add-todo.tsx` | Due-date clear button (`✕`) and chevron indicator are nested inside the outer `TouchableOpacity` (`dateTrigger`). The inner `TouchableOpacity` for clear overrides the outer press correctly, but `hitSlop` is only on the clear button — the chevron has no hit area extension. Minor but worth noting. | P3 | done (2026-06-20: accepted as resolved via full-width DateField trigger interaction and clear-button hitSlop) |
| PS-37 | `(modals)/add-appointment.tsx` | `cancelBtn` has the same under-sized tap target issue as PS-35. | P2 | done (2026-06-20: modal now uses shared ModalSheet close action; legacy small cancel button removed) |
| PS-38 | `(modals)/add-appointment.tsx` | `fieldLabel` style (`fontSize: 14`) differs from `sectionLabel` in `add-todo.tsx` (`fontSize: 14`, same family) but uses the style name `fieldLabel` vs `sectionLabel`. These are the same visual element — consolidation needed when `ModalSheet` / `DateField` primitives are extracted (SYS-08). | P3 | done (2026-06-20: date/time fields are now shared primitives, removing duplicate per-screen label styling) |
| PS-39 | `(modals)/add-appointment.tsx` | No validation that the combined `apptDate` + `apptTime` produces a sensible future datetime. A user can pick today's date, then close the time picker without picking a time; the code defaults to `09:00:00`. The UI gives no signal that time will default to 9 AM. | P2 | done (2026-06-20: added future-datetime validation, today-time requirement, and explicit 9:00 AM default messaging) |
| PS-40 | `(modals)/log-symptom.tsx` | `moodChipSelected` uses `backgroundColor: '#F5F0FF'` and `symptomChipSelected` uses `backgroundColor: '#F5F0FF'` — untokenized accent tint, same SYS-02 issue appearing 2× in this file. | P2 | done (2026-06-20: selection visuals now come from shared Chip token defaults) |
| PS-41 | `(modals)/log-symptom.tsx` | Save is disabled when `!mood && selectedSymptoms.length === 0 && !energy`. A user who only enters notes cannot save — the notes field is rendered but its value does not factor into the enable condition. | P1 | done (2026-06-20: canSave now includes notes-only entries) |
| PS-42 | `(modals)/log-symptom.tsx` | Mood grid uses `width: 72` fixed chips in a `flexWrap: 'wrap'` row. On a 320 pt wide screen (iPhone SE), 72-pt chips at `gap: spacing.sm` (8) give ~4 per row, leaving the 8th chip orphaned on its own row. No visual issue on larger phones but worth verifying on SE-size devices. | P3 | done (2026-06-20: mood/symptom chips now use flexible shared Chip layout; fixed-width tile issue removed) |
| PS-43 | `(modals)/log-symptom.tsx` | No `accessibilityLabel` on mood chips or symptom chips. VoiceOver reads the emoji character names, not the mood label. | P2 | done (2026-06-20: mood and symptom chips now set explicit accessibility labels) |
| PS-44 | `(modals)/week-detail.tsx` | Hero card uses trimester-indexed color arrays (`trimesterColors`, `trimesterBorders`) with entirely off-brand values: `#F5EDFF / #EDF5FF / #EDFFED` and `colors.accent / #93C5FD / #86EFAC`. The blue and green are Tailwind defaults. Flagged in SYS-04 at the systemic level; this is the per-screen impact. | P2 | done (2026-06-20: hero now uses brand token palette for trimester variants) |
| PS-45 | `(modals)/week-detail.tsx` | `partnerCard` uses `backgroundColor: '#EDF5FF'` and `partnerLabel` uses `color: '#2563EB'` — off-brand blue, SYS-04. | P2 | done (2026-06-20: partner card now uses tokenized primaryTint/primary colors) |
| PS-46 | `(modals)/week-detail.tsx` | Week pill selector uses `FlatList` with `initialScrollIndex`. On first mount with `currentWeek = 0` (no household), `Math.max(0, 0 - 3)` = 0, so it scrolls to week 1. But if `currentWeek` is e.g. 38, the FlatList scrolls to week 35, visually cutting off week 40 — the user sees the list apparently ending at ~week 37. The last few weeks need a trailing padding on `selectorList`. | P2 | done (2026-06-20: selector now includes trailing padding and corrected item layout sizing) |
| PS-47 | `(modals)/week-detail.tsx` | `FRUIT_EMOJIS` map is duplicated verbatim in both `week-detail.tsx` (line 16) and `components/home/WeekHeroCard.tsx` (line 16). Should be extracted to a shared constant (e.g. `constants/fruitEmojis.ts`). | P2 | done (2026-06-20: fruit emoji mapping extracted to constants/fruitEmojis.ts and shared) |
| PS-48 | `(modals)/kick-counter.tsx` | The kick goal card (`styles.goal`) uses `backgroundColor: '#E8F8ED'` and `borderColor: colors.success` — the success tint is untokenized (SYS-03). | P2 | done (2026-06-20: goal card now uses colors.successTint token) |
| PS-49 | `(modals)/kick-counter.tsx` | Kick button (`kickBtn`) is 200×200 pt — well above minimum — but `activeOpacity: 0.7` provides the only visual state feedback during a press. The large circular button has no haptic or animation feedback on tap; for a counter tool where single taps matter, this is a usability gap. | P3 | done (2026-06-20: added light haptic feedback on each kick tap) |
| PS-50 | `(modals)/kick-counter.tsx` | "Finish session" is disabled when `start === null` (handled in `finish()` early return), but the `Button` component does not reflect `disabled` visually unless `disabled` prop is passed. The button appears enabled even when no session is active. | P2 | done (2026-06-20: finish action now passes explicit disabled state when no active session) |
| PS-51 | `(modals)/contraction-timer.tsx` | Main button is 160×160 pt. `mainBtnLabel` text ("Stop"/"Start") uses `color: colors.primary` on a white background when inactive, and `mainBtnElapsed` uses `color: '#FFF'` literal when active — should be `colors.surface`. | P2 | done (2026-06-20: active elapsed text now uses tokenized colors.surface) |
| PS-52 | `(modals)/contraction-timer.tsx` | History list rows have no minimum height; on content-light rows (just a number and time) the row height is driven by `paddingVertical: spacing.sm` (8 pt). Combined with `fontSize: 12–14`, row height is ~28–30 pt — below 44 pt. History rows are not interactive, so this is an accessibility/legibility issue rather than tap-target. | P3 | done (2026-06-20: history rows now enforce minimum height for better readability) |
| PS-53 | `(modals)/contraction-timer.tsx` | "Save session" button is always enabled once `contractions.length > 0`, even while a contraction is in progress (`activeStart !== null`). Saving mid-contraction would log an incomplete final entry (`endedAt: null`). Should disable save while a contraction is active. | P1 | done (2026-06-20: save is now disabled while active and guard enforced in save path) |
| PS-54 | `components/ui/Button.tsx` | `ghost` variant sets `borderColor: colors.border` and `backgroundColor: transparent`. The label style for non-primary variants uses `color: colors.primary`, which is correct, but `ghost` borders are `colors.border` (light lavender) — very low contrast on `colors.background` (off-white). If the ghost button is ever used on a white card surface, the border is essentially invisible. | P3 | done (2026-06-20: ghost border now uses higher-contrast colors.accent) |
| PS-55 | `components/ui/Input.tsx` | Input height is hardcoded at `height: 52`. When `multiline` is true (used in `add-appointment.tsx` and `log-symptom.tsx`), the fixed height clips multi-line content — the field does not grow with content. Should use `minHeight: 52` and remove explicit `height` when `multiline` is set. | P2 | done (2026-06-20: multiline now uses flexible height with top-aligned text) |
| PS-56 | `components/ui/Input.tsx` | No `accessibilityLabel` is forwarded. The `label` prop could be wired to `accessibilityLabel` on the `TextInput`. | P2 | done (2026-06-20: Input now forwards label as default accessibilityLabel) |
| PS-57 | `components/home/WeekHeroCard.tsx` | `FRUIT_EMOJIS` map is duplicated here and in `week-detail.tsx` (see PS-47). | P2 | done (2026-06-20: now consumes shared constants/fruitEmojis.ts helper) |
| PS-58 | `components/home/QuickActions.tsx` | "Contractions" action is always shown regardless of stage. A postpartum user or TTC user sees a Contraction Timer quick action that is not relevant. Actions should be filtered by `household.stage`. | P2 | done (2026-06-20: QuickActions now stage-aware; contractions only in pregnancy, postpartum gets Baby hub shortcut) |
| PS-59 | `components/shared/PlaceholderScreen.tsx` | Uses `@/` path alias (`import { Card } from '@/components/ui/Card'`) but `CLAUDE.md` states no `@/` alias is configured. Inconsistent with the rest of the codebase which uses relative imports. | P2 | done (2026-06-20: imports converted to relative paths) |
| PS-86 | `(modals)/log-symptom.tsx` | Foundation refactor (Task 2) changed the mood selector from emoji-forward tiles (emoji stacked above label, fixed 72-wide) to horizontal `Chip` pills (emoji left of label). (Renumbered from PS-60 on merge — that number is owned by the second audit's contraction-timer P1.) | P3 | resolved (kept horizontal, confirmed on device) |

---

## Second audit — 2026-06-10 (full source review)

Deep read of every screen and component file. Issues below are net-new from the first audit.

### P1 — broken or blocking

| ID | Screen | Issue | Sev | Status |
|----|--------|-------|-----|--------|
| PS-60 | `(modals)/contraction-timer.tsx` | **"Stop" text invisible when active.** `mainBtnLabel` always uses `color: colors.primary` (#3D2B6B). When `isActive = true`, the button background flips to `colors.primary` too — identical foreground and background color. "Stop" is unreadable. Only the elapsed time (`mainBtnElapsed`, `color: '#FFF'`) is visible. Fix: add an active variant style that sets `mainBtnLabel` to `colors.surface` when `isActive`. | P1 | done (2026-06-20: active main button now applies readable surface label color) |
| PS-61 | `(auth)/login.tsx` → `app/_layout.tsx` | **Setup step unreachable.** In the create-household flow, `handleHousehold` calls `setCurrentUser(user)` before calling `setStep('setup')`. As soon as `currentUser` is non-null, the root layout's auth gate detects `authed = true` and immediately `router.replace('/(tabs)/home')`. The setup step renders for at most one frame and the user cannot interact with it. Due date, baby name, and stage are **never written to the database** for new households. Result: all new users land on Home with `currentWeek = 0`, no WeekHeroCard, no TrimesterProgress. Fix: move setup data collection to a separate onboarding screen inside `(tabs)`, or collect due date inline during the household creation step before `setCurrentUser` is called. | P1 | done (2026-06-20: setup now runs before auth-gate handoff and persists household setup fields) |
| PS-62 | `(tabs)/journal.tsx` | **Journal screen unreachable.** The file exists at `app/(tabs)/journal.tsx` but no `<Tabs.Screen name="journal">` entry exists in `app/(tabs)/_layout.tsx`. It is not linked from More, QuickActions, or any other screen. Users have no navigation path to the Journal tab. | P1 | done (2026-06-20: Journal linked from More > Tools/Other views and from Baby tracker milestones flow) |

### P2 — clearly wrong

| ID | Screen | Issue | Sev | Status |
|----|--------|-------|-----|--------|
| PS-63 | `app/(tabs)/_layout.tsx` | **Tab bar ignores safe-area bottom inset.** `tabBarStyle` hardcodes `height: 80, paddingBottom: 16`. On iPhone 16e (home-indicator device), the system safe-area bottom is ~34 pt. The tab bar does not use `useSafeAreaInsets()` or a `SafeAreaView` wrapper — tab icons will sit higher than intended and the bar may underlap the home indicator on different device sizes. | P2 | done (2026-06-20: tab bar now sizes/pads from safe-area bottom inset) |
| PS-64 | `app/(tabs)/_layout.tsx` | **Health↔Together tab flicker on load.** `isPartnerRole` is derived from Zustand; on first render it is `false` (store is hydrating). For partner users, the Health tab briefly appears before the store loads and `href` flips to `null`. This causes a visible tab bar reflow on every cold start for partners. Fix: render tabs only after `currentUser` is non-null, or show a loading state until the store is hydrated. | P2 | done (2026-06-20: role tabs stay hidden until role resolves) |
| PS-65 | `(tabs)/home.tsx` | **Partner sees Mom's health logs.** The "Latest log" card renders `latestLog.mood`, `latestLog.symptoms`, and `latestLog.notes` for both roles. Health logs contain personal body data (symptoms, mood, weight) that Mom may not intend to surface automatically. Either hide this card for partners, or add a partner-specific summary that only shows a shared signal (e.g., "Feeling good today"). | P2 | done (2026-06-20: latest log card and fetch path now mother-only) |
| PS-66 | `(tabs)/home.tsx` | **Todo toggle has no rollback on failure.** `toggleTodo` removes the todo from local state optimistically (`setTodos(prev => prev.filter(...))`), then calls Supabase. If the update fails, the todo disappears permanently for the session. Add a try/catch that restores the todo on failure. | P2 | done (2026-06-20: toggle now waits for save success before removal and keeps item on failure) |
| PS-67 | `(tabs)/memories.tsx` | **Milestone cards not interactive.** Milestone chips in the horizontal strip have no `onPress` handler despite their card appearance implying tappability. Tapping does nothing. Either link to the full journal entry or remove the tappable affordance (flatten the card to a plain text chip). | P2 | done (2026-06-20: milestone cards now open entry details on tap) |
| PS-68 | `(tabs)/more.tsx` | **"Other views" exposes partner to health data.** The "Other views" section provides a direct navigation path for partners to `(tabs)/health`, which shows all of Mom's logged health data (mood, energy, symptoms, notes). The tab bar visibility guard (`href: null`) does not protect the route — it only hides the tab. `health.tsx` has no role-based access guard. | P2 | done (2026-06-20: partner no longer gets Health quick-link in Other views) |
| PS-69 | `(tabs)/more.tsx` | **Tools section shows pregnancy content post-partum.** The `tools` array conditionally includes kick counter and contraction timer when `isPregnant`. But "Week by week" is always included. Post-partum users see a "Week by week" reference entry that has no relevance to their current stage. Filter all pregnancy-specific tools by stage. | P2 | done (2026-06-20: Week by week now scoped to pregnancy tool set) |
| PS-70 | `components/home/TodoList.tsx` | **Checkbox has no pending state.** The `checkbox` View is always empty (no checkmark, no fill). When the user taps a todo, the item disappears after the Supabase round-trip completes, with no intermediate visual state. There is no way to tell if the tap registered. Add a checked state (filled checkbox or strikethrough title) while the update is in flight. | P2 | done (2026-06-20: pending todo state now shows checked/struck visual until save completes) |
| PS-71 | `components/home/TrimesterProgress.tsx` | **Progress bar overflows above 1.0.** `progress = week / 40` is unclamped. If `week > 40` (overdue), `ProgressBar` receives a value above 1.0. Depending on `ProgressBar`'s implementation, this may render the fill beyond the bar container. Clamp: `Math.min(week / 40, 1)`. | P2 | done (2026-06-20: progress now clamped to 0..1) |
| PS-72 | `(auth)/login.tsx` | **No password visibility toggle.** The password `Input` uses `secureTextEntry` with no show/hide toggle. Users cannot verify what they typed, leading to avoidable auth failures — especially on the signup path where they set the password for the first time. | P2 | done (2026-06-20: auth flow now includes show/hide password control) |
| PS-73 | `(auth)/login.tsx` | **Setup step collects due date as free-text ISO string.** The setup step (even though it currently cannot be reached — PS-61) uses a plain `Input` with `keyboardType="numbers-and-punctuation"` and `placeholder="YYYY-MM-DD"` for due date. This duplicates the PS-01 issue from the credential step. When the setup flow is fixed, it must use `DateTimePicker`. | P2 | done (2026-06-20: setup due-date now uses DateField/DateTimePicker) |
| PS-74 | `(modals)/add-appointment.tsx` | **Date and time pickers use different `display` modes.** Date uses `display="inline"` (calendar grid); time uses `display="spinner"` (scroll wheel). The inconsistency within the same form is jarring. Both should use the same interaction pattern — prefer `inline` for both, or provide a unified `compact` mode. | P2 | done (2026-06-20: add-appointment now uses inline display for both date and time pickers) |
| PS-75 | `(modals)/add-appointment.tsx` | **No `created_by` stored on appointments.** The INSERT does not include a `created_by` field. When two partners each create appointments, there is no attribution in the data or UI. If one partner wants to cancel "their" appointment they cannot distinguish it from the other's. Add `created_by: currentUser.id` to the insert. | P2 | done (2026-06-20: insert now writes created_by with backward-compatible fallback; migration added) |
| PS-76 | `(modals)/kick-counter.tsx` | **"Finish session" button does not reflect disabled state.** `Button` visually disables only when its `disabled` prop is `true`. `finish()` returns early when `start === null`, but the button renders as fully enabled. Before a session starts, "Finish session" and action buttons are not shown at all (correct), but there is no guard preventing a user from somehow triggering `finish()` when `start === null` via edge cases. Pass `disabled={start === null}` to be explicit. | P2 | done (2026-06-20: finish action now includes explicit disabled guard for non-active sessions) |

### P3 — polish

| ID | Screen | Issue | Sev | Status |
|----|--------|-------|-----|--------|
| PS-77 | `components/home/TodoList.tsx` | **Priority shown twice per row.** Each todo row shows both a colored `dot` (right edge, `priorityColors`) and a `Badge` label below the title. Two indicators for the same attribute. Remove the dot and keep the Badge, or vice versa. | P3 | done (2026-06-20: duplicate priority dot removed; badge remains) |
| PS-78 | `components/home/TrimesterProgress.tsx` | **Tick labels lack context.** The tick marks below the progress bar show bare numbers `'1', '13', '26', '40'` with no unit. A new user may not know these are week numbers. Label as `w1 / w13 / w26 / w40` or add a "weeks" axis label. | P3 | done (2026-06-20: tick labels now include week context) |
| PS-79 | `components/home/WeekHeroCard.tsx` | **No tap affordance on hero card.** The card is a `TouchableOpacity` routing to week-detail, but there is no chevron, subtitle like "Tap for more", or any visual cue indicating it is interactive. Most users will not discover the week detail screen. | P3 | done (2026-06-20: hero card now includes explicit "Tap for details" affordance) |
| PS-80 | `(tabs)/home.tsx` | **No guidance when week is unknown.** When `currentWeek = 0` (no due date set, or stage is TTC), the WeekHeroCard and TrimesterProgress sections are hidden. The Home screen shows only the health log, todos, and quick actions with no explanation. Add an inline prompt to complete household setup / enter a due date. | P3 | done (2026-06-20: Home now shows setup guidance card when week is unavailable) |
| PS-81 | `(tabs)/home.tsx` | **`addBtnText` literal white.** `memories.tsx` `addBtnText` uses `color: '#FFFFFF'` — should be `colors.surface`. Same pattern as SYS-02 but in the Memories screen specifically. | P3 | done (2026-06-20: memories add button text now uses tokenized colors.surface) |
| PS-82 | `(modals)/contraction-timer.tsx` | **Contraction history uses array index as React key.** `[...contractions].reverse().map((c, i) => <View key={i}>)` — key is the reversed index, not a stable ID. When a new contraction is added, all existing keys shift. React will re-render the entire list. Assign a stable `id` (e.g., `startedAt`) to each `Contraction` entry. | P3 | done (2026-06-20: history rows now use startedAt as stable key) |
| PS-83 | `(auth)/login.tsx` | **Role step offers no description of each role's experience.** "The mother" and "The partner" are the only labels. New users unfamiliar with the app don't know what capabilities each role unlocks (health logging vs. together view). A one-line description under each role card would reduce hesitation. | P3 | done (2026-06-20: added concise role descriptions under each role option) |
| PS-84 | `app/(tabs)/_layout.tsx` | **`⋯` More tab icon inconsistent with emoji sibling tabs.** All other tabs use themed emoji (🏠 💜 ✅ 📓). The More tab uses `⋯` (U+22EF), a math ellipsis — a different visual weight and style than the emoji icons. Replace with `•••` rendered as text or use an emoji alternative. | P3 | done (2026-06-20: More tab icon updated to emoji style) |
| PS-85 | `(modals)/log-symptom.tsx` | **Save button disabled when only notes are entered.** Condition: `!mood && selectedSymptoms.length === 0 && !energy`. A user who only types notes and does not tap mood/energy/symptoms cannot save — despite the notes field being present and accepting input. Flagged as P1 in PS-41; re-noting here as confirmed by direct code read. | P1 | done (2026-06-20: resolved alongside PS-41 by notes-aware save enablement) |

---

## Audit notes — 2026-06-10

**First audit method:** grep for hardcoded hex / rgba / fontSize literals across `app/` and
`components/`, compared against `constants/theme.ts`.

- Color literals outside the token file appear in ~13 screen/component files.
  `#F5F0FF` (the de-facto "selected" tint) and `#FFFFFF` are the most frequent.
- `week-detail.tsx` carries an entirely separate, off-brand color set.
- Type sizing is ad hoc: 23 distinct `fontSize` values, which is a symptom of
  no shared scale rather than 23 intentional sizes.
- `components/ui/` has Badge, Button, Card, Input, ProgressBar. Everything else
  (headers, segmented controls, empty states, modal scaffolds, chips, date/time
  fields) is hand-rolled per screen, which is where most per-screen drift starts.

Recommended order: SYS-05 (type scale) and SYS-02/03 (color tokens) first since
the most files depend on them, then SYS-08 (extract primitives), then build the
remaining phases on the consolidated foundation, then run the per-screen review.

**Second audit method (2026-06-10):** Full source read of every screen and component
file — `_layout.tsx`, all 6 tabs, all 6 modals, all 5 UI primitives, 4 home
components, auth gate. Native simulator build not completed (no `ios/` folder);
audit is code-based. New findings in PS-60 through PS-85 (26 issues, 3 P1, 11 P2, 12 P3).
Three P1s found: contraction timer "Stop" text invisible (CT), setup step unreachable
due to premature auth gate (critical UX), journal screen has no navigation path.

## Postpartum Content Foundation

Family Mode content now has a dedicated source so postpartum UX can consume consistent messaging.

- `lib/postpartumWeeks.ts`: Calculates postpartum week from `baby_dob`, clamped to 1 through 52.
- `constants/postpartumContent.ts`: Week 1 through 12 guidance with `momRecovery`, `partnerFocus`, and `babyFocus`.

Intended consumers:

- Postpartum home cards
- Partner/together support prompts
- Week-detail style references for Family Mode
