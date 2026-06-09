import React from 'react';
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../hooks/useHousehold';
import { useHouseholdStore } from '../../store/household';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { colors, fonts, spacing } from '../../constants/theme';

interface Row {
  emoji:      string;
  label:      string;
  sub?:       string;
  onPress?:   () => void;
  rightLabel?: string;
  comingSoon?: boolean;
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <Card>
        {rows.map((r, i) => (
          <TouchableOpacity
            key={r.label}
            style={[styles.row, i < rows.length - 1 && styles.rowBorder]}
            onPress={r.onPress}
            disabled={!r.onPress || r.comingSoon}
            activeOpacity={0.7}
          >
            <Text style={styles.rowEmoji}>{r.emoji}</Text>
            <View style={styles.rowBody}>
              <Text style={[styles.rowLabel, r.comingSoon && styles.rowLabelMuted]}>{r.label}</Text>
              {r.sub && <Text style={styles.rowSub}>{r.sub}</Text>}
            </View>
            {r.comingSoon ? (
              <Badge label="Soon" variant="accent" />
            ) : r.rightLabel ? (
              <Text style={styles.rowRight}>{r.rightLabel}</Text>
            ) : r.onPress ? (
              <Text style={styles.chev}>›</Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </Card>
    </View>
  );
}

export default function MoreScreen() {
  const { household, currentUser, partnerUser, isMotherRole, isPartnerRole, isPregnant } = useHousehold();

  const clearAll = useHouseholdStore((s) => s.clearAll);

  async function signOut() {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        clearAll();
        router.replace('/(auth)/login');
      }},
    ]);
  }

  function copyInviteCode() {
    if (!household?.invite_code) return;
    Alert.alert('Invite code', `Share this with your partner:\n\n${household.invite_code}`, [{ text: 'Got it' }]);
  }

  const tools: Row[] = [];
  if (isPregnant) {
    tools.push({ emoji: '👟', label: 'Kick counter',      sub: 'Track baby movement',     onPress: () => router.push('/(modals)/kick-counter') });
    tools.push({ emoji: '⏱️', label: 'Contraction timer', sub: 'Offline, syncs later',    onPress: () => router.push('/(modals)/contraction-timer') });
  }
  tools.push({ emoji: '📖', label: 'Week by week', sub: 'Pregnancy reference', onPress: () => router.push('/(modals)/week-detail') });

  const displayInitial = (currentUser?.display_name ?? currentUser?.role ?? '?').slice(0, 1).toUpperCase();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      {/* Profile card */}
      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayInitial}</Text>
          </View>
          <View style={styles.profileBody}>
            <Text style={styles.profileName}>{currentUser?.display_name ?? 'No name set'}</Text>
            <Text style={styles.profileRole}>{isMotherRole ? '🤱 Mom' : '💙 Partner'}</Text>
            {partnerUser ? (
              <Text style={styles.profilePartner}>
                With {partnerUser.display_name ?? (isMotherRole ? 'Partner' : 'Mom')}
              </Text>
            ) : (
              <Text style={styles.profilePartnerMissing}>Waiting for partner to join</Text>
            )}
          </View>
        </View>
      </Card>

      {/* Household */}
      <Section title="Household" rows={[
        { emoji: '🔗', label: 'Invite code',  sub: 'Share to add your partner', rightLabel: household?.invite_code ?? '—', onPress: copyInviteCode },
        { emoji: '👶', label: 'Baby details', sub: household?.baby_name ?? 'Name, gender, due date', onPress: () => Alert.alert('Coming soon', 'Edit household details — landing in the next phase.') },
        { emoji: '⚙️', label: 'Household settings', onPress: () => Alert.alert('Coming soon', 'Settings — landing in the next phase.') },
      ]} />

      {/* Tools */}
      <Section title="Tools" rows={tools} />

      {/* Connected services */}
      <Section title="Connected" rows={[
        { emoji: '❤️', label: 'Apple Health',    sub: 'Sync activity, sleep, vitals',         comingSoon: true },
        { emoji: '📅', label: 'Google Calendar', sub: 'Sync appointments to your calendar',    comingSoon: true },
        { emoji: '🔔', label: 'Notifications',   sub: 'Realtime updates from your partner',    comingSoon: true },
      ]} />

      {/* Inactive role tab — symmetric peek. Mom reaches Together here, Partner reaches Health here. */}
      <Section title="Other views" rows={[
        isMotherRole
          ? { emoji: '💙', label: 'Together',  sub: 'Partner support, prompts, household handoff', onPress: () => router.push('/(tabs)/together') }
          : { emoji: '💜', label: 'Health',    sub: 'Symptoms, mood, energy, recent logs',         onPress: () => router.push('/(tabs)/health') },
      ]} />

      {/* Account */}
      <Section title="Account" rows={[
        { emoji: '🔒', label: 'Privacy', onPress: () => Alert.alert('Coming soon') },
        { emoji: '👋', label: 'Sign out', onPress: signOut },
      ]} />

      <Text style={styles.footer}>Blueberry · v1.0.0{isPartnerRole ? '' : ''}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: colors.background },
  scroll:      { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  header:      { marginBottom: spacing.xs },
  headerTitle: { fontFamily: fonts.heading.bold, fontSize: 26, color: colors.text },

  profileCard: { marginBottom: spacing.xs },
  profileRow:  { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar:      { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontFamily: fonts.heading.bold, fontSize: 22, color: '#FFFFFF' },
  profileBody: { flex: 1, gap: 2 },
  profileName: { fontFamily: fonts.heading.semibold, fontSize: 17, color: colors.text },
  profileRole: { fontFamily: fonts.body.medium, fontSize: 13, color: colors.primary },
  profilePartner: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  profilePartnerMissing: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.warning, marginTop: 2 },

  section:      { gap: spacing.sm },
  sectionLabel: { fontFamily: fonts.body.semibold, fontSize: 12, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  row:          { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowBorder:    { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowEmoji:     { fontSize: 22, width: 28, textAlign: 'center' },
  rowBody:      { flex: 1, gap: 2 },
  rowLabel:     { fontFamily: fonts.body.semibold, fontSize: 15, color: colors.text },
  rowLabelMuted:{ color: colors.textMuted },
  rowSub:       { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  rowRight:     { fontFamily: fonts.body.medium, fontSize: 13, color: colors.primary },
  chev:         { fontSize: 22, color: colors.textMuted, lineHeight: 22 },

  footer:       { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg, opacity: 0.6 },
});
