# Blueberry AI Chat Implementation Spec (v0)

Date: 2026-06-21
Owner: Product + Engineering
Status: Draft for implementation kickoff

## 1) Objective

Launch a safe, contextual AI chat assistant in Blueberry that improves guidance quality and premium conversion while maintaining positive unit economics.

## 2) Product Scope

### Core Jobs to Be Done
- Help parents interpret patterns from tracked data quickly.
- Provide stage-aware guidance (pregnancy, postpartum).
- Support partner handoff and shared context in a two-user household.
- Offer emotional reassurance without positioning as medical diagnosis.

### Guardrails
- No diagnosis claims.
- Explicit "not medical advice" framing in high-risk categories.
- Escalation prompts for urgent symptoms or mental health risk language.

## 3) Proposed Architecture (Managed-First)

### Client
- New chat entry point in app navigation.
- Message composer + response stream UI.
- Household-scoped history view.

### Backend
- Supabase Edge Function for orchestration.
- Provider abstraction layer to avoid lock-in.
- Safety policy evaluation before/after model response.

### Data Model Additions (planned)
- ai_chat_sessions
- ai_chat_messages
- ai_chat_usage_events
- ai_chat_safety_events

All tables must remain household-scoped with RLS.

## 4) Entitlements and Monetization

### Principle
No customer BYOK. Blueberry owns provider keys and billing.

### Recommended Packaging
- Free: limited trial interactions (example: 10 messages/month).
- Premium: included monthly bucket (example: 200 messages/month).
- Overages: optional top-up packs or throttled fair-use fallback.

### Cost Recovery Framework
Track and review:
- Cost per message and per active household
- Premium uplift from AI-enabled conversion
- Retention delta for AI-active cohorts

## 5) Unit Economics Template

Model scenarios by household activity:
- Light usage
- Typical usage
- Heavy usage

For each scenario calculate:
- Input/output token cost
- Orchestration cost
- Storage/logging cost
- Gross margin at current plan price

## 6) Deployment Plan

### Stage 1: Internal Alpha
- Team-only users
- Kill switch enabled
- Manual quality audits

### Stage 2: Invite Beta
- Selected households
- Observe conversion + safety + cost trends

### Stage 3: General Availability
- Tiered rollout by percentage
- Weekly cost/safety review until stable

## 7) Telemetry Requirements

Must capture:
- Requests, responses, latency, failures
- Safety interventions and escalation triggers
- Entitlement denials and bucket exhaustion
- Cost metrics by household and plan tier

## 8) Open Decisions

- Final message buckets and overage policy
- Provider selection for pilot
- Whether partner and mother share one thread or role-specific threads
- Exact escalation pathways for sensitive categories
