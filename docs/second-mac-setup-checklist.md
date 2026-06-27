# Blueberry Second Mac Setup Checklist

Use this on the second Mac to get Blueberry running in Xcode with fewer local
restrictions than the current machine.

This checklist assumes:

- you will pull from GitHub
- you want to build and test iOS locally
- you may want to use a physical iPhone later
- Apple Developer approval is still pending, so APNs production delivery is not
  a release gate yet

## 1. Install base tools

Run these first on the second Mac.

### 1.1 Install Xcode

1. Install Xcode from the Mac App Store.
2. Open Xcode once and let it finish first-run setup.

Then run:

```bash
sudo xcodebuild -runFirstLaunch
sudo xcodebuild -license accept
```

### 1.2 Install Command Line Tools

```bash
xcode-select --install
```

If they are already installed, macOS will say so.

### 1.3 Install Homebrew

If Homebrew is not already installed:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then load it into your shell:

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
```

If the Mac is Intel, use the path Homebrew prints during install instead.

### 1.4 Install development dependencies

```bash
brew install node watchman cocoapods cmake
```

Why these matter:

- `node`: required for Expo / npm
- `watchman`: recommended for React Native / Expo file watching
- `cocoapods`: required for iOS native dependencies
- `cmake`: required by the Hermes pod path that blocked the first machine

Verify:

```bash
node -v
npm -v
pod --version
cmake --version
xcodebuild -version
```

## 2. Clone the repo

Pick a working folder and clone the repo:

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone https://github.com/dirkwbeveridge/blueberry.git
cd blueberry
git checkout main
git pull origin main
```

Verify branch state:

```bash
git status --short
git branch --show-current
```

Expected:

- current branch is `main`
- working tree is clean

## 3. Create local env

Copy the example env file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-ios-client-id
```

Notes:

- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is only required if you want to verify Google
  Calendar sync
- do not put service-role secrets into `.env.local`

## 4. Prepare Supabase before app testing

Before launching the app, apply the schema to the UAT Supabase project.

Use:

- [`supabase-schema.sql`](../supabase-schema.sql)
- [`SUPABASE-SETUP.md`](../SUPABASE-SETUP.md)
- [`docs/phase1-golden-path-uat.md`](./phase1-golden-path-uat.md)

Minimum requirement:

1. Open the target Supabase project.
2. Paste `supabase-schema.sql` into the SQL editor.
3. Run it once.
4. Confirm the five Realtime tables are present:
   - `todos`
   - `health_logs`
   - `journal_entries`
   - `appointments`
   - `baby_logs`

## 5. Install repo dependencies

From the repo root:

```bash
npm ci
```

Then run the local checks:

```bash
npm run typecheck
npm run lint
npm run push:readiness
node scripts/integration-smoke.mjs
```

If you plan to verify Google Calendar sync too:

```bash
node scripts/google-calendar-7a-readiness.mjs
```

## 6. Generate and build the iOS project

Blueberry is Expo-managed. The native `ios/` workspace is generated during the
run flow.

From the repo root:

```bash
npx expo run:ios
```

What this should do:

1. generate `ios/` if needed
2. install Pods
3. build the iOS app
4. launch the simulator

If that succeeds, you now have:

- `ios/Blueberry.xcworkspace`

## 7. Open in Xcode

From the repo root:

```bash
open ios/Blueberry.xcworkspace
```

In Xcode:

1. Select the `Blueberry` scheme.
2. Select an iPhone simulator first.
3. Press Run.

Recommended first simulator:

- iPhone 16 or newest available standard iPhone simulator

## 8. If you want to run on a physical iPhone

Do this only after simulator build is working.

### 8.1 Connect your phone

1. Plug in the iPhone.
2. Trust the Mac on the phone.
3. Enable Developer Mode on the device if prompted.

### 8.2 Sign into Xcode

In Xcode:

1. `Xcode -> Settings -> Accounts`
2. Sign in with your Apple ID

### 8.3 Set signing

In the project target:

1. Open `Signing & Capabilities`
2. Check `Automatically manage signing`
3. Select your team
4. Confirm the bundle identifier is valid for your account if Xcode asks

Then select the physical iPhone as the run target and press Run.

## 9. Manual test order on the second Mac

Use this exact order so earlier failures do not contaminate later tests.

### 9.1 Branch health gate

```bash
npm run typecheck
npm run lint
```

### 9.2 Auth and household bootstrap

1. Launch the app.
2. Sign up with a fresh test account.
3. Choose role.
4. Create a household.
5. Confirm you land in the main tabs.
6. Capture the invite code.

### 9.3 Partner join flow

Use a second account and ideally a second device or simulator session.

1. Sign up or sign in as the partner.
2. Join with the invite code.
3. Confirm both users are now in the same household.

### 9.4 Shared CRUD and realtime

Verify:

1. create a todo
2. create an appointment
3. add a health log
4. add a journal entry
5. if in postpartum mode, add a baby log

Then verify on the second client that changes appear without manual reload for:

- todos
- health logs
- journal entries
- appointments
- baby logs

### 9.5 Role/privacy contract

Verify:

- mother sees `Health` in tab slot 2
- partner sees `Together` in tab slot 2
- partner does not see raw mother recovery logs

### 9.6 Family Mode / postpartum surfaces

Use `More -> Begin Family Mode` if needed.

Verify:

- Baby tab is visible in postpartum
- Home postpartum variant renders
- Health postpartum variant renders
- Together postpartum variant renders
- handoff actions route to `Together`

### 9.7 Notifications on a real iPhone

Only on a physical device:

1. Open `More -> Notifications`
2. Grant permission
3. Sync token
4. Save preferences
5. Create an appointment more than 24 hours in the future
6. Confirm local reminder scheduling path works

Do not use this as proof of production APNs delivery yet.

### 9.8 Google Calendar 7a verification

Only if you have the verifier credentials and Google access token.

Run:

```bash
GC7A_USER_EMAIL='verifier@example.com' \
GC7A_USER_PASSWORD='your-password' \
GC7A_GOOGLE_ACCESS_TOKEN='ya29.your-token' \
node scripts/verify-google-calendar-7a.mjs
```

Use this runbook:

- [`docs/google-calendar-7a-verification.md`](./google-calendar-7a-verification.md)

## 10. Claude Code plugins on the second Mac

Required:

- none

Recommended:

1. `build-ios-apps`
   - Best plugin to use for simulator/device build workflows, iOS debugging,
     and structured iPhone app testing.
2. `github`
   - Useful for push, PR, branch, and repo coordination directly from Claude
     Code.
3. `superpowers`
   - Useful for parallel agents, code review, and multi-step execution.

Nice to have, not required:

1. `chrome`
   - Helpful only if you want browser-based inspection or auxiliary tooling.
2. `computer-use`
   - Useful if you want UI-driving automation outside the iOS simulator tools.

My recommendation:

- install `build-ios-apps`
- install `github`
- install `superpowers`

That is the smallest high-value set for this repo.

## 11. Known limitations on the second Mac

Still blocked even on a better machine:

- Apple Developer approval is still pending
- APNs production delivery should not be treated as complete
- web is not a Phase 1 target

Not blocked if the second Mac is properly set up:

- Xcode simulator builds
- Expo native build generation
- CocoaPods install
- Hermes/CMake dependency path
- local device testing

## 12. Fast recovery commands

If the native project gets into a bad state:

```bash
rm -rf ios
npx expo run:ios
```

If Pods drift:

```bash
cd ios
pod install --repo-update
cd ..
```

If npm deps drift:

```bash
rm -rf node_modules package-lock.json
npm install
```

Use the destructive recovery steps only if the normal path fails.
