/**
 * Blueberry E2E test suite — runs against the live Supabase project.
 *
 * Usage:  node scripts/test-e2e.mjs
 *
 * Reads credentials from .env.local. Uses timestamped test emails so each run
 * is isolated. Cleans up the household row on completion (cascades to all
 * data tables). Auth users are left in Supabase — delete manually if needed.
 *
 * Exit 0 = all tests passed
 * Exit 1 = one or more failures (failures printed to stdout for agent parsing)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// ─── env ────────────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const lines = readFileSync('.env.local', 'utf-8').split('\n');
    const vars = {};
    for (const line of lines) {
      const eq = line.indexOf('=');
      if (eq > 0) vars[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
    return vars;
  } catch {
    console.error('ERROR: Cannot read .env.local');
    process.exit(1);
  }
}

const env = loadEnv();
const SUPABASE_URL      = env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
  process.exit(1);
}

// ─── test harness ────────────────────────────────────────────────────────────

const RUN   = Date.now();
const EMAIL_MOTHER  = `test-mother-${RUN}@blueberry.dev`;
const EMAIL_PARTNER = `test-partner-${RUN}@blueberry.dev`;
const PASSWORD      = 'BlueberryTest123!';

let passed   = 0;
let failed   = 0;
const failures = [];
let currentSuite = '';

function suite(name) {
  currentSuite = name;
  console.log(`\n📋 ${name}`);
}

function pass(name) {
  console.log(`  ✅ PASS  ${name}`);
  passed++;
}

function fail(name, err) {
  const msg = err?.message ?? err?.error_description ?? JSON.stringify(err) ?? String(err);
  console.log(`  ❌ FAIL  ${name}`);
  console.log(`           ${msg}`);
  failed++;
  failures.push({ suite: currentSuite, name, msg });
}

function skip(name, reason) {
  console.log(`  ⏭  SKIP  ${name} — ${reason}`);
}

// ─── tests ───────────────────────────────────────────────────────────────────

async function runTests() {
  // Shared state
  let motherClient  = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let partnerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  let householdId   = null;
  let inviteCode    = null;
  let motherUserId  = null;
  let partnerUserId = null;

  // ── SUITE: Auth - Mother ──────────────────────────────────────────────────
  suite('Auth — Mother signup');

  {
    const { data, error } = await motherClient.auth.signUp({ email: EMAIL_MOTHER, password: PASSWORD });
    if (error)             { fail('signUp()', error); }
    else if (!data.session){ fail('signUp() → session present', 'data.session is null — email confirmation is probably still enabled. Go to Auth → Sign In / Providers → Email → disable Confirm email.'); }
    else                   { motherUserId = data.user.id; pass('signUp() returns active session'); }
  }

  if (!motherUserId) {
    console.log('\n⛔  No mother session — cannot continue. Fix the failure above first.');
    printSummary();
    return;
  }

  // ── SUITE: Household ──────────────────────────────────────────────────────
  suite('Household — create');

  const generatedCode = Math.random().toString(36).toUpperCase().slice(2, 8);
  {
    const { data, error } = await motherClient
      .from('households')
      .insert({ invite_code: generatedCode, stage: 'pregnant' })
      .select()
      .single();
    if (error) { fail('INSERT households', error); }
    else       { householdId = data.id; inviteCode = data.invite_code; pass('INSERT households'); }
  }

  if (!householdId) {
    console.log('\n⛔  No household — cannot continue.');
    printSummary();
    return;
  }

  // ── SUITE: Users - Mother ─────────────────────────────────────────────────
  suite('Users — insert mother row');

  {
    const { error } = await motherClient
      .from('users')
      .insert({ id: motherUserId, household_id: householdId, role: 'mother' });
    if (error) fail('INSERT users (mother)', error);
    else       pass('INSERT users (mother)');
  }

  {
    const { data, error } = await motherClient
      .from('households')
      .select('*')
      .eq('id', householdId)
      .single();
    if (error) fail('SELECT households (RLS — mother)', error);
    else       pass('SELECT households (RLS — mother)');
  }

  {
    const { data, error } = await motherClient
      .from('users')
      .select('*')
      .eq('household_id', householdId);
    if (error)            fail('SELECT users (RLS — mother)', error);
    else if (!data.length) fail('SELECT users — row count', 'Expected ≥1 row');
    else                   pass('SELECT users (RLS — mother)');
  }

  // ── SUITE: Auth - Partner ─────────────────────────────────────────────────
  suite('Auth — Partner signup');

  {
    const { data, error } = await partnerClient.auth.signUp({ email: EMAIL_PARTNER, password: PASSWORD });
    if (error)             fail('signUp() partner', error);
    else if (!data.session) fail('signUp() partner → session', 'data.session is null');
    else                   { partnerUserId = data.user.id; pass('signUp() partner returns active session'); }
  }

  if (!partnerUserId) {
    skip('Partner join + data ops', 'Partner auth failed');
  } else {
    // ── SUITE: Partner join ───────────────────────────────────────────────
    suite('Household — partner join via invite code');

    {
      const { data, error } = await partnerClient.rpc('join_household_by_code', { code: inviteCode });
      if (error) fail('RPC join_household_by_code', error);
      else       pass('RPC join_household_by_code');
    }

    {
      const { error } = await partnerClient
        .from('users')
        .insert({ id: partnerUserId, household_id: householdId, role: 'partner' });
      if (error) fail('INSERT users (partner)', error);
      else       pass('INSERT users (partner)');
    }

    {
      const { data, error } = await partnerClient
        .from('households')
        .select('*')
        .eq('id', householdId)
        .single();
      if (error) fail('SELECT households (RLS — partner)', error);
      else       pass('SELECT households (RLS — partner)');
    }

    {
      const { data, error } = await partnerClient
        .from('users')
        .select('*')
        .eq('household_id', householdId);
      if (error)           fail('SELECT users (RLS — partner sees both)', error);
      else if (data.length !== 2) fail('SELECT users — count', `Expected 2, got ${data.length}`);
      else                 pass('SELECT users (RLS — partner sees both)');
    }
  }

  // ── SUITE: Data ops ───────────────────────────────────────────────────────
  suite('Data operations');

  let todoId = null;
  {
    const { data, error } = await motherClient
      .from('todos')
      .insert({ household_id: householdId, created_by: motherUserId, title: 'E2E test task', priority: 'medium', source: 'manual', is_done: false })
      .select()
      .single();
    if (error) fail('INSERT todos', error);
    else       { todoId = data.id; pass('INSERT todos'); }
  }

  if (todoId) {
    const { data, error } = await motherClient
      .from('todos').select('*').eq('household_id', householdId);
    if (error)           fail('SELECT todos', error);
    else if (!data.length) fail('SELECT todos — count', 'Expected ≥1');
    else                   pass('SELECT todos');

    const { error: upErr } = await motherClient
      .from('todos').update({ is_done: true }).eq('id', todoId);
    if (upErr) fail('UPDATE todos (toggle done)', upErr);
    else       pass('UPDATE todos (toggle done)');
  }

  {
    const { error } = await motherClient
      .from('appointments')
      .insert({ household_id: householdId, title: 'E2E appointment', appointment_date: '2026-09-01T09:00:00' });
    if (error) fail('INSERT appointments', error);
    else       pass('INSERT appointments');
  }

  {
    const { data, error } = await motherClient
      .from('appointments').select('*').eq('household_id', householdId);
    if (error) fail('SELECT appointments', error);
    else       pass('SELECT appointments');
  }

  {
    const { error } = await motherClient
      .from('health_logs')
      .insert({ household_id: householdId, user_id: motherUserId, mood: 'good', energy_level: 4 });
    if (error) fail('INSERT health_logs', error);
    else       pass('INSERT health_logs');
  }

  {
    const { data, error } = await motherClient
      .from('health_logs').select('*').eq('household_id', householdId);
    if (error) fail('SELECT health_logs', error);
    else       pass('SELECT health_logs');
  }

  {
    const now = new Date().toISOString();
    const { error } = await motherClient
      .from('kick_sessions')
      .insert({ household_id: householdId, started_at: now, ended_at: now, kick_count: 5, duration_secs: 300 });
    if (error) fail('INSERT kick_sessions', error);
    else       pass('INSERT kick_sessions');
  }

  {
    const now = new Date().toISOString();
    const { error } = await motherClient
      .from('contraction_sessions')
      .insert({ household_id: householdId, started_at: now, contractions: [] });
    if (error) fail('INSERT contraction_sessions', error);
    else       pass('INSERT contraction_sessions');
  }

  // ── SUITE: Cleanup ────────────────────────────────────────────────────────
  suite('Cleanup');

  {
    const { error } = await motherClient
      .from('households').delete().eq('id', householdId);
    if (error) fail('DELETE households (cascade cleanup)', error);
    else       pass('DELETE households (cascade cleanup)');
  }

  printSummary();
}

function printSummary() {
  console.log('\n' + '═'.repeat(55));
  console.log(`RESULTS  ${passed} passed   ${failed} failed`);
  if (failures.length) {
    console.log('\nFAILURE SUMMARY (for automated fix agent):');
    for (const f of failures) {
      console.log(`  [${f.suite}] ${f.name}: ${f.msg}`);
    }
    console.log('\nEXIT_STATUS: FAIL');
    process.exit(1);
  } else {
    console.log('\nEXIT_STATUS: PASS');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('FATAL UNHANDLED ERROR:', err);
  process.exit(1);
});
