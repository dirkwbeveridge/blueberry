# Phase 1 Research: Foundation

**Date:** 2026-05-15  
**Scope:** Expo scaffold, Expo Router, TypeScript, Supabase React Native setup

## Findings

### Expo Scaffold

Current Expo documentation recommends `create-expo-app` for new projects. The default template includes TypeScript configuration and Expo Router, while `blank-typescript` is a lower-level template without navigation configured.

For Blueberry, Expo Router is part of the intended architecture, so the foundation should use the default template unless there is a specific reason to hand-wire router configuration.

### SDK Choice

Expo docs currently note an SDK transition: SDK 54 is the safer choice for Expo Go compatibility, while SDK 55 is available through `--template default@sdk-55`.

Recommendation for this private app:

- Use the current default Expo template first, because fast Expo Go testing matters more than chasing a transition SDK.
- Capture the generated SDK version in `README.md`.
- Avoid pinning the old Claude plan's SDK 51 assumption.

### Supabase React Native

Supabase's React Native quickstart still expects `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, and `react-native-url-polyfill`. For mobile secure auth storage, Phase 1 should install `expo-secure-store` and Phase 2 should wire the auth storage adapter.

### Privacy and RLS

Blueberry stores personal health-adjacent family data. Client-side `household_id` filtering is necessary for query performance and correctness, but RLS must be the actual access-control boundary.

## Planning Implications

- Use root-level Expo app.
- Prefer default Expo template with router over old `blank-typescript` scaffold.
- Keep package list minimal and limited to foundation dependencies.
- Create `supabase-schema.sql` and `SUPABASE-SETUP.md` before any feature depends on remote data.
- Include SQL verification commands and manual Supabase Dashboard checks.

## Sources

- Expo `create-expo-app` docs: https://docs.expo.dev/more/create-expo/
- Expo TypeScript guide: https://docs.expo.dev/guides/typescript/
- Expo Router docs: https://docs.expo.dev/router/introduction/
- Supabase React Native Auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/react-native
