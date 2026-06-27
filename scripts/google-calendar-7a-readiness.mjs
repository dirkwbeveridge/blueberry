#!/usr/bin/env node

/**
 * Google Calendar 7a readiness check.
 *
 * Non-destructive gate that validates required environment/config before
 * running the full deterministic verifier.
 *
 * Usage:
 *   node scripts/google-calendar-7a-readiness.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadDotEnvLocal() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function isPresent(key) {
  return Boolean(process.env[key] && process.env[key].trim().length > 0);
}

function getGoogleClientIdKind(value) {
  if (!value) return 'missing';
  if (value.endsWith('.apps.googleusercontent.com')) {
    if (value.includes('.apps.googleusercontent.com')) return 'google-client-id';
  }
  return 'unknown-format';
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

loadDotEnvLocal();

const requiredEnvVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
];

const requiredFiles = [
  'lib/googleAuth.ts',
  'lib/googleCalendarApi.ts',
  'lib/googleCalendarSyncPrefs.ts',
  'hooks/useGoogleCalendarSync.ts',
  'app/(modals)/google-calendar-connect.tsx',
  'app/(modals)/add-appointment.tsx',
  'app/(modals)/edit-appointment.tsx',
  'app/(tabs)/todo.tsx',
  'supabase-schema.sql',
];

console.log('\nGoogle Calendar 7a Readiness Check\n');

let envOk = true;
console.log('Environment variables');
for (const key of requiredEnvVars) {
  const present = isPresent(key);
  if (!present) envOk = false;
  console.log(`${present ? 'PASS' : 'FAIL'}  ${key}`);
}

const clientIdKind = getGoogleClientIdKind(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID);
if (clientIdKind === 'google-client-id') {
  console.log('PASS  EXPO_PUBLIC_GOOGLE_CLIENT_ID format looks valid');
} else if (clientIdKind === 'missing') {
  console.log('FAIL  EXPO_PUBLIC_GOOGLE_CLIENT_ID format check skipped (missing value)');
  envOk = false;
} else {
  console.log('WARN  EXPO_PUBLIC_GOOGLE_CLIENT_ID present but format is unusual');
}

let filesOk = true;
console.log('\nRequired files');
for (const file of requiredFiles) {
  const present = exists(file);
  if (!present) filesOk = false;
  console.log(`${present ? 'PASS' : 'FAIL'}  ${file}`);
}

if (envOk && filesOk) {
  console.log('\nAll readiness checks passed.\n');
  process.exit(0);
}

console.log('\nReadiness check failed. Fix FAIL items before running gc:7a:verify.\n');
process.exit(1);
