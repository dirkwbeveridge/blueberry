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

const requiredEnvVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
];

const optionalEnvVars = [
  'EXPO_PUBLIC_GOOGLE_CLIENT_ID',
];

const requiredFiles = [
  'supabase-schema.sql',
  'lib/supabase.ts',
  'hooks/useRealtimeSync.ts',
  'SUPABASE-SETUP.md',
  'docs/supabase-golden-path.md',
  'docs/phase1-golden-path-uat.md',
];

const requiredPushFiles = [
  'supabase/functions/send-apns-notification/index.ts',
  'supabase/migrations/20260620100000_create_device_push_tokens.sql',
];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function checkIncludes(source, expected, label) {
  const ok = source.includes(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  return ok;
}

console.log('\nSupabase Golden Path Readiness Check\n');

let envOk = true;
console.log('Required environment variables');
for (const key of requiredEnvVars) {
  const present = Boolean(process.env[key]);
  if (!present) envOk = false;
  console.log(`${present ? 'PASS' : 'FAIL'}  ${key}`);
}

console.log('\nOptional environment variables');
for (const key of optionalEnvVars) {
  const present = Boolean(process.env[key]);
  console.log(`${present ? 'PASS' : 'WARN'}  ${key}${present ? '' : ' (only needed for Google Calendar flows)'}`);
}

let filesOk = true;
console.log('\nRequired files');
for (const file of requiredFiles) {
  const present = exists(file);
  if (!present) filesOk = false;
  console.log(`${present ? 'PASS' : 'FAIL'}  ${file}`);
}

let pushFilesOk = true;
console.log('\nPush-related repo assets');
for (const file of requiredPushFiles) {
  const present = exists(file);
  if (!present) pushFilesOk = false;
  console.log(`${present ? 'PASS' : 'FAIL'}  ${file}`);
}

let sourceOk = filesOk;
if (filesOk) {
  console.log('\nSource consistency checks');

  const schema = read('supabase-schema.sql');
  const supabaseClient = read('lib/supabase.ts');
  const realtimeHook = read('hooks/useRealtimeSync.ts');

  const checks = [
    checkIncludes(supabaseClient, 'EXPO_PUBLIC_SUPABASE_URL', 'lib/supabase.ts reads EXPO_PUBLIC_SUPABASE_URL'),
    checkIncludes(supabaseClient, 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'lib/supabase.ts reads EXPO_PUBLIC_SUPABASE_ANON_KEY'),
    checkIncludes(schema, 'create or replace function public.create_household', 'schema defines create_household RPC'),
    checkIncludes(schema, 'create or replace function public.join_household_by_code', 'schema defines join_household_by_code RPC'),
    checkIncludes(schema, 'alter publication supabase_realtime add table todos;', 'schema publishes todos to Realtime'),
    checkIncludes(schema, 'alter publication supabase_realtime add table health_logs;', 'schema publishes health_logs to Realtime'),
    checkIncludes(schema, 'alter publication supabase_realtime add table journal_entries;', 'schema publishes journal_entries to Realtime'),
    checkIncludes(schema, 'alter publication supabase_realtime add table appointments;', 'schema publishes appointments to Realtime'),
    checkIncludes(schema, 'alter publication supabase_realtime add table baby_logs;', 'schema publishes baby_logs to Realtime'),
    checkIncludes(schema, 'create table device_push_tokens', 'schema includes device_push_tokens'),
    checkIncludes(schema, 'create table notification_preferences', 'schema includes notification_preferences'),
    checkIncludes(realtimeHook, "event: 'INSERT'", 'realtime hook subscribes to inserts'),
    checkIncludes(realtimeHook, "event: 'UPDATE'", 'realtime hook subscribes to updates'),
    checkIncludes(realtimeHook, "event: 'DELETE'", 'realtime hook subscribes to deletes'),
  ];

  sourceOk = checks.every(Boolean);
}

console.log('\nBlocked external verification');
console.log('INFO  APNs end-to-end verification remains blocked until Apple Developer approval is complete.');

if (envOk && filesOk && pushFilesOk && sourceOk) {
  console.log('\nAll local readiness checks passed.\n');
  process.exit(0);
}

console.log('\nReadiness check failed. Fix the missing local prerequisites before the next manual verification pass.\n');
process.exit(1);
