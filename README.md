# Blueberry

Blueberry is a private two-user pregnancy companion app for mother and partner. This repository is the clean Codex-owned implementation.

## Current Phase

The active implementation now lives at this repository root. The later
prototype work from `Blueberry App/blueberry` has been consolidated here.

- Expo SDK 54 root-level app scaffold.
- Expo Router auth flow, tab navigation, and modal screens.
- TypeScript strict mode.
- Blueberry design tokens, shared UI primitives, and home components.
- Supabase setup artifacts plus the prototype migration SQL.
- Zustand household store with AsyncStorage persistence.
- Initial product screens for Home, Weeks, Health, Plan, and Partner.

## Run

```bash
npm run typecheck
npm run lint
npx expo start --localhost --port 8081
```

In this Codex sandbox, local port binding requires elevated execution. Running Expo without that permission can fail during port scanning.

## Environment

Copy `.env.example` to `.env.local` and fill:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Auth and data flows expect the Supabase schema to be deployed before golden-path testing.

## Verification Notes

- TypeScript and lint currently pass.
- `npm ci` repairs local dependencies in this folder.
- Metro previously started successfully outside the sandbox.
- Browser web rendering currently fails with `Cannot use 'import.meta' outside a module`; web is not a Phase 1 target for this mobile app.
- iOS simulator launch was not verified because `xcrun simctl help` exits with code 72 in this environment.

## Planning

GSD planning lives in `.planning/`. Legacy Claude/Firebase registry artifacts are intentionally excluded.
