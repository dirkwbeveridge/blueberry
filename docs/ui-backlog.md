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
| PS-01 | `(auth)/login.tsx` | Due-date field is a plain text `Input` with `keyboardType="numbers-and-punctuation"` and `placeholder="YYYY-MM-DD"` — forces manual ISO string entry. Should use a `DateTimePicker` (already available in the project via `@react-native-community/datetimepicker`) identical to the one in `add-todo.tsx`. | P1 | open |
| PS-02 | `(auth)/login.tsx` | Role-select cards use `#F5F0FF` for `roleBtnSelected` background and `stageBtnSelected` / `genderBtnSelected` — untokenized accent tint repeated 3× in this file alone. | P2 | open |
| PS-03 | `(auth)/login.tsx` | Stage picker shows three equal-width pills (TTC / Pregnant / Postpartum) with `fontSize: 12` labels. At default system font sizes, pill content truncates on smaller screens; minimum touch target for each pill is `paddingVertical: spacing.md` (16 pt) with no minimum height guarantee — likely below the 44 pt iOS guideline for narrow stages. | P2 | open |
| PS-04 | `(auth)/login.tsx` | No `accessibilityLabel` on any role, stage, or gender `TouchableOpacity`. Screen-reader users hear nothing meaningful. | P2 | open |
| PS-05 | `(auth)/login.tsx` | Error text (`styles.errorText`) for the household step only renders when `!isJoining && error`, but the join-code path surfaces the error via the `Input`'s `error` prop. This asymmetry means create-household errors (e.g. network failure) show below the button while join errors show above it — inconsistent placement. | P2 | open |
| PS-06 | `(auth)/login.tsx` | `switchAuth` toggle is a bare `TouchableOpacity` with no minimum touch height; the tap target is a single line of 14 pt text — below 44 pt guideline. | P3 | open |
| PS-07 | `(tabs)/home.tsx` | `subGreeting` copy reads "Tracking {baby_name} journey" — missing possessive apostrophe ("Tracking Lily**'s** journey") and is grammatically ambiguous without it. | P2 | open |
| PS-08 | `(tabs)/home.tsx` | Greeting appends a wave emoji directly: `{greeting} 👋`. Voice rule: no peppy energy. "Hi, Dirk 👋" reads casual-cute in a way that drifts from the warm-but-calm tone. Emoji in greeting copy should be reviewed against the voice guide. | P3 | open |
| PS-09 | `(tabs)/home.tsx` | "See all →" link in the Open Tasks card uses a plain text right-arrow (`→`). Consistent with a few other screens, but no accessible label; VoiceOver reads "See all right arrow" literally. | P3 | open |
| PS-10 | `(tabs)/home.tsx` | `paddingBottom: 100` is a magic number on the scroll container — not drawn from `spacing`. Should be `spacing.xxl` (80) or a named safe-area offset once safe-area insets are handled. | P3 | open |
| PS-11 | `(tabs)/health.tsx` | `logBtnText` sets `color: '#FFFFFF'` as a literal. Should use `colors.surface`. | P2 | open |
| PS-12 | `(tabs)/health.tsx` | Loading state is a bare muted text string ("Loading…") inside the log-history card — no spinner, no consistent pattern with other screens. | P3 | open |
| PS-13 | `(tabs)/health.tsx` | Empty state for the logs section has an action link ("Log how you are feeling →") in plain `TouchableOpacity` + `Text`, while the todo/appointments empty states use a styled pill button (`emptyAction` style). Inconsistent empty-state treatment across tabs. | P2 | open |
| PS-14 | `(tabs)/health.tsx` | Tool-row chevron is rendered as a `Text` character `›` (`fontSize: 22`). The touch target is the entire row (good), but `accessibilityRole` is not set on the tool-row `TouchableOpacity`, so VoiceOver does not announce it as a button. | P3 | open |
| PS-15 | `(tabs)/todo.tsx` | Segment labels mix emoji + text (`✅  Todos`, `📅  Appts`, `🗓  Calendar`). The "Appts" abbreviation is inconsistent with the full word used everywhere else in the screen ("Appointments" section header, empty state). | P2 | open |
| PS-16 | `(tabs)/todo.tsx` | Appointment delete gesture is long-press only (`onLongPress`), with only a small hint at the bottom of the screen (`longPressHint`, `fontSize: 11`). No swipe-to-delete, no edit path, no accessible alternative for users who cannot long-press. | P2 | open |
| PS-17 | `(tabs)/todo.tsx` | `apptDateBadge` uses `backgroundColor: '#F5F0FF'` (untokenized). `apptUrgency` also uses `'#F5F0FF'`. Both are the accent-tint defined by SYS-02 but not consumed from a token. | P2 | open |
| PS-18 | `(tabs)/todo.tsx` | `addBtnText` sets `color: '#FFFFFF'` literal. Should be `colors.surface`. | P2 | open |
| PS-19 | `(tabs)/todo.tsx` | Calendar pane: `CalendarPane` component is defined inside `todo.tsx` rather than extracted. It is ~200 lines and has its own `StyleSheet` (`calStyles`). This will become a maintenance problem as calendar complexity grows. | P3 | open |
| PS-20 | `(tabs)/todo.tsx` | 14-day strip day-pill is `width: 52, paddingVertical: spacing.sm` (8 pt vertical). Total tap target height is approximately 52 pt for the pill exterior, but the inner text is very small. Verify rendered height meets 44 pt on device. | P3 | open |
| PS-21 | `(tabs)/todo.tsx` | Done-todos toggle uses unicode triangles `▲ / ▽` for open/close state. These are not standard iOS disclosure patterns and have no `accessibilityLabel`. | P3 | open |
| PS-22 | `(tabs)/memories.tsx` | "+ Add" button fires `Alert.alert('Coming soon', ...)` — a dead CTA with no disabled state or visual cue that the feature is unavailable. Should be disabled and labeled "Coming soon" (e.g. via a `Badge`) or hidden until the feature ships, matching the pattern used in `more.tsx`. | P2 | open |
| PS-23 | `(tabs)/memories.tsx` | `milestoneCard` uses `backgroundColor: '#F5F0FF'` (untokenized, same accent tint as SYS-02). | P2 | open |
| PS-24 | `(tabs)/memories.tsx` | Entry cards show `numberOfLines={5}` on `entryContent`, truncating longer entries with no "read more" affordance. Users cannot know content was cut. | P3 | open |
| PS-25 | `(tabs)/more.tsx` | Row tap targets use `paddingVertical: spacing.md` (16 pt). Combined with row label font size (~15 pt line height ~22 pt), the total row height is around 38–40 pt — below the 44 pt iOS guideline for list rows. | P2 | open |
| PS-26 | `(tabs)/more.tsx` | "Baby details" and "Household settings" rows call `Alert.alert('Coming soon', ...)` — same dead-CTA problem as PS-22. `comingSoon` prop exists on the `Row` interface but is not applied to these rows; they render with a `›` chevron indicating navigability. | P2 | open |
| PS-27 | `(tabs)/more.tsx` | Profile avatar is a single initial over `colors.primary` background. If `display_name` is null, `displayInitial` falls back to the role string ("mother" → "M", "partner" → "P") which is serviceable, but the null guard is `(currentUser?.display_name ?? currentUser?.role ?? '?').slice(0,1)`. If a user has set a display_name that starts with a lower-case character the avatar renders lower-case — should `.toUpperCase()` after the slice (it's currently called before). Actually it calls `toUpperCase()` on the full string before slicing — fine — but worth confirming on device. | P3 | open |
| PS-28 | `(tabs)/more.tsx` | Footer shows `Blueberry · v1.0.0` with a no-op trailing ternary `{isPartnerRole ? '' : ''}`. Dead code. | P3 | open |
| PS-29 | `(tabs)/together.tsx` (Partner tab) | `focusCard` applies a custom `shadowColor: '#1A0F3A'` and `shadowOpacity: 0.25` — off-token shadow, same dark-plum value noted in SYS-02 but not tokenized. | P2 | open |
| PS-30 | `(tabs)/together.tsx` | `promptCard` uses `backgroundColor: '#F5F0FF'` (untokenized accent tint, SYS-02). | P2 | open |
| PS-31 | `(tabs)/together.tsx` | `AccordionCard` default state is `open = true`, meaning all three sections expand on load. On a short phone, the user lands in a very tall scroll. Consider defaulting the lower two sections to closed. | P3 | open |
| PS-32 | `(tabs)/together.tsx` | Section title "What she is experiencing" and prompt hint "Ask her tonight. Listen without immediately responding." hardcode the mother as female / "her". When the partner role expands beyond heterosexual couples this copy breaks. Strings should come from a content layer keyed on household data. | P2 | open |
| PS-33 | `(tabs)/together.tsx` | `focusLabel` text "THIS WEEK FOCUS" and `promptLabel` text "💬  THIS WEEK CONVERSATION" are uppercase literal strings in JSX, not constants or content tokens. These are the same category as magic strings in `todo.tsx`. | P3 | open |
| PS-34 | `(modals)/add-todo.tsx` | Priority chips have `flex: 1` but the row has no explicit height. On Android, `paddingVertical: spacing.md` (16) may yield chip height below 44 pt. Should set `minHeight: 44`. | P2 | open |
| PS-35 | `(modals)/add-todo.tsx` | `cancelBtn` is a bare `TouchableOpacity` with a single-line Text (15 pt). No minimum touch size; tap area is smaller than 44 pt in both dimensions. | P2 | open |
| PS-36 | `(modals)/add-todo.tsx` | Due-date clear button (`✕`) and chevron indicator are nested inside the outer `TouchableOpacity` (`dateTrigger`). The inner `TouchableOpacity` for clear overrides the outer press correctly, but `hitSlop` is only on the clear button — the chevron has no hit area extension. Minor but worth noting. | P3 | open |
| PS-37 | `(modals)/add-appointment.tsx` | `cancelBtn` has the same under-sized tap target issue as PS-35. | P2 | open |
| PS-38 | `(modals)/add-appointment.tsx` | `fieldLabel` style (`fontSize: 14`) differs from `sectionLabel` in `add-todo.tsx` (`fontSize: 14`, same family) but uses the style name `fieldLabel` vs `sectionLabel`. These are the same visual element — consolidation needed when `ModalSheet` / `DateField` primitives are extracted (SYS-08). | P3 | open |
| PS-39 | `(modals)/add-appointment.tsx` | No validation that the combined `apptDate` + `apptTime` produces a sensible future datetime. A user can pick today's date, then close the time picker without picking a time; the code defaults to `09:00:00`. The UI gives no signal that time will default to 9 AM. | P2 | open |
| PS-40 | `(modals)/log-symptom.tsx` | `moodChipSelected` uses `backgroundColor: '#F5F0FF'` and `symptomChipSelected` uses `backgroundColor: '#F5F0FF'` — untokenized accent tint, same SYS-02 issue appearing 2× in this file. | P2 | open |
| PS-41 | `(modals)/log-symptom.tsx` | Save is disabled when `!mood && selectedSymptoms.length === 0 && !energy`. A user who only enters notes cannot save — the notes field is rendered but its value does not factor into the enable condition. | P1 | open |
| PS-42 | `(modals)/log-symptom.tsx` | Mood grid uses `width: 72` fixed chips in a `flexWrap: 'wrap'` row. On a 320 pt wide screen (iPhone SE), 72-pt chips at `gap: spacing.sm` (8) give ~4 per row, leaving the 8th chip orphaned on its own row. No visual issue on larger phones but worth verifying on SE-size devices. | P3 | open |
| PS-43 | `(modals)/log-symptom.tsx` | No `accessibilityLabel` on mood chips or symptom chips. VoiceOver reads the emoji character names, not the mood label. | P2 | open |
| PS-44 | `(modals)/week-detail.tsx` | Hero card uses trimester-indexed color arrays (`trimesterColors`, `trimesterBorders`) with entirely off-brand values: `#F5EDFF / #EDF5FF / #EDFFED` and `colors.accent / #93C5FD / #86EFAC`. The blue and green are Tailwind defaults. Flagged in SYS-04 at the systemic level; this is the per-screen impact. | P2 | open |
| PS-45 | `(modals)/week-detail.tsx` | `partnerCard` uses `backgroundColor: '#EDF5FF'` and `partnerLabel` uses `color: '#2563EB'` — off-brand blue, SYS-04. | P2 | open |
| PS-46 | `(modals)/week-detail.tsx` | Week pill selector uses `FlatList` with `initialScrollIndex`. On first mount with `currentWeek = 0` (no household), `Math.max(0, 0 - 3)` = 0, so it scrolls to week 1. But if `currentWeek` is e.g. 38, the FlatList scrolls to week 35, visually cutting off week 40 — the user sees the list apparently ending at ~week 37. The last few weeks need a trailing padding on `selectorList`. | P2 | open |
| PS-47 | `(modals)/week-detail.tsx` | `FRUIT_EMOJIS` map is duplicated verbatim in both `week-detail.tsx` (line 16) and `components/home/WeekHeroCard.tsx` (line 16). Should be extracted to a shared constant (e.g. `constants/fruitEmojis.ts`). | P2 | open |
| PS-48 | `(modals)/kick-counter.tsx` | The kick goal card (`styles.goal`) uses `backgroundColor: '#E8F8ED'` and `borderColor: colors.success` — the success tint is untokenized (SYS-03). | P2 | open |
| PS-49 | `(modals)/kick-counter.tsx` | Kick button (`kickBtn`) is 200×200 pt — well above minimum — but `activeOpacity: 0.7` provides the only visual state feedback during a press. The large circular button has no haptic or animation feedback on tap; for a counter tool where single taps matter, this is a usability gap. | P3 | open |
| PS-50 | `(modals)/kick-counter.tsx` | "Finish session" is disabled when `start === null` (handled in `finish()` early return), but the `Button` component does not reflect `disabled` visually unless `disabled` prop is passed. The button appears enabled even when no session is active. | P2 | open |
| PS-51 | `(modals)/contraction-timer.tsx` | Main button is 160×160 pt. `mainBtnLabel` text ("Stop"/"Start") uses `color: colors.primary` on a white background when inactive, and `mainBtnElapsed` uses `color: '#FFF'` literal when active — should be `colors.surface`. | P2 | open |
| PS-52 | `(modals)/contraction-timer.tsx` | History list rows have no minimum height; on content-light rows (just a number and time) the row height is driven by `paddingVertical: spacing.sm` (8 pt). Combined with `fontSize: 12–14`, row height is ~28–30 pt — below 44 pt. History rows are not interactive, so this is an accessibility/legibility issue rather than tap-target. | P3 | open |
| PS-53 | `(modals)/contraction-timer.tsx` | "Save session" button is always enabled once `contractions.length > 0`, even while a contraction is in progress (`activeStart !== null`). Saving mid-contraction would log an incomplete final entry (`endedAt: null`). Should disable save while a contraction is active. | P1 | open |
| PS-54 | `components/ui/Button.tsx` | `ghost` variant sets `borderColor: colors.border` and `backgroundColor: transparent`. The label style for non-primary variants uses `color: colors.primary`, which is correct, but `ghost` borders are `colors.border` (light lavender) — very low contrast on `colors.background` (off-white). If the ghost button is ever used on a white card surface, the border is essentially invisible. | P3 | open |
| PS-55 | `components/ui/Input.tsx` | Input height is hardcoded at `height: 52`. When `multiline` is true (used in `add-appointment.tsx` and `log-symptom.tsx`), the fixed height clips multi-line content — the field does not grow with content. Should use `minHeight: 52` and remove explicit `height` when `multiline` is set. | P2 | open |
| PS-56 | `components/ui/Input.tsx` | No `accessibilityLabel` is forwarded. The `label` prop could be wired to `accessibilityLabel` on the `TextInput`. | P2 | open |
| PS-57 | `components/home/WeekHeroCard.tsx` | `FRUIT_EMOJIS` map is duplicated here and in `week-detail.tsx` (see PS-47). | P2 | open |
| PS-58 | `components/home/QuickActions.tsx` | "Contractions" action is always shown regardless of stage. A postpartum user or TTC user sees a Contraction Timer quick action that is not relevant. Actions should be filtered by `household.stage`. | P2 | open |
| PS-59 | `components/shared/PlaceholderScreen.tsx` | Uses `@/` path alias (`import { Card } from '@/components/ui/Card'`) but `CLAUDE.md` states no `@/` alias is configured. Inconsistent with the rest of the codebase which uses relative imports. | P2 | open |
| PS-60 | `(modals)/log-symptom.tsx` | Foundation refactor (Task 2) changed the mood selector from emoji-forward tiles (emoji stacked above label, fixed 72-wide) to horizontal `Chip` pills (emoji left of label). Functionally fine; revisit during UI review whether the tile treatment should be restored for the mood grid, or `Chip` should support a vertical layout variant. | P3 | open |

---

## Audit notes — 2026-06-10

Method: grep for hardcoded hex / rgba / fontSize literals across `app/` and
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
