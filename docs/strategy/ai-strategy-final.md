# Blueberry AI Strategy Final

Date: 2026-06-21
Owner: Product + Engineering
Status: Final recommendation for implementation start

## 1) Decision Summary

Recommended model:
- Blueberry-managed AI proxy architecture (no user-provided API keys).
- AI as a paid value driver with a generous free preview.
- Household-aware contextual responses with strict safety and medical boundaries.

Why:
- BYOK creates high user friction and weakens product trust in this category.
- Managed architecture supports controls needed for safety, cost, and monetization.
- Competitive evidence shows paid AI can convert if context quality is high.

## 2) Product Principles

1. Companion, not clinician.
2. Context before creativity.
3. Safety over verbosity.
4. Transparent privacy controls.
5. Cost discipline by default.

## 3) Technical Architecture

### Request flow
1. Blueberry app sends prompt to Supabase Edge Function.
2. Edge Function resolves household-scoped context (week, recent logs, stage, role).
3. Policy layer applies safety and scope checks.
4. Model provider call executes.
5. Post-response safety pass runs before delivery.
6. Usage, cost, latency, and safety events are stored.

### Baseline components
- `supabase/functions/ai-chat` (orchestrator)
- Policy engine (pre/post checks)
- Provider adapter (vendor-swappable)
- Usage metering tables
- Feature flag and kill switch

### Data model additions
- `ai_chat_sessions`
- `ai_chat_messages`
- `ai_chat_usage_events`
- `ai_chat_safety_events`

All tables remain household-scoped with RLS.

## 4) Safety And Trust Controls

Required controls for first release:
- Medical disclaimer in interface and high-risk responses.
- High-risk keyword and intent escalation flow.
- Prohibited output classes (diagnosis certainty, medication dosing instructions).
- Inline user feedback on response quality/safety.
- Audit trail for moderation tuning.

Guardrail behavior:
- If uncertain or risk-triggered, instruct user to contact OB/GYN or emergency services as appropriate.
- Never present itself as a medical professional.

## 5) Cost Model And Unit Economics

### Working token assumptions per turn
- System and policy prompt: ~600 input tokens
- Context injection: ~400 input tokens
- Recent memory window: ~800 input tokens
- User prompt: ~50 input tokens
- Response: ~400 output tokens

Estimated total: ~1,850 input + ~400 output tokens per turn.

Using the pricing assumptions from your uploaded strategy brief:
- Estimated turn cost: ~0.011 USD.

Monthly AI cost scenarios per active premium household:
- Light (12 turns): ~0.13 USD
- Typical (28 turns): ~0.31 USD
- Heavy (60 turns): ~0.66 USD

With 30 percent cache hit rate:
- Effective cost reduction ~20 to 30 percent depending on prompt mix.

Business implication:
- AI cost is low relative to likely subscription price points.
- Main economics risk is not token price, but uncontrolled usage and poor conversion.

## 6) Monetization Design

Recommended commercial packaging:
- Free: core tracking + limited AI preview (for example 5 prompts/week).
- Premium: full AI access under fair-use cap (for example 10 prompts/day).

Target price band for Premium:
- 5.99 to 7.99 USD monthly, with annual discount option.

Why this structure:
- Simpler than three-tier ladders.
- Captures AI value while avoiding immediate paywall rejection.
- Creates clear upgrade reason without crippling free utility.

Do not launch with:
- Overage billing complexity in v1.
- User-managed API keys.
- Multiple AI tiers before conversion data exists.

## 7) KPI Framework

Product KPIs:
- AI weekly active households
- Sessions per active household
- Follow-up question rate (engagement proxy)
- Safety intervention rate
- User-rated helpfulness

Commercial KPIs:
- Free to Premium conversion among AI users
- Net revenue per Premium household
- AI cost per Premium household
- Gross margin after store fees and AI costs

Reliability KPIs:
- p95 latency
- Provider error rate
- fallback response rate

## 8) Key Risks And Mitigations

1. Runaway usage cost
- Mitigation: hard daily caps + per-household throttling + cache.

2. Harmful or incorrect advice
- Mitigation: conservative prompt policy, high-risk routing, user reporting, rapid rollback.

3. App review and policy rejection risk
- Mitigation: explicit companion framing, no diagnostic claims, transparent disclaimers.

4. Weak willingness to pay
- Mitigation: free AI trial volume, clear value messaging, partner-focused use cases.

5. Vendor concentration
- Mitigation: provider adapter abstraction and fallback pathway.

## 9) Implementation Recommendation

Start implementation now with:
1. Managed proxy edge function.
2. Context assembly from existing household and tracking data.
3. Metering and safety event schema.
4. Limited alpha rollout with feature flags.

Hold until beta evidence:
- Final paywall copy
- Final daily cap and fair-use thresholds
- Annual pricing discount depth

Bottom line:
Blueberry should treat AI as a contextual premium capability, not a generic chatbot add-on.
