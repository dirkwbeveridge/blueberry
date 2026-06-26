# Google Calendar Verification

This slice is intentionally scoped to repo-local confidence plus a targeted manual device pass. It does not require Apple portal access.

## What changed on 2026-06-26

- Linked Google events are no longer treated as missing solely because they were absent from the bounded `list` response.
- The sync engine now performs a direct `get by id` check before applying destructive `google_wins` deletes or `blueberry_wins` recreates.
- Appointments with invalid local timestamps are skipped instead of being pushed with malformed dates.
- Refresh-token failures only clear stored Google tokens when Google explicitly returns `invalid_grant`. Transient refresh failures now surface as sync errors instead of silently disconnecting the user.

## Repo-local verification

Run:

```bash
npm run typecheck
npm run lint
```

Expected:

- TypeScript passes with the current Google Calendar changes.
- Expo lint passes with the current Google Calendar changes.

## Manual device pass

### 1. Baseline connect

1. Open `More -> Google Calendar`.
2. Confirm disconnected state renders without `EXPO_PUBLIC_GOOGLE_CLIENT_ID` warnings when local env is present.
3. Connect with a test Google account.
4. Confirm status switches to `Connected`.

### 2. Sync window hardening

Goal: verify a linked event outside the bounded list window is not treated as deleted.

1. Start with a linked Blueberry appointment that already has `google_event_id`.
2. Move the Google event far enough away that it may fall outside the normal list range for linked appointments.
3. Trigger `Sync now`.
4. Confirm Blueberry does not delete the local appointment under `google_wins`.
5. Confirm Blueberry does not create a duplicate Google event under `blueberry_wins`.

### 3. True missing-event handling

1. Delete a linked Google event directly in Google Calendar.
2. Run `Sync now`.
3. Under `google_wins`, confirm the linked local appointment is removed.
4. Under `blueberry_wins`, confirm the appointment is recreated in Google and re-linked locally.

### 4. Refresh-token behavior

Goal: distinguish revoked credentials from transient failures.

1. Revoke the app from the Google account security page, or otherwise invalidate the refresh token.
2. Run `Sync now`.
3. Confirm the sync reports the account as no longer connected after `invalid_grant`.
4. For transient offline/network failure, confirm sync fails visibly but the connected state remains until a real token revocation occurs.

## Remaining limits

- There is still no automated Google sync integration harness in this repo.
- Manual verification is still required for real OAuth/device behavior.
- Conflict resolution remains whole-record, not per-field.
