#!/usr/bin/env node

/**
 * Structured simulator-style multi-couple tests for Blueberry.
 *
 * This script simulates Mom + Partner personas working together across all tab
 * flows by exercising the exact backend contracts used by the UI:
 * - Home (todos + latest health log visibility rules)
 * - Health (mom-only logging + partner readability)
 * - To Do (todos + appointments, shared mutation)
 * - Journal (shared entries)
 * - Memories (journal read model + milestone projection)
 * - Together (partner-focused read model)
 * - More (household settings + stage transitions)
 * - Baby (postpartum mode + baby_logs tracker flows)
 *
 * Usage:
 *   node scripts/test-simulator-couples.mjs
 *
 * Reads env from .env.local:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

function loadEnv() {
  try {
    const lines = readFileSync('.env.local', 'utf-8').split(/\r?\n/);
    const vars = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
      }
    }
    return vars;
  } catch {
    console.error('ERROR: Cannot read .env.local');
    process.exit(1);
  }
}

const env = loadEnv();
const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY missing in .env.local');
  process.exit(1);
}

const RUN = Date.now();
const PASSWORD = 'BlueberryTest123!';

const COUPLE_BLUEPRINTS = [
  {
    slug: 'aurora',
    momName: 'Aurora',
    partnerName: 'Milo',
    dueDate: '2026-11-12',
    todos: ['Pack hospital bag', 'Book prenatal yoga', 'Install car seat'],
    appointmentTitle: 'Growth scan',
    healthMood: 'good',
    healthEnergy: 4,
    journal: 'Felt consistent kicks after dinner.',
    milestone: 'First clear kicks seen',
  },
  {
    slug: 'beacon',
    momName: 'Nora',
    partnerName: 'Eli',
    dueDate: '2026-10-01',
    todos: ['Finalize pediatric shortlist', 'Prepare birth preferences', 'Buy swaddles'],
    appointmentTitle: 'OB check-in',
    healthMood: 'tired',
    healthEnergy: 2,
    journal: 'Energy dipped in afternoon, rested and recovered.',
    milestone: 'Birth plan draft complete',
  },
  {
    slug: 'cedar',
    momName: 'Lena',
    partnerName: 'Arlo',
    dueDate: '2026-09-07',
    todos: ['Freeze meals', 'Confirm doula schedule', 'Set up bassinet'],
    appointmentTitle: 'Third trimester consult',
    healthMood: 'anxious',
    healthEnergy: 3,
    journal: 'Partner took over chores and reduced stress.',
    milestone: 'Nursery setup finished',
  },
];

let passed = 0;
let failed = 0;
const findings = [];

function ok(scope, label) {
  passed++;
  console.log(`  ✅ PASS  [${scope}] ${label}`);
}

function bad(scope, label, err) {
  failed++;
  const msg = err?.message ?? err?.error_description ?? JSON.stringify(err) ?? String(err);
  findings.push({ scope, label, msg });
  console.log(`  ❌ FAIL  [${scope}] ${label}`);
  console.log(`           ${msg}`);
}

function section(title) {
  console.log(`\n📋 ${title}`);
}

function mkClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

async function signUpPersona(email) {
  const client = mkClient();
  const { data, error } = await client.auth.signUp({ email, password: PASSWORD });
  if (error) throw error;
  if (!data.session || !data.user) {
    throw new Error('Missing active session. Ensure Email confirmation is disabled for test project.');
  }
  return { client, userId: data.user.id };
}

async function expectNoError(scope, label, promiseFactory) {
  try {
    const result = await promiseFactory();
    ok(scope, label);
    return result;
  } catch (err) {
    bad(scope, label, err);
    return null;
  }
}

async function runCouple(index, blueprint) {
  const scope = `Couple-${index + 1}:${blueprint.slug}`;
  section(`${scope} — Mom + Partner simulation`);

  const momEmail = `sim-mom-${blueprint.slug}-${RUN}@blueberry.dev`;
  const partnerEmail = `sim-partner-${blueprint.slug}-${RUN}@blueberry.dev`;

  const momAuth = await expectNoError(scope, 'Mom signup', () => signUpPersona(momEmail));
  if (!momAuth) return;
  const mom = momAuth.client;
  const momUserId = momAuth.userId;

  // Create household atomically for mom.
  const inviteSeed = Math.random().toString(36).toUpperCase().slice(2, 8);
  const householdResult = await expectNoError(scope, 'RPC create_household', async () => {
    const { data, error } = await mom.rpc('create_household', { p_role: 'mother', p_invite_code: inviteSeed });
    if (error) throw error;
    if (!data?.id) throw new Error('create_household returned no id');
    return data;
  });
  if (!householdResult) return;

  const householdId = householdResult.id;
  const inviteCode = householdResult.invite_code;

  await expectNoError(scope, 'Mom profile update', async () => {
    const { error } = await mom
      .from('users')
      .update({ display_name: blueprint.momName })
      .eq('id', momUserId);
    if (error) throw error;
  });

  await expectNoError(scope, 'Household due date set', async () => {
    const { error } = await mom
      .from('households')
      .update({ due_date: blueprint.dueDate })
      .eq('id', householdId);
    if (error) throw error;
  });

  // Partner flow.
  const partnerAuth = await expectNoError(scope, 'Partner signup', () => signUpPersona(partnerEmail));
  if (!partnerAuth) return;
  const partner = partnerAuth.client;
  const partnerUserId = partnerAuth.userId;

  await expectNoError(scope, 'Partner join household via code', async () => {
    const { error } = await partner.rpc('join_household_by_code', { code: inviteCode });
    if (error) throw error;
  });

  await expectNoError(scope, 'Partner user row insert', async () => {
    const { error } = await partner
      .from('users')
      .insert({ id: partnerUserId, household_id: householdId, role: 'partner', display_name: blueprint.partnerName });
    if (error) throw error;
  });

  // HOME + TODO tab contracts.
  const todoIds = [];
  for (const title of blueprint.todos) {
    const created = await expectNoError(scope, `Mom adds todo: ${title}`, async () => {
      const { data, error } = await mom
        .from('todos')
        .insert({
          household_id: householdId,
          created_by: momUserId,
          title,
          priority: 'medium',
          source: 'manual',
          is_done: false,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    });
    if (created?.id) todoIds.push(created.id);
  }

  await expectNoError(scope, 'Partner reads todos (Home/ToDo shared list)', async () => {
    const { data, error } = await partner
      .from('todos')
      .select('*')
      .eq('household_id', householdId)
      .eq('is_done', false);
    if (error) throw error;
    if ((data ?? []).length < 3) {
      throw new Error(`Expected >=3 open todos, got ${(data ?? []).length}`);
    }
  });

  if (todoIds[0]) {
    await expectNoError(scope, 'Partner completes one todo', async () => {
      const { error } = await partner.from('todos').update({ is_done: true }).eq('id', todoIds[0]);
      if (error) throw error;
    });

    await expectNoError(scope, 'Mom sees completed todo update', async () => {
      const { data, error } = await mom.from('todos').select('is_done').eq('id', todoIds[0]).single();
      if (error) throw error;
      if (!data?.is_done) throw new Error('Todo did not persist completion state');
    });
  }

  // APPOINTMENTS / CALENDAR segment.
  await expectNoError(scope, 'Mom creates appointment', async () => {
    const { error } = await mom.from('appointments').insert({
      household_id: householdId,
      created_by: momUserId,
      title: blueprint.appointmentTitle,
      appointment_date: '2026-09-15T10:00:00',
      location: 'City OB-GYN',
    });
    if (error) throw error;
  });

  await expectNoError(scope, 'Partner reads appointments', async () => {
    const { data, error } = await partner.from('appointments').select('*').eq('household_id', householdId);
    if (error) throw error;
    if ((data ?? []).length < 1) throw new Error('Expected at least one appointment');
  });

  // HEALTH tab contract (mom writes, both can read household feed).
  await expectNoError(scope, 'Mom logs health entry', async () => {
    const { error } = await mom.from('health_logs').insert({
      household_id: householdId,
      user_id: momUserId,
      mood: blueprint.healthMood,
      energy_level: blueprint.healthEnergy,
      symptoms: ['Fatigue'],
      notes: 'Simulator run symptom log',
    });
    if (error) throw error;
  });

  await expectNoError(scope, 'Partner can read health logs (shared household policy)', async () => {
    const { data, error } = await partner.from('health_logs').select('*').eq('household_id', householdId);
    if (error) throw error;
    if ((data ?? []).length < 1) throw new Error('Expected health log visibility for partner');
  });

  // JOURNAL + MEMORIES contracts.
  await expectNoError(scope, 'Mom adds journal entry', async () => {
    const { error } = await mom.from('journal_entries').insert({
      household_id: householdId,
      author_id: momUserId,
      week_number: 28,
      milestone_tag: blueprint.milestone,
      content: blueprint.journal,
    });
    if (error) throw error;
  });

  await expectNoError(scope, 'Partner reads journal entries', async () => {
    const { data, error } = await partner.from('journal_entries').select('*').eq('household_id', householdId);
    if (error) throw error;
    if ((data ?? []).length < 1) throw new Error('Expected at least one journal entry');
  });

  await expectNoError(scope, 'Memories milestone projection query', async () => {
    const { data, error } = await mom
      .from('journal_entries')
      .select('id,milestone_tag,week_number')
      .eq('household_id', householdId)
      .not('milestone_tag', 'is', null);
    if (error) throw error;
    if ((data ?? []).length < 1) throw new Error('Expected milestone-tagged memory');
  });

  // TOGETHER tab support trackers.
  await expectNoError(scope, 'Mom logs kick session', async () => {
    const now = new Date().toISOString();
    const { error } = await mom.from('kick_sessions').insert({
      household_id: householdId,
      started_at: now,
      ended_at: now,
      kick_count: 7,
      duration_secs: 420,
      notes: 'Evening tracking session',
    });
    if (error) throw error;
  });

  await expectNoError(scope, 'Mom logs contraction session', async () => {
    const now = new Date().toISOString();
    const { error } = await mom.from('contraction_sessions').insert({
      household_id: householdId,
      started_at: now,
      contractions: [{ start: now, duration_secs: 42 }],
      notes: 'Practice log',
    });
    if (error) throw error;
  });

  await expectNoError(scope, 'Partner reads together-support trackers', async () => {
    const [kickRes, contractionRes] = await Promise.all([
      partner.from('kick_sessions').select('*').eq('household_id', householdId),
      partner.from('contraction_sessions').select('*').eq('household_id', householdId),
    ]);
    if (kickRes.error) throw kickRes.error;
    if (contractionRes.error) throw contractionRes.error;
    if ((kickRes.data ?? []).length < 1 || (contractionRes.data ?? []).length < 1) {
      throw new Error('Expected partner-readable together trackers');
    }
  });

  // MORE + BABY tab family mode transition and postpartum tracker flows.
  await expectNoError(scope, 'Mom enables Family Mode (postpartum)', async () => {
    const { error } = await mom
      .from('households')
      .update({ baby_dob: '2026-06-10', stage: 'postpartum', baby_name: `${blueprint.slug}-baby` })
      .eq('id', householdId);
    if (error) throw error;
  });

  await expectNoError(scope, 'Both personas read postpartum stage', async () => {
    const [momRes, partnerRes] = await Promise.all([
      mom.from('households').select('stage,baby_dob').eq('id', householdId).single(),
      partner.from('households').select('stage,baby_dob').eq('id', householdId).single(),
    ]);
    if (momRes.error) throw momRes.error;
    if (partnerRes.error) throw partnerRes.error;
    if (momRes.data?.stage !== 'postpartum' || partnerRes.data?.stage !== 'postpartum') {
      throw new Error('Expected postpartum stage for both personas');
    }
  });

  await expectNoError(scope, 'Mom logs baby tracker entries', async () => {
    const rows = [
      {
        household_id: householdId,
        user_id: momUserId,
        log_type: 'feeding',
        details: { method: 'breast', side: 'left', durationMins: 12, amountMl: null },
        notes: 'Good latch',
      },
      {
        household_id: householdId,
        user_id: momUserId,
        log_type: 'sleep',
        details: { sleepType: 'nap', durationMins: 55 },
        notes: 'Crib nap',
      },
      {
        household_id: householdId,
        user_id: partnerUserId,
        log_type: 'diaper',
        details: { diaperType: 'wet', count: 1 },
        notes: 'Partner change',
      },
      {
        household_id: householdId,
        user_id: partnerUserId,
        log_type: 'handoff',
        details: { shiftOwner: 'partner', status: 'handoff' },
        notes: 'Shift passed at 3am',
      },
    ];

    const { error } = await mom.from('baby_logs').insert(rows);
    if (error) throw error;
  });

  await expectNoError(scope, 'Both personas read baby tracker logs', async () => {
    const [momRes, partnerRes] = await Promise.all([
      mom.from('baby_logs').select('*').eq('household_id', householdId),
      partner.from('baby_logs').select('*').eq('household_id', householdId),
    ]);
    if (momRes.error) throw momRes.error;
    if (partnerRes.error) throw partnerRes.error;
    if ((momRes.data ?? []).length < 4 || (partnerRes.data ?? []).length < 4) {
      throw new Error('Expected >=4 baby tracker logs visible to both');
    }
  });

  // Cleanup household for this couple (cascade tables).
  await expectNoError(scope, 'Cleanup household', async () => {
    const { error } = await mom.from('households').delete().eq('id', householdId);
    if (error) throw error;
  });
}

async function runOutsiderIsolationCheck() {
  const scope = 'Global:RLS-Isolation';
  section('Global — outsider isolation across couple data model');

  const outsiderEmail = `sim-outsider-${RUN}@blueberry.dev`;
  const outsiderAuth = await expectNoError(scope, 'Outsider signup', () => signUpPersona(outsiderEmail));
  if (!outsiderAuth) return;
  const outsider = outsiderAuth.client;

  // Generate a household with mom account just to verify outsider cannot read.
  const momAuth = await signUpPersona(`sim-isolation-mom-${RUN}@blueberry.dev`);
  const mom = momAuth.client;
  const momUserId = momAuth.userId;

  let householdId = null;
  try {
    const invite = Math.random().toString(36).toUpperCase().slice(2, 8);
    const { data, error } = await mom.rpc('create_household', { p_role: 'mother', p_invite_code: invite });
    if (error) throw error;
    householdId = data.id;

    await mom.from('todos').insert({
      household_id: householdId,
      created_by: momUserId,
      title: 'isolation check todo',
      priority: 'low',
      source: 'manual',
      is_done: false,
    });

    const tables = ['todos', 'appointments', 'health_logs', 'journal_entries', 'baby_logs'];
    for (const table of tables) {
      await expectNoError(scope, `Outsider blocked from ${table}`, async () => {
        const { data, error } = await outsider.from(table).select('*').eq('household_id', householdId);
        if (error) return; // also acceptable via explicit RLS error
        if ((data ?? []).length > 0) {
          throw new Error(`Outsider saw ${(data ?? []).length} rows in ${table}`);
        }
      });
    }
  } catch (err) {
    bad(scope, 'Isolation setup', err);
  } finally {
    if (householdId) {
      await mom.from('households').delete().eq('id', householdId);
    }
  }
}

async function main() {
  console.log('\nStructured Blueberry Simulator Tests');
  console.log('Couples:', COUPLE_BLUEPRINTS.map((c) => `${c.momName}+${c.partnerName}`).join(', '));

  for (let i = 0; i < COUPLE_BLUEPRINTS.length; i++) {
    await runCouple(i, COUPLE_BLUEPRINTS[i]);
  }

  await runOutsiderIsolationCheck();

  const total = passed + failed;
  console.log('\n' + '═'.repeat(70));
  console.log(`RESULTS  ${passed} passed   ${failed} failed   (${total} assertions)`);

  if (findings.length > 0) {
    console.log('\nFAILURES');
    for (const item of findings) {
      console.log(`- [${item.scope}] ${item.label}: ${item.msg}`);
    }
    process.exit(1);
  }

  console.log('\nEXIT_STATUS: PASS');
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
