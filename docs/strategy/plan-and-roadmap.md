# Blueberry Plan And Roadmap

Date: 2026-06-21
Status: Updated sequencing for accelerated non-AI Phase 1 completion

## Milestone Dates

- Phase 0 (Rebaseline and scope lock): 2026-06-22 to 2026-06-23
- Phase 1 (Non-AI product readiness sprint): 2026-06-24 to 2026-06-26
- Phase 2 (AI alpha and controlled beta): 2026-06-29 to 2026-07-24
- Phase 3 (AI commercial readiness): 2026-07-27 to 2026-08-21
- Phase 4 (Differentiation expansion): starts 2026-08-24

## 1) Outcome Targets

Primary outcomes:

1. Ship differentiated pregnancy companion value (partner-first, household-aware).
2. Complete non-AI Phase 1 by next Friday.
3. Build decision-grade competitor intelligence loop for ongoing positioning updates.
4. Launch safe and commercially viable AI chat capability in Phase 2.

## 2) Plan At A Glance

### Workstream A: Product Differentiation

- Role-aware partner experience as a flagship flow.
- Pregnancy-to-postpartum continuity architecture and messaging.
- High-readability, low-friction screen design for late-night use.
- Phase 1 priority workstream.

### Workstream B: AI Capability

- Managed proxy infrastructure and policy enforcement.
- Contextual response quality and safety instrumentation.

- Monetization packaging and entitlement controls.
- Starts in Phase 2.

### Workstream C: Competitive Intelligence

- Ongoing App Store signal monitoring and review coding.
- Quarterly visual benchmark refresh.
- Pricing and paywall intelligence updates.
- Supports Phase 1 positioning and App Store readiness.

## 3) Phased Roadmap

## Phase 0 (2026-06-22 to 2026-06-23): Rebaseline And Scope Lock

Goals:

- Lock next-Friday non-AI completion scope with low rework risk.

Deliverables:

- Phase 1 must-have list with acceptance criteria.
- Day-by-day delivery plan through next Friday.
- Competitive evidence package with confidence labels.

Exit criteria:

- Phase 1 scope freeze approved.
- Deferred AI items explicitly moved to Phase 2 backlog.

## Phase 1 (2026-06-24 to 2026-06-26): Non-AI Product Readiness Sprint

Goals:

- Ship the non-AI experience that differentiates Blueberry for two-user households.
- Improve reliability and polish in pregnancy-core flows.
- Include full newborn-care tracking and calendar visualization as a Phase 1 must-have.

Build scope:

- Partner-first UX completion (role-aware views, partner feed clarity, shared context quality).
- Pregnancy-core tracker quality pass (symptoms, kicks, contractions, todos, appointments).
- Full household tracking coverage for newborn and postpartum operations: sleep, pumping, feeding, solids, and diaper changes.
- Calendar visualization for all tracking events with day, week, and month views, category filters, and clear visual event encoding.
- Household stability pass (invite/join flow reliability, sync confidence, error handling).
- Notifications and reminders hardening for current non-AI features.
- Performance and quality improvements on key daily screens.
- App Store and positioning artifacts for partner-first narrative.

Measurement:

- Crash-free sessions and high-severity bug count.
- Daily active usage across mother and partner roles.
- Completion rates for core logging flows.
- Completion rates for sleep, pumping, feeding, solids, and diaper logging flows.
- Calendar engagement and usability for newborn-care visualization (day/week/month coverage and filter usage).
- Qualitative polish score from internal UAT checklist.

Exit criteria:

- No unresolved P0/P1 defects in Phase 1 scope.
- Core non-AI flows pass UAT checklist.
- Full tracking and calendar visualization pass UAT for sleep, pumping, feeding, solids, and diaper changes.
- Release candidate is ready for controlled rollout.

## Phase 2 (2026-06-29 to 2026-07-24): AI Alpha And Controlled Beta

Goals:

- Build and validate AI capability on top of a stable non-AI foundation.

Build scope:

- Supabase Edge AI proxy and provider abstraction.
- Context injection from household and stage data.
- Session/message/usage/safety persistence.
- Feature flag + kill switch.
- Minimal chat UI and feedback controls.
- Entitlements and free-tier AI preview limits.
- Basic cache for repeat low-risk prompts.

Measurement:

- AI activation rate, repeat use, conversion intent, cost per active household.
- p95 latency, safety trigger frequency, and failure rate.

Exit criteria:

- Unit economics in-range and conversion signal above agreed threshold.
- Stable reliability and no unresolved high-severity safety defects.

## Phase 3 (2026-07-27 to 2026-08-21): AI Commercial Readiness

Goals:

- Prepare for broad rollout and app store policy defensibility.

Build scope:

- Final pricing plan and paywall copy.

- Alerting dashboards for cost, safety, and reliability.
- Incident response runbook for AI safety and outage scenarios.
- Legal/privacy copy updates and in-app disclosure pass.

Measurement:

- Gross margin forecast under low/base/high usage.
- Support ticket rate and top complaint categories.

Exit criteria:

- Go/no-go review approved by product, engineering, and compliance.

## Phase 4 (Starting 2026-08-24): Differentiation Expansion

Goals:

- Move from parity-plus to clear category leadership in partner intelligence.

Build scope:

- Role-personalized AI tone and prompts.
- Proactive partner nudges and weekly summaries.
- Stage-transition automation from pregnancy to postpartum handoff.

- Widget and lock-screen touchpoints.

Measurement:

- Retention lift among dual-user households.
- Partner engagement depth and shared-action completion.

## 4) Competitor Research Completion Checklist (Operational)

To complete the remaining "full research" items beyond current evidence:

1. Capture in-app paywall and IAP SKU screenshots for each core competitor.
2. Expand review sample coding from keyword tags to manual coded taxonomy.
3. Add Google Play parity checks for messaging and monetization differences.
4. Refresh visual benchmark quarterly in `Design Samples/Competitor Captures/`.
5. Update `docs/strategy/competitor-appstore-metadata.json` monthly.

## 5) Decision Gates

Gate A (end of Phase 0):

- Confirm locked non-AI Phase 1 scope and next-Friday release criteria.

Gate B (end of Phase 1):

- Confirm non-AI release readiness and proceed to AI build.

Gate C (end of Phase 2):

- Confirm AI safety and technical readiness for commercial packaging.

Gate D (end of Phase 3):

- Confirm GA launch readiness based on reliability and economics.

## 6) Dependencies

Technical dependencies:

- Stable auth + household context retrieval.
- Tracking schema and realtime support for newborn-care event types (sleep, pumping, feeding, solids, diapers).
- Calendar query and rendering performance that remains responsive at household-scale event volume.
- Feature flagging mechanism for staged rollout.
- Notification and reminder infrastructure reliability.

Operational dependencies:

- UAT ownership and rapid bug triage through next Friday.
- App Store messaging and screenshot updates for partner-first positioning.
- AI policy and legal review begins in Phase 2.

## 7) Recommended Next 10 Execution Tasks

1. Freeze Phase 1 must-have scope and acceptance criteria today.
2. Finalize data model and API contracts for sleep, pumping, feeding, solids, and diaper tracking.
3. Implement and validate day/week/month calendar visualization with category filters for all newborn-care events.
4. Complete partner-first UX polish pass on primary household screens, including newborn-care calendar journeys.
5. Harden invite, join, and cross-device sync reliability paths.
6. Run full tracker QA across pregnancy and newborn-care flows (symptoms, kicks, contractions, todos, appointments, sleep, pumping, feeding, solids, diapers).
7. Resolve all open P0 and P1 defects in the Phase 1 scope.
8. Run performance pass on home, partner, and logging-critical screens, including calendar density scenarios.
9. Finalize notifications and reminder reliability checks for both pregnancy and newborn-care events.
10. Prepare App Store narrative and screenshots that highlight partner-first plus full household tracking/calendar value.
