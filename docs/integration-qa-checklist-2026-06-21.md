# Blueberry Integration QA Checklist (A-F Convergence)

Date: 2026-06-21
Owner: Agent G (Integration QA)
Scope: Same-day validation across parallel A-F workstreams with no broad feature edits.

## 1) Branch Health Gate (must pass first)

- [ ] Run: npm run typecheck
- [ ] Run: npm run lint -- --no-cache
- [ ] Confirm both commands exit 0 before cross-workstream merge.

## 2) A-F Convergence Execution Checklist

Use this as an execution-time gate. Mark each item pass/fail with initials.

### A - Auth + Household Baseline
- [ ] Fresh login succeeds for existing household user.
- [ ] Household bootstrap succeeds (users -> households -> partner lookup chain).
- [ ] No auth-loop routing regressions on app launch.

### B - Role-Aware Navigation + Privacy Surfaces
- [ ] Mother role sees Health in slot 2.
- [ ] Partner role sees Together in slot 2.
- [ ] Partner surfaces do not expose raw mother health logs.

### C - Appointments + Calendar Sync Path
- [ ] Create appointment flow succeeds locally.
- [ ] Edit linked appointment path succeeds.
- [ ] Delete linked appointment path succeeds.
- [ ] Manual sync updates last-sync metadata and does not error.

### D - Notifications + Delivery Preconditions
- [ ] Notification settings surface loads and saves.
- [ ] Token registration path executes without client errors.
- [ ] Push readiness script preconditions are green when deployment secrets are present.

### E - Realtime + Shared Household State
- [ ] To-do changes propagate across household sessions.
- [ ] Journal entry changes propagate across household sessions.
- [ ] Appointment changes propagate across household sessions.
- [ ] No stale UI after foreground resume.

### F - Stage/Flow Guardrails + UX Contract
- [ ] No seeded due date behavior appears in setup.
- [ ] Family Mode trigger path from More remains controlled and explicit.
- [ ] Existing pregnant-stage golden path remains intact.

## 3) Merge-Day Cross-Checks (Fast)

- [ ] Confirm no accidental edits in schema or RLS policies outside intended scope.
- [ ] Confirm no service-role usage in mobile client code.
- [ ] Confirm no web-target fixes are mixed into this mobile-focused merge.
- [ ] Confirm lint/typecheck rerun after final conflict resolution.

## 4) Suggested Command Order

1. npm run typecheck
2. npm run lint -- --no-cache
3. node scripts/integration-smoke.mjs
4. node scripts/integration-smoke.mjs --with-push   (optional, only when push env vars are available)

## 5) Signoff

- QA Executor: __________________
- Date/Time: __________________
- Blockers/Risks Observed: __________________
