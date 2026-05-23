import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../hooks/useHousehold';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { colors, fonts, radii, spacing } from '../../constants/theme';
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
  const { household } = useHousehold();
  const [logs,       setLogs]       = useState<HealthLog[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

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
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Health</Text>
          <Text style={styles.headerSub}>Body, energy, mindfulness, sleep</Text>
        </View>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => router.push('/(modals)/log-symptom')}
          activeOpacity={0.8}
        >
          <Text style={styles.logBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

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
        <Text style={styles.sectionTitle}>Recent logs</Text>
        {loading ? (
          <Text style={styles.loadingText}>Loading…</Text>
        ) : logs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>💜</Text>
            <Text style={styles.emptyText}>No logs yet.</Text>
            <TouchableOpacity onPress={() => router.push('/(modals)/log-symptom')}>
              <Text style={styles.emptyLink}>Log how you are feeling →</Text>
            </TouchableOpacity>
          </View>
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
      <Card>
        <Text style={styles.sectionTitle}>Tools</Text>
        <TouchableOpacity
          style={styles.toolRow}
          onPress={() => router.push('/(modals)/kick-counter')}
          activeOpacity={0.7}
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
  screen:   { flex: 1, backgroundColor: colors.background },
  scroll:   { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  headerTitle: { fontFamily: fonts.heading.bold, fontSize: 26, color: colors.text },
  headerSub:   { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  logBtn:   { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 16, paddingVertical: 8 },
  logBtnText:{ fontFamily: fonts.body.semibold, fontSize: 14, color: '#FFFFFF' },

  sectionTitle: { fontFamily: fonts.heading.semibold, fontSize: 17, color: colors.text, marginBottom: spacing.md },

  // Apple Health placeholder
  appleHealthCard: { borderWidth: 1, borderColor: colors.border },
  appleHealthRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  appleHealthEmoji:{ fontSize: 28 },
  appleHealthBody: { flex: 1, gap: 2 },
  appleHealthTitle:{ fontFamily: fonts.body.semibold, fontSize: 15, color: colors.text },
  appleHealthSub:  { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },

  // Logs
  loadingText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted },
  empty:    { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  emptyEmoji: { fontSize: 28 },
  emptyText:  { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted },
  emptyLink:  { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.primary },
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
