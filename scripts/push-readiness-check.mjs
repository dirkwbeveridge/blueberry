#!/usr/bin/env node

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

loadDotEnvLocal();

const requiredEnvVars = ['EXPO_PUBLIC_SUPABASE_URL'];

const requiredSupabaseFunctionSecrets = [
  'APNS_PRIVATE_KEY',
  'APNS_KEY_ID',
  'APNS_TEAM_ID',
  'APNS_BUNDLE_ID',
  'APNS_ENV',
  'PUSH_FUNCTION_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_URL',
];

const requiredFiles = [
  'supabase/functions/send-apns-notification/index.ts',
  'supabase/functions/dispatch-event-notification/index.ts',
  'supabase/migrations/20260620100000_create_device_push_tokens.sql',
  'SUPABASE-SETUP.md',
];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

console.log('\nPush Notifications Readiness Check\n');

let envOk = true;
console.log('Environment variables');
for (const key of requiredEnvVars) {
  const present = Boolean(process.env[key]);
  if (!present) envOk = false;
  console.log(`${present ? 'PASS' : 'FAIL'}  ${key}`);
}

console.log('\nSupabase function secrets (for remote function env)');
for (const key of requiredSupabaseFunctionSecrets) {
  const present = Boolean(process.env[key]);
  if (!present) envOk = false;
  console.log(`${present ? 'PASS' : 'FAIL'}  ${key}`);
}

const legacyAuthKeyPresent = Boolean(process.env.APNS_AUTH_KEY);
if (legacyAuthKeyPresent) {
  console.log('\nINFO  APNS_AUTH_KEY is set but not used by current functions (APNS_PRIVATE_KEY is authoritative).');
}

let filesOk = true;
console.log('\nRequired files');
for (const file of requiredFiles) {
  const present = exists(file);
  if (!present) filesOk = false;
  console.log(`${present ? 'PASS' : 'FAIL'}  ${file}`);
}

if (envOk && filesOk) {
  console.log('\nAll checks passed.\n');
  process.exit(0);
}

console.log('\nReadiness check failed. Missing items must be fixed before deployment.\n');
process.exit(1);
