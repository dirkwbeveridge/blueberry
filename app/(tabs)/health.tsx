import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text, TouchableOpacity,
    View,
} from 'react-native';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { getPostpartumWeekContent } from '../../constants/postpartumContent';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { getPostpartumWeek } from '../../lib/postpartumWeeks';
import { supabase } from '../../lib/supabase';
import type { HealthLog } from '../../types';

const MOOD_EMOJI: Record<string, string> = {
  great:'😄', good:'🙂', okay:'😐', tired:'😴',
  anxious:'😟', emotional:'🥹', nauseous:'🤢', happy:'😊',
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function HealthScreen() {
  const { household, isPostpartum } = useHousehold();
  const [logs,       setLogs]       = useState<HealthLog[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const postpartumWeek = getPostpartumWeek(household?.baby_dob ?? null);
  const postpartumContent = getPostpartumWeekContent(postpartumWeek);

  const fetchLogs = useCallback(async () => {
    if (!household) return;
    setLoading(true);
    const { data } = await supabase
      .from('health_logs').select('*')
      .eq('household_id', household.id)
      .order('logged_at', { ascending: false })
      .limit(10);
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
    setRefreshing(true); await fetchLogs(); setRefreshing(false);
  }, [fetchLogs]);

  useRealtimeSync<Record<string, unknown>>({
    table: 'health_logs', householdId: household?.id ?? null,
    onInsert: (p) => setLogs(prev => [p as unknown as HealthLog, ...prev].slice(0, 10)),
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <ScreenHeader
        title="Health"
        subtitle={isPostpartum ? 'Recovery, mood, sleep, and energy' : 'Body, energy, mindfulness, sleep'}
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

      {isPostpartum && (
        <Card>
          <Text style={styles.sectionTitle}>Recovery focus · week {postpartumWeek}</Text>
          <View style={styles.focusBlock}>
            <Text style={styles.focusLabel}>Mom recovery</Text>
            <Text style={styles.focusText}>{postpartumContent.momRecovery}</Text>
          </View>
          <View style={styles.focusBlock}>
            <Text style={styles.focusLabel}>Partner support</Text>
            <Text style={styles.focusText}>{postpartumContent.partnerFocus}</Text>
          </View>
          <View style={styles.focusBlock}>
            <Text style={styles.focusLabel}>Baby focus</Text>
            <Text style={styles.focusText}>{postpartumContent.babyFocus}</Text>
          </View>
        </Card>
      )}

      {/* Apple Health placeholder */}
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

      {/* Log history */}
      <Card>
        <Text style={styles.sectionTitle}>{isPostpartum ? 'Recent recovery logs' : 'Recent logs'}</Text>
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
            {logs.map((log, i) => (
              <View key={log.id} style={[styles.logItem, i < logs.length - 1 && styles.logItemBorder]}>
                <View style={styles.logHeader}>
                  <View style={styles.logHeaderLeft}>
                    {log.mood && <Text style={styles.logMoodEmoji}>{MOOD_EMOJI[log.mood] ?? '🙂'}</Text>}
                    {log.energy_level && (
                      <View style={styles.energyDots}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <View key={j} style={[styles.dot, j < log.energy_level! ? styles.dotOn : styles.dotOff]} />
                        ))}
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
                    {log.symptoms.map(s => <Badge key={s} label={s} variant="accent" />)}
                  </View>
                )}
                {log.notes && <Text style={styles.logNotes} numberOfLines={2}>{log.notes}</Text>}
                {log.weight_kg && <Text style={styles.logWeight}>{log.weight_kg} kg</Text>}
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Tools entry */}
      {!isPostpartum && (
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
      )}

      {isPostpartum && (
        <Card>
          <Text style={styles.sectionTitle}>Postpartum tools</Text>
          <TouchableOpacity
            style={styles.toolRow}
            onPress={() => router.push('/(tabs)/baby')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open baby hub"
          >
            <Text style={styles.toolEmoji}>🍼</Text>
            <View style={styles.toolBody}>
              <Text style={styles.toolLabel}>Baby hub</Text>
              <Text style={styles.toolSub}>Feed, sleep, diaper, and milestone tracking</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolRow, styles.toolRowBorder]}
            onPress={() => router.push('/(modals)/add-appointment')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add postpartum appointment"
          >
            <Text style={styles.toolEmoji}>🩺</Text>
            <View style={styles.toolBody}>
              <Text style={styles.toolLabel}>Postpartum check-in</Text>
              <Text style={styles.toolSub}>Capture follow-ups from your next visit</Text>
            </View>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: colors.background },
  scroll:   { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  logBtn:   { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  logBtnText:{ fontFamily: fonts.body.semibold, fontSize: 14, color: colors.surface },

  sectionTitle: { fontFamily: fonts.heading.semibold, fontSize: 17, color: colors.text, marginBottom: spacing.md },
  focusBlock: { gap: 2, marginBottom: spacing.sm },
  focusLabel: { fontFamily: fonts.body.semibold, fontSize: 11, color: colors.primary, letterSpacing: 0.4, textTransform: 'uppercase' },
  focusText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted, lineHeight: 20 },

  // Apple Health placeholder
  appleHealthCard: { borderWidth: 1, borderColor: colors.border },
  appleHealthRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  appleHealthEmoji:{ fontSize: 28 },
  appleHealthBody: { flex: 1, gap: 2 },
  appleHealthTitle:{ fontFamily: fonts.body.semibold, fontSize: 15, color: colors.text },
  appleHealthSub:  { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },

  // Logs
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loadingText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted },
  logList:    { gap: 0 },
  logItem:    { paddingVertical: spacing.md },
  logItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  logHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  logHeaderLeft:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logHeaderRight: { alignItems: 'flex-end' },
  logMoodEmoji: { fontSize: 22 },
  energyDots:  { flexDirection: 'row', gap: 3 },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  dotOn:       { backgroundColor: colors.primary },
  dotOff:      { backgroundColor: colors.border },
  logDate:     { fontFamily: fonts.body.medium, fontSize: 12, color: colors.text },
  logTime:     { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  symptomPills:{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  logNotes:    { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted, fontStyle: 'italic', lineHeight: 18 },
  logWeight:   { fontFamily: fonts.body.medium, fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // Tools
  toolRow:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  toolRowBorder:  { borderTopWidth: 1, borderTopColor: colors.border },
  toolEmoji:      { fontSize: 22, width: 28, textAlign: 'center' },
  toolBody:       { flex: 1, gap: 2 },
  toolLabel:      { fontFamily: fonts.body.semibold, fontSize: 15, color: colors.text },
  toolSub:        { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  chev:           { fontSize: 22, color: colors.textMuted, lineHeight: 22 },
});
