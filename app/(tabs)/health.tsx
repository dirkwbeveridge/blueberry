import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { getPostpartumWeekContent } from '../../constants/postpartumContent';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import {
  getBleedingLabel,
  getRecoveryStatusLabel,
  getSleepQualityLabel,
  parsePostpartumCheckIn,
  serializePostpartumCheckIn,
} from '../../hooks/usePostpartumSync';
import { useHousehold } from '../../hooks/useHousehold';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { getPostpartumWeek } from '../../lib/postpartumWeeks';
import { supabase } from '../../lib/supabase';
import type {
  HealthLog,
  PostpartumBleedingLevel,
  PostpartumCheckInEntry,
  PostpartumRecoveryStatus,
  PostpartumSleepQuality,
} from '../../types';

const MOOD_EMOJI: Record<string, string> = {
  great: '😄',
  good: '🙂',
  okay: '😐',
  tired: '😴',
  anxious: '😟',
  emotional: '🥹',
  nauseous: '🤢',
  happy: '😊',
};

const RECOVERY_OPTIONS: { value: PostpartumRecoveryStatus; label: string }[] = [
  { value: 'steady', label: 'Steady' },
  { value: 'tender', label: 'Tender' },
  { value: 'drained', label: 'Drained' },
  { value: 'overwhelmed', label: 'Overwhelmed' },
];

const BLEEDING_OPTIONS: { value: PostpartumBleedingLevel; label: string }[] = [
  { value: 'lighter', label: 'Lighter' },
  { value: 'same', label: 'Same' },
  { value: 'heavier', label: 'Heavier' },
];

const SLEEP_OPTIONS: { value: PostpartumSleepQuality; label: string }[] = [
  { value: 'broken', label: 'Broken' },
  { value: 'patchy', label: 'Patchy' },
  { value: 'okay', label: 'Okay' },
];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getPostpartumEntries(logs: HealthLog[]): PostpartumCheckInEntry[] {
  const entries: PostpartumCheckInEntry[] = [];
  for (const log of logs) {
    const parsed = parsePostpartumCheckIn(log);
    if (parsed) entries.push(parsed);
  }
  return entries;
}

export default function HealthScreen() {
  const { household, currentUser, isPostpartum, isPartnerRole } = useHousehold();
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<PostpartumRecoveryStatus>('steady');
  const [bleeding, setBleeding] = useState<PostpartumBleedingLevel>('lighter');
  const [sleepQuality, setSleepQuality] = useState<PostpartumSleepQuality>('patchy');
  const [energy, setEnergy] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const fetchLogs = useCallback(async () => {
    if (!household) return;
    setLoading(true);
    const { data } = await supabase
      .from('health_logs')
      .select('*')
      .eq('household_id', household.id)
      .order('logged_at', { ascending: false })
      .limit(20);
    setLogs(data ?? []);
    setLoading(false);
  }, [household]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  }, [fetchLogs]);

  useRealtimeSync<Record<string, unknown>>({
    table: 'health_logs',
    householdId: household?.id ?? null,
    onInsert: (payload) => setLogs((prev) => [payload as unknown as HealthLog, ...prev].slice(0, 20)),
  });

  const postpartumEntries = useMemo(() => getPostpartumEntries(logs), [logs]);
  const postpartumWeek = getPostpartumWeek(household?.baby_dob ?? null);
  const postpartumContent = getPostpartumWeekContent(postpartumWeek);

  async function savePostpartumCheckIn() {
    if (!household || !currentUser) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('health_logs').insert({
        household_id: household.id,
        user_id: currentUser.id,
        symptoms: [
          `recovery:${recoveryStatus}`,
          `bleeding:${bleeding}`,
          `sleep:${sleepQuality}`,
        ],
        energy_level: energy,
        notes: serializePostpartumCheckIn({
          recoveryStatus,
          bleeding,
          sleepQuality,
          energyLevel: energy,
          notes: notes.trim(),
        }),
      });

      if (error) throw error;

      setNotes('');
      setEnergy(null);
      setRecoveryStatus('steady');
      setBleeding('lighter');
      setSleepQuality('patchy');
    } catch {
      Alert.alert('Could not save check-in', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (isPartnerRole) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Health" subtitle="Private recovery notes" />
        <Card>
          <EmptyState
            emoji="🔒"
            title="Mom's recovery notes stay private."
            body="Use Together and Baby for shared Family Mode coordination."
            action={{ label: 'Open Together →', onPress: () => router.push('/(tabs)/together') }}
          />
        </Card>
      </ScrollView>
    );
  }

  if (isPostpartum) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Health" subtitle={`Week ${postpartumWeek} postpartum`} />

        <Card style={styles.recoveryCard}>
          <Text style={styles.sectionTitle}>This week for recovery</Text>
          <Text style={styles.recoveryBody}>{postpartumContent.momRecovery}</Text>
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Recovery check-in</Text>
          <Text style={styles.fieldLabel}>How does your body feel?</Text>
          <SegmentedControl
            value={recoveryStatus}
            onChange={(value) => setRecoveryStatus(value as PostpartumRecoveryStatus)}
            options={RECOVERY_OPTIONS}
          />

          <Text style={styles.fieldLabel}>Bleeding trend</Text>
          <SegmentedControl
            value={bleeding}
            onChange={(value) => setBleeding(value as PostpartumBleedingLevel)}
            options={BLEEDING_OPTIONS}
          />

          <Text style={styles.fieldLabel}>Sleep quality</Text>
          <SegmentedControl
            value={sleepQuality}
            onChange={(value) => setSleepQuality(value as PostpartumSleepQuality)}
            options={SLEEP_OPTIONS}
          />

          <Text style={styles.fieldLabel}>Energy today</Text>
          <View style={styles.energyRow}>
            {[1, 2, 3, 4, 5].map((value) => {
              const selected = energy === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.energyBtn, selected && styles.energyBtnSelected]}
                  onPress={() => setEnergy(selected ? null : value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.energyNum, selected && styles.energyNumSelected]}>{value}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Pain, mood, questions for your provider, or what support you need next."
            multiline
            numberOfLines={4}
          />

          <Button
            label={saving ? 'Saving...' : 'Save check-in'}
            loading={saving}
            onPress={savePostpartumCheckIn}
          />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Recent check-ins</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading…</Text>
            </View>
          ) : postpartumEntries.length === 0 ? (
            <EmptyState
              emoji="💜"
              title="No recovery check-ins yet."
              body="Your next check-in will build a postpartum timeline here."
            />
          ) : (
            <View style={styles.logList}>
              {postpartumEntries.map((entry, index) => (
                <View key={entry.id} style={[styles.logItem, index < postpartumEntries.length - 1 && styles.logItemBorder]}>
                  <View style={styles.logHeader}>
                    <View>
                      <Text style={styles.logDate}>{formatDate(entry.logged_at)}</Text>
                      <Text style={styles.logTime}>{formatTime(entry.logged_at)}</Text>
                    </View>
                    {entry.energyLevel ? (
                      <View style={styles.energyDots}>
                        {Array.from({ length: 5 }).map((_, dotIndex) => {
                          const energyLevel = entry.energyLevel ?? 0;
                          return <View key={dotIndex} style={[styles.dot, dotIndex < energyLevel ? styles.dotOn : styles.dotOff]} />;
                        })}
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.symptomPills}>
                    <Badge label={getRecoveryStatusLabel(entry.recoveryStatus)} variant="accent" />
                    <Badge label={getBleedingLabel(entry.bleeding)} variant="accent" />
                    <Badge label={getSleepQualityLabel(entry.sleepQuality)} variant="accent" />
                  </View>
                  {entry.notes ? <Text style={styles.logNotes}>{entry.notes}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="Health"
        subtitle="Body, energy, mindfulness, sleep"
        action={
          <TouchableOpacity
            style={styles.logBtn}
            onPress={() => router.push('/(modals)/log-symptom')}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.logBtnText}>+ Log</Text>
          </TouchableOpacity>
        }
      />

      <Card style={styles.appleHealthCard}>
        <View style={styles.appleHealthRow}>
          <Text style={styles.appleHealthEmoji}>❤️</Text>
          <View style={styles.appleHealthBody}>
            <Text style={styles.appleHealthTitle}>Apple Health</Text>
            <Text style={styles.appleHealthSub}>Sync activity, sleep, and vitals</Text>
          </View>
          <Badge label="Soon" variant="accent" />
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent logs</Text>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : logs.length === 0 ? (
          <EmptyState
            emoji="💜"
            title="No logs yet."
            action={{ label: 'Log how you are feeling →', onPress: () => router.push('/(modals)/log-symptom') }}
          />
        ) : (
          <View style={styles.logList}>
            {logs.map((log, index) => (
              <View key={log.id} style={[styles.logItem, index < logs.length - 1 && styles.logItemBorder]}>
                <View style={styles.logHeader}>
                  <View style={styles.logHeaderLeft}>
                    {log.mood && <Text style={styles.logMoodEmoji}>{MOOD_EMOJI[log.mood] ?? '🙂'}</Text>}
                    {log.energy_level && (
                      <View style={styles.energyDots}>
                        {Array.from({ length: 5 }).map((_, dotIndex) => {
                          const energyLevel = log.energy_level ?? 0;
                          return <View key={dotIndex} style={[styles.dot, dotIndex < energyLevel ? styles.dotOn : styles.dotOff]} />;
                        })}
                      </View>
                    )}
                  </View>
                  <View style={styles.logHeaderRight}>
                    <Text style={styles.logDate}>{formatDate(log.logged_at)}</Text>
                    <Text style={styles.logTime}>{formatTime(log.logged_at)}</Text>
                  </View>
                </View>
                {log.symptoms && log.symptoms.length > 0 && (
                  <View style={styles.symptomPills}>
                    {log.symptoms.map((symptom) => <Badge key={symptom} label={symptom} variant="accent" />)}
                  </View>
                )}
                {log.notes && <Text style={styles.logNotes} numberOfLines={2}>{log.notes}</Text>}
                {log.weight_kg && <Text style={styles.logWeight}>{log.weight_kg} kg</Text>}
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Tools</Text>
        <TouchableOpacity
          style={styles.toolRow}
          onPress={() => router.push('/(modals)/kick-counter')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open kick counter"
        >
          <Text style={styles.toolEmoji}>👟</Text>
          <View style={styles.toolBody}>
            <Text style={styles.toolLabel}>Kick counter</Text>
            <Text style={styles.toolSub}>Track baby movement</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolRow, styles.toolRowBorder]}
          onPress={() => router.push('/(modals)/contraction-timer')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open contraction timer"
        >
          <Text style={styles.toolEmoji}>⏱️</Text>
          <View style={styles.toolBody}>
            <Text style={styles.toolLabel}>Contraction timer</Text>
            <Text style={styles.toolSub}>Offline, syncs later</Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  logBtn: { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  logBtnText: { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.surface },
  sectionTitle: { fontFamily: fonts.heading.semibold, fontSize: 17, color: colors.text, marginBottom: spacing.md },
  fieldLabel: { fontFamily: fonts.body.semibold, fontSize: 13, color: colors.text, marginBottom: spacing.xs },
  recoveryCard: { gap: spacing.sm },
  recoveryBody: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.text, lineHeight: 21 },
  formCard: { gap: spacing.md },
  appleHealthCard: { borderWidth: 1, borderColor: colors.border },
  appleHealthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  appleHealthEmoji: { fontSize: 28 },
  appleHealthBody: { flex: 1, gap: 2 },
  appleHealthTitle: { fontFamily: fonts.body.semibold, fontSize: 15, color: colors.text },
  appleHealthSub: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loadingText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted },
  logList: { gap: 0 },
  logItem: { paddingVertical: spacing.md },
  logItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  logHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logHeaderRight: { alignItems: 'flex-end' },
  logMoodEmoji: { fontSize: 22 },
  energyDots: { flexDirection: 'row', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOn: { backgroundColor: colors.primary },
  dotOff: { backgroundColor: colors.border },
  logDate: { fontFamily: fonts.body.medium, fontSize: 12, color: colors.text },
  logTime: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  symptomPills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  logNotes: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted, fontStyle: 'italic', lineHeight: 18 },
  logWeight: { fontFamily: fonts.body.medium, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  toolRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  toolEmoji: { fontSize: 22, width: 28, textAlign: 'center' },
  toolBody: { flex: 1, gap: 2 },
  toolLabel: { fontFamily: fonts.body.semibold, fontSize: 15, color: colors.text },
  toolSub: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  chev: { fontSize: 22, color: colors.textMuted, lineHeight: 22 },
  energyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  energyBtn: { width: 44, height: 44, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  energyBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  energyNum: { fontFamily: fonts.body.semibold, fontSize: 16, color: colors.textMuted },
  energyNumSelected: { color: colors.surface },
});
