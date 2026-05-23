# Requirements: Blueberry

**Defined:** 2026-05-15  
**Status:** Draft for Codex-owned clean start

## Phase 0: Planning

- [x] **PLAN-01:** Inspect old `BLUEBERRY_SPEC.md`, `CODEX_HANDOFF.md`, and `.planning/` before writing code.
- [x] **PLAN-02:** Record what to preserve, discard, and reconfirm from legacy planning.
- [x] **PLAN-03:** Initialize clean GSD planning docs in the new repo without copying legacy implementation artifacts.

## v1 Requirements

### Foundation

- [x] **INFRA-01:** Expo React Native app initializes cleanly in this repo and runs on iOS and Android development targets.
- [x] **INFRA-02:** TypeScript strict mode is enabled with shared domain types and no `any` usage in app code.
- [x] **INFRA-03:** Design tokens define color, type, spacing, radii, and shared component primitives for a warm private companion app.
- [x] **INFRA-04:** Supabase schema, RLS policies, and setup instructions exist before feature code depends on remote data.
- [ ] **INFRA-05:** App state store persists household context locally without storing auth tokens in AsyncStorage.

### Household and Auth

- [ ] **AUTH-01:** Mother or partner can sign up and sign in with email/password.
- [ ] **AUTH-02:** First-time user selects role: mother or partner.
- [ ] **AUTH-03:** User can create a household and receive a short invite code.
- [ ] **AUTH-04:** Second user can join an existing household with the invite code.
- [ ] **AUTH-05:** Signed-in session persists across app restarts using secure auth storage.
- [ ] **AUTH-06:** Household cannot exceed two users.

### Home

- [ ] **HOME-01:** Home shows current stage/week status after the stage and due date are confirmed.
- [ ] **HOME-02:** Home shows trimester or stage progress in a way that remains valid for pregnancy and postpartum.
- [ ] **HOME-03:** Home shows top incomplete household todos and syncs changes in real time.
- [ ] **HOME-04:** Home shows a recent health-log summary.
- [ ] **HOME-05:** Quick actions navigate to symptom logging, todo creation, journal, and relevant tracking tools.

### Logging and Tracking

- [ ] **TRAK-01:** User can log symptoms, mood, energy, notes, and optional weight.
- [ ] **TRAK-02:** User can add and complete shared todos.
- [ ] **TRAK-03:** User can log kick sessions with count, timing, and notes.
- [ ] **TRAK-04:** User can run a contraction timer fully offline, including persisted timing state.
- [ ] **TRAK-05:** Completed offline contraction sessions sync when network access returns.

### Journal, Partner, and Appointments

- [ ] **SCRN-01:** Users can create and view shared journal entries grouped by week or stage.
- [ ] **SCRN-02:** Users can view health-log history for their household.
- [ ] **SCRN-03:** Partner screen provides timely support context and shared household actions.
- [ ] **APPT-01:** Users can create and view household appointments.
- [ ] **APPT-02:** Upcoming appointments are visible from home or a dedicated appointments flow.

## Candidate v1.5 / v2

- [ ] **INTG-01:** Google Calendar sync for household appointments.
- [ ] **INTG-02:** Push notifications for partner-added todos and appointments.
- [ ] **INTG-03:** AI-generated weekly content or suggested todos.
- [ ] **INTG-04:** Wearable integrations such as Oura or Apple Watch.
- [ ] **POST-01:** Postpartum feeding, sleep, diaper, pediatrician, and baby milestone tracking.

## Explicitly Out of Scope for Initial Build

- Public distribution.
- Multi-household administration.
- Firebase registry app migration.
- Browser-only static HTML artifact.
- Importing old git history.
