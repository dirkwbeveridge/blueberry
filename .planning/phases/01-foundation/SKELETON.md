# Walking Skeleton: Phase 1 Foundation

## What This Proves

Phase 1 proves that Blueberry has a stable app shell and infrastructure baseline before feature work starts.

The skeleton is complete when:

- The Expo app runs from the repository root.
- Expo Router resolves auth, tabs, and modal routes.
- TypeScript strict mode passes.
- Shared design tokens and UI primitives can be imported anywhere.
- Shared domain types exist.
- Supabase client initialization is present but does not require real credentials just to render placeholders.
- Supabase schema SQL and setup instructions exist.
- Household state persists locally through Zustand and AsyncStorage.

## Route Skeleton

- `/` root layout redirects based on placeholder auth readiness.
- `/(auth)/login` placeholder.
- `/(tabs)/home` placeholder.
- `/(tabs)/journal` placeholder.
- `/(tabs)/health` placeholder.
- `/(tabs)/kicks` placeholder.
- `/(tabs)/partner` placeholder.
- `/(modals)/log-symptom` placeholder.
- `/(modals)/add-todo` placeholder.
- `/(modals)/contraction-timer` placeholder.

## File Skeleton

- `app/` routes and layouts.
- `components/ui/` shared primitives.
- `components/shared/LoadingScreen.tsx`.
- `constants/theme.ts`.
- `constants/babyDevelopment.ts`.
- `types/index.ts`.
- `lib/supabase.ts`.
- `lib/pregnancy.ts`.
- `store/household.ts`.
- `hooks/useHousehold.ts`.
- `hooks/useRealtimeSync.ts`.
- `supabase-schema.sql`.
- `SUPABASE-SETUP.md`.
- `README.md`.
- `.env.example`.

## Verification

Run after implementation:

```bash
npm run typecheck
npm run lint
npx expo start
```

Manual verification:

- App opens in Expo Go or simulator without red screen.
- Every tab placeholder renders.
- Each modal route can be opened by direct navigation during development.
- `supabase-schema.sql` includes RLS enablement and policies for household-owned data.
- Store hydration does not include auth token data.
