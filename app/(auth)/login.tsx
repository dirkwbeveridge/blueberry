import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView, Platform,
    ScrollView, StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { DateField } from '../../components/ui/DateField';
import { Input } from '../../components/ui/Input';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { useHouseholdStore } from '../../store/household';
import type { BabyGender, Stage, UserRole } from '../../types';

type Step = 'credentials' | 'role' | 'household' | 'setup';
type AuthMode = 'signin' | 'signup';

function generateInviteCode() {
  return Math.random().toString(36).toUpperCase().slice(2, 8);
}

function formatDateIsoLocal(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function LoginScreen() {
  const { setHousehold, setCurrentUser, setPartnerUser } = useHouseholdStore();

  const [step,      setStep]      = useState<Step>('credentials');
  const [authMode,  setAuthMode]  = useState<AuthMode>('signin');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role,      setRole]      = useState<UserRole>('mother');
  const [joinCode,  setJoinCode]  = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [stage,     setStage]     = useState<Stage>('pregnant');
  const [dueDate,   setDueDate]   = useState<Date | null>(null);
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
        // PS-61: Do NOT create anything yet — just advance to setup.
        // All DB writes happen in handleSetup BEFORE setCurrentUser, so the
        // auth gate in _layout.tsx only fires once the household is fully populated.
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
    if (stage === 'pregnant' && !dueDate) {
      setError('Due date is required for the pregnancy stage.');
      return;
    }

    setLoading(true);
    try {
      // PS-61: All household creation happens here, AFTER the setup UI collects
      // stage/due_date/baby info. setCurrentUser is called LAST so the auth gate
      // in _layout.tsx only fires once the household is fully created and populated.

      // Step a: generate invite code
      const invite_code = generateInviteCode();

      // Step b: create_household RPC — creates household + creator's users row atomically
      const { data: hh, error: hhErr } = await supabase.rpc('create_household', {
        p_role: role, p_invite_code: invite_code,
      });
      if (hhErr || !hh) throw hhErr ?? new Error('Failed to create household');

      // Step c: update household with stage/due_date/baby details
      // RLS now resolves because the users row exists after the RPC above.
      const updates: Record<string, unknown> = { stage };
      if (stage === 'pregnant' && dueDate) updates.due_date = formatDateIsoLocal(dueDate);
      if (babyName.trim()) updates.baby_name = babyName.trim();
      updates.baby_gender = babyGender;

      const { data: updatedHh, error: updateErr } = await supabase
        .from('households')
        .update(updates)
        .eq('id', hh.id)
        .select()
        .single();
      if (updateErr) throw updateErr;

      // Step d: read the users row back
      const { data: user } = await supabase
        .from('users').select('*').eq('id', userId).single();

      // Step e: setHousehold first, setCurrentUser LAST — this flips the auth gate
      setHousehold(updatedHh ?? hh);
      if (user) setCurrentUser(user);

      // Step f: show the invite code
      Alert.alert('Your invite code', `Share this with your partner:\n\n${invite_code}`, [{ text: 'Got it' }]);
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
            <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} placeholder="At least 8 characters" error={error} />
            <TouchableOpacity
              style={styles.passwordToggleBtn}
              onPress={() => setShowPassword(v => !v)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              activeOpacity={0.8}
            >
              <Text style={styles.passwordToggleText}>{showPassword ? 'Hide password' : 'Show password'}</Text>
            </TouchableOpacity>
            <Button label={authMode === 'signup' ? 'Create account' : 'Sign in'} onPress={handleCredentials} loading={loading} />
            <TouchableOpacity
              style={styles.switchAuthBtn}
              onPress={() => { setAuthMode(m => m === 'signup' ? 'signin' : 'signup'); setError(''); }}
              accessibilityRole="button"
              accessibilityLabel={authMode === 'signup' ? 'Switch to sign in' : 'Switch to sign up'}
              activeOpacity={0.8}
            >
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
                accessibilityRole="button"
                accessibilityLabel={r === 'mother' ? 'Select mother role' : 'Select partner role'}
              >
                <Text style={styles.roleEmoji}>{r === 'mother' ? '🤱' : '💙'}</Text>
                <Text style={[styles.roleLabel, role === r && styles.roleLabelSelected]}>
                  {r === 'mother' ? 'The mother' : 'The partner'}
                </Text>
                <Text style={styles.roleDescription}>
                  {r === 'mother' ? 'Logs health updates and tracks pregnancy details' : 'Gets support prompts and shared planning tools'}
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
              <Input label="Invite code" value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" placeholder="BLU3RY" autoCorrect={false} />
            )}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
                <TouchableOpacity
                  key={s}
                  style={[styles.stageBtn, stage === s && styles.stageBtnSelected]}
                  onPress={() => setStage(s)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${s === 'ttc' ? 'trying to conceive' : s} stage`}
                >
                  <Text style={[styles.stageLabel, stage === s && styles.stageLabelSelected]}>
                    {s === 'ttc' ? 'TTC' : s === 'pregnant' ? 'Pregnant' : 'Postpartum'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {stage === 'pregnant' && (
              <DateField
                label="Due date"
                value={dueDate}
                onChange={setDueDate}
                placeholder="Select due date"
              />
            )}
            <Input label="Baby's name (optional)" value={babyName} onChangeText={setBabyName} placeholder="Or a nickname for now" />
            <Text style={styles.sectionLabel}>Baby gender</Text>
            <View style={styles.genderRow}>
              {(['unknown', 'male', 'female'] as BabyGender[]).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, babyGender === g && styles.genderBtnSelected]}
                  onPress={() => setBabyGender(g)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${g} baby gender`}
                >
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
  appName:     { ...typography.title, fontSize: 32, lineHeight: 38, color: colors.primary },
  tagline:     { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  form:        { width: '100%', gap: spacing.md },
  stepTitle:   { ...typography.heading, fontSize: 22, color: colors.text, marginBottom: spacing.xs },
  switchAuthBtn: { minHeight: 44, justifyContent: 'center' },
  switchAuth:  { ...typography.label, fontSize: 14, color: colors.primary, textAlign: 'center', marginTop: spacing.xs },
  passwordToggleBtn: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-end' },
  passwordToggleText: { ...typography.label, color: colors.primary },
  sectionLabel:{ ...typography.label, fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text },
  roleBtn:     { flexDirection: 'row', minHeight: 48, alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  roleBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  roleEmoji:   { fontSize: 28 },
  roleLabel:   { ...typography.body, fontFamily: fonts.body.semibold, fontSize: 16, color: colors.textMuted },
  roleLabelSelected: { color: colors.primary },
  roleDescription: { ...typography.caption, fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 2 },
  stageRow:    { flexDirection: 'row', gap: spacing.sm },
  stageBtn:    { flex: 1, minHeight: 48, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stageBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  stageLabel:  { ...typography.label, fontSize: 12, color: colors.textMuted },
  stageLabelSelected: { color: colors.primary },
  genderRow:   { flexDirection: 'row', gap: spacing.sm },
  genderBtn:   { flex: 1, minHeight: 48, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  genderBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  genderLabel: { ...typography.label, fontSize: 12, color: colors.textMuted },
  genderLabelSelected: { color: colors.primary },
  errorText:   { ...typography.caption, fontSize: 12, color: colors.error },
});
