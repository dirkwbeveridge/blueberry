import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useHouseholdStore } from '../../store/household';
import { Button } from '../../components/ui/Button';
import { Input }  from '../../components/ui/Input';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import type { BabyGender, Stage, UserRole } from '../../types';

type Step = 'credentials' | 'role' | 'household' | 'setup';
type AuthMode = 'signin' | 'signup';

function generateInviteCode() {
  return Math.random().toString(36).toUpperCase().slice(2, 8);
}

function defaultDueDate(): string {
  // 40 weeks (280 days) from today — sane default the user can edit.
  const d = new Date();
  d.setDate(d.getDate() + 280);
  return d.toISOString().slice(0, 10);
}

export default function LoginScreen() {
  const { setHousehold, setCurrentUser, setPartnerUser } = useHouseholdStore();

  const [step,      setStep]      = useState<Step>('credentials');
  const [authMode,  setAuthMode]  = useState<AuthMode>('signin');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [role,      setRole]      = useState<UserRole>('mother');
  const [joinCode,  setJoinCode]  = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [stage,     setStage]     = useState<Stage>('pregnant');
  const [dueDate,   setDueDate]   = useState(defaultDueDate());
  const [babyName,  setBabyName]  = useState('');
  const [babyGender,setBabyGender]= useState<BabyGender>('unknown');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [userId,    setUserId]    = useState('');

  async function handleCredentials() {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Email and password required.'); return; }
    setLoading(true);
    try {
      if (authMode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setUserId(data.user?.id ?? '');
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        setUserId(data.user?.id ?? '');
        // Check if user row exists
        const { data: existingUser } = await supabase.from('users').select('*').eq('id', data.user.id).maybeSingle();
        if (existingUser) {
          setCurrentUser(existingUser);
          const { data: hh } = await supabase.from('households').select('*').eq('id', existingUser.household_id).single();
          if (hh) setHousehold(hh);
          const { data: partner } = await supabase.from('users').select('*').eq('household_id', existingUser.household_id).neq('id', data.user.id).maybeSingle();
          if (partner) setPartnerUser(partner);
          return; // Root layout will redirect
        }
      }
      setStep('role');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleHousehold() {
    setError('');
    setLoading(true);
    try {
      if (isJoining) {
        // Pre-membership reads of `households` are blocked by RLS — we have to
        // go through the security-definer RPC to look up the household by code
        // and enforce the 2-user cap. After the RPC succeeds, the users insert
        // is policy-allowed and we can re-read the row normally.
        const { data: hhId, error: rpcErr } = await supabase.rpc('join_household_by_code', {
          code: joinCode.trim(),
        });
        if (rpcErr || !hhId) {
          const msg = rpcErr?.message ?? '';
          setError(
            msg.includes('household_full')      ? 'Household already has two members.'
          : msg.includes('invalid_invite_code') ? 'Invite code not found.'
          : msg.includes('not_authenticated')   ? 'Please sign in again.'
                                                : 'Could not join household.'
          );
          return;
        }
        const householdId = hhId as string;
        // Insert the users row without RETURNING — a post-insert select on the
        // brand-new row can trip the SELECT policy before membership resolves.
        const { error: uErr } = await supabase.from('users').insert({
          id: userId, household_id: householdId, role,
        });
        if (uErr) throw uErr;
        // The users row now exists, so get_my_household_id() resolves and these reads pass RLS.
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        if (user) setCurrentUser(user);
        const { data: hh } = await supabase.from('households').select('*').eq('id', householdId).single();
        if (hh) setHousehold(hh);
        const { data: partner } = await supabase.from('users').select('*').eq('household_id', householdId).neq('id', userId).maybeSingle();
        if (partner) setPartnerUser(partner);
      } else {
        const invite_code = generateInviteCode();
        // Atomic create via security-definer RPC: makes the household AND the
        // creator's users row in one transaction, sidestepping the SELECT-policy
        // chicken-and-egg that breaks a direct insert ... returning.
        const { data: hh, error: hhErr } = await supabase.rpc('create_household', {
          p_role: role, p_invite_code: invite_code,
        });
        if (hhErr || !hh) throw hhErr ?? new Error('Failed to create household');
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        if (user) setCurrentUser(user);
        setHousehold(hh);
        Alert.alert('Your invite code', `Share this with your partner:\n\n${invite_code}`, [{ text: 'Got it' }]);
        setStep('setup');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Something went wrong.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup() {
    setError('');
    setLoading(true);
    try {
      const updates: Record<string, unknown> = { stage };
      if (dueDate) updates.due_date = dueDate;
      if (babyName.trim()) updates.baby_name = babyName.trim();
      updates.baby_gender = babyGender;

      const { data: hh, error: err } = await supabase
        .from('households')
        .update(updates)
        .eq('id', useHouseholdStore.getState().household?.id ?? '')
        .select().single();
      if (err) throw err;
      if (hh) setHousehold(hh);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save setup.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.logo}>🫐</Text>
        <Text style={styles.appName}>Blueberry</Text>
        <Text style={styles.tagline}>Your pregnancy companion</Text>

        {/* ── STEP: CREDENTIALS ── */}
        {step === 'credentials' && (
          <View style={styles.form}>
            <Text style={styles.stepTitle}>{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</Text>
            <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="you@email.com" />
            <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" error={error} />
            <Button label={authMode === 'signup' ? 'Create account' : 'Sign in'} onPress={handleCredentials} loading={loading} />
            <TouchableOpacity onPress={() => { setAuthMode(m => m === 'signup' ? 'signin' : 'signup'); setError(''); }}>
              <Text style={styles.switchAuth}>
                {authMode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP: ROLE ── */}
        {step === 'role' && (
          <View style={styles.form}>
            <Text style={styles.stepTitle}>Who are you?</Text>
            {(['mother', 'partner'] as UserRole[]).map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, role === r && styles.roleBtnSelected]}
                onPress={() => setRole(r)}
                activeOpacity={0.8}
              >
                <Text style={styles.roleEmoji}>{r === 'mother' ? '🤱' : '💙'}</Text>
                <Text style={[styles.roleLabel, role === r && styles.roleLabelSelected]}>
                  {r === 'mother' ? 'The mother' : 'The partner'}
                </Text>
              </TouchableOpacity>
            ))}
            <Button label="Continue" onPress={() => setStep('household')} />
          </View>
        )}

        {/* ── STEP: HOUSEHOLD ── */}
        {step === 'household' && (
          <View style={styles.form}>
            <Text style={styles.stepTitle}>Your household</Text>
            <SegmentedControl
              options={[
                { value: 'create', label: '+ Create new'  },
                { value: 'join',   label: 'Join with code' },
              ]}
              value={isJoining ? 'join' : 'create'}
              onChange={(v) => setIsJoining(v === 'join')}
            />
            {isJoining && (
              <Input label="Invite code" value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" placeholder="BLU3RY" autoCorrect={false} error={error} />
            )}
            {!isJoining && error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button label={isJoining ? 'Join household' : 'Create household'} onPress={handleHousehold} loading={loading} />
          </View>
        )}

        {/* ── STEP: SETUP ── */}
        {step === 'setup' && (
          <View style={styles.form}>
            <Text style={styles.stepTitle}>Set up your journey</Text>
            <Text style={styles.sectionLabel}>Stage</Text>
            <View style={styles.stageRow}>
              {(['ttc', 'pregnant', 'postpartum'] as Stage[]).map(s => (
                <TouchableOpacity key={s} style={[styles.stageBtn, stage === s && styles.stageBtnSelected]} onPress={() => setStage(s)} activeOpacity={0.7}>
                  <Text style={[styles.stageLabel, stage === s && styles.stageLabelSelected]}>
                    {s === 'ttc' ? 'TTC' : s === 'pregnant' ? 'Pregnant' : 'Postpartum'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {stage === 'pregnant' && (
              <Input label="Due date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" autoCorrect={false} />
            )}
            <Input label="Baby's name (optional)" value={babyName} onChangeText={setBabyName} placeholder="Or a nickname for now" />
            <Text style={styles.sectionLabel}>Baby gender</Text>
            <View style={styles.genderRow}>
              {(['unknown', 'male', 'female'] as BabyGender[]).map(g => (
                <TouchableOpacity key={g} style={[styles.genderBtn, babyGender === g && styles.genderBtnSelected]} onPress={() => setBabyGender(g)} activeOpacity={0.7}>
                  <Text style={[styles.genderLabel, babyGender === g && styles.genderLabelSelected]}>
                    {g === 'unknown' ? '🤫 Secret' : g === 'male' ? '💙 Boy' : '💜 Girl'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button label="Finish setup" onPress={handleSetup} loading={loading} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: colors.background },
  scroll:      { flexGrow: 1, alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  logo:        { fontSize: 56, marginTop: spacing.xl },
  appName:     { fontFamily: fonts.heading.bold, fontSize: 32, color: colors.primary },
  tagline:     { fontFamily: fonts.body.regular, fontSize: 15, color: colors.textMuted, marginBottom: spacing.md },
  form:        { width: '100%', gap: spacing.md },
  stepTitle:   { fontFamily: fonts.heading.bold, fontSize: 22, color: colors.text, marginBottom: spacing.xs },
  switchAuth:  { fontFamily: fonts.body.medium, fontSize: 14, color: colors.primary, textAlign: 'center', marginTop: spacing.xs },
  sectionLabel:{ fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text },
  roleBtn:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  roleBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  roleEmoji:   { fontSize: 28 },
  roleLabel:   { fontFamily: fonts.body.semibold, fontSize: 16, color: colors.textMuted },
  roleLabelSelected: { color: colors.primary },
  stageRow:    { flexDirection: 'row', gap: spacing.sm },
  stageBtn:    { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  stageBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  stageLabel:  { fontFamily: fonts.body.medium, fontSize: 12, color: colors.textMuted },
  stageLabelSelected: { color: colors.primary },
  genderRow:   { flexDirection: 'row', gap: spacing.sm },
  genderBtn:   { flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  genderBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  genderLabel: { fontFamily: fonts.body.medium, fontSize: 12, color: colors.textMuted },
  genderLabelSelected: { color: colors.primary },
  errorText:   { fontFamily: fonts.body.regular, fontSize: 12, color: colors.error },
});
