import * as SecureStore from 'expo-secure-store';

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
] as const;

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export interface GoogleCalendarTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type?: string;
  scope?: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
}

interface GoogleTokenErrorResponse {
  error?: string;
  error_description?: string;
}

export interface GoogleTokenRequestError extends Error {
  code: 'GOOGLE_TOKEN_ERROR';
  status: number;
  errorCode?: string;
}

interface ExchangeCodeParams {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

function getGoogleClientId(): string {
  return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
}

function storageKey(userId: string): string {
  return `google_tokens_${userId}`;
}

function buildTokenError(status: number, message: string, errorCode?: string): GoogleTokenRequestError {
  const error = new Error(message) as GoogleTokenRequestError;
  error.code = 'GOOGLE_TOKEN_ERROR';
  error.status = status;
  error.errorCode = errorCode;
  return error;
}

export async function saveGoogleTokens(userId: string, tokens: GoogleCalendarTokens): Promise<void> {
  await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(tokens));
}

export async function loadGoogleTokens(userId: string): Promise<GoogleCalendarTokens | null> {
  const raw = await SecureStore.getItemAsync(storageKey(userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as GoogleCalendarTokens;
  } catch {
    return null;
  }
}

export async function clearGoogleTokens(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(storageKey(userId));
}

export function isTokenExpired(tokens: GoogleCalendarTokens): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return tokens.expires_at <= nowSeconds + 60;
}

function toStoredTokens(response: GoogleTokenResponse, previous?: GoogleCalendarTokens | null): GoogleCalendarTokens {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token ?? previous?.refresh_token,
    expires_at: nowSeconds + response.expires_in,
    token_type: response.token_type,
    scope: response.scope,
  };
}

async function postTokenForm(body: Record<string, string>): Promise<GoogleTokenResponse> {
  const payload = new URLSearchParams(body).toString();
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload,
  });

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const errorPayload = parsed as GoogleTokenErrorResponse | null;
    const message =
      typeof errorPayload?.error_description === 'string'
        ? errorPayload.error_description
        : `Google token request failed (${response.status})`;
    throw buildTokenError(response.status, message, errorPayload?.error);
  }

  if (!parsed || typeof parsed !== 'object' || !('access_token' in parsed) || !('expires_in' in parsed)) {
    throw new Error('Google token response was missing required fields.');
  }

  const tokenResponse = parsed as GoogleTokenResponse;
  return tokenResponse;
}

export async function exchangeGoogleAuthCode(params: ExchangeCodeParams): Promise<GoogleCalendarTokens> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID.');
  }

  const tokenResponse = await postTokenForm({
    client_id: clientId,
    code: params.code,
    code_verifier: params.codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: params.redirectUri,
  });

  return toStoredTokens(tokenResponse, null);
}

export async function refreshGoogleTokens(userId: string): Promise<GoogleCalendarTokens | null> {
  const existing = await loadGoogleTokens(userId);
  if (!existing?.refresh_token) {
    await clearGoogleTokens(userId);
    return null;
  }

  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID.');
  }

  const tokenResponse = await postTokenForm({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: existing.refresh_token,
  });

  const refreshed = toStoredTokens(tokenResponse, existing);
  await saveGoogleTokens(userId, refreshed);
  return refreshed;
}

function shouldClearTokensAfterRefreshError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'GOOGLE_TOKEN_ERROR' &&
    'errorCode' in error &&
    error.errorCode === 'invalid_grant'
  );
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const tokens = await loadGoogleTokens(userId);
  if (!tokens) return null;

  if (!isTokenExpired(tokens)) {
    return tokens.access_token;
  }

  if (!tokens.refresh_token) {
    await clearGoogleTokens(userId);
    return null;
  }

  try {
    const refreshed = await refreshGoogleTokens(userId);
    return refreshed?.access_token ?? null;
  } catch (error) {
    if (shouldClearTokensAfterRefreshError(error)) {
      await clearGoogleTokens(userId);
      return null;
    }
    throw error;
  }
}
