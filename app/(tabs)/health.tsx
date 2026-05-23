import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet,
  RefreshControl, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../hooks/useHousehold';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { colors, fonts, radii, spacing } from '../../constants/theme';
import type { HealthLog } from '../../types';

const KICK_STORAGE_KEY = 'blueberry-kick-session';

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
  const { household, isPregnant } = useHousehold();
  const [logs,      setLogs]      = useState<HealthLog[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);

  // Kick counter state
  const [kickCount,    setKickCount]    = useState(0);
  const [kickStart,    setKickStart]    = useState<number | null>(null);
  const [kickElapsed,  setKickElapsed]  = useState(0);
  const [kickSaving,   setKickSaving]   = useState(false);
  const kickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted kick session
  useEffect(() => {
    AsyncStorage.getItem(KICK_STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const { count, startedAt } = JSON.parse(raw);
          setKickCount(count ?? 0);
          setKickStart(startedAt ?? null);
        } catch {}
      }
    });
  }, []);

  // Kick timer
  useEffect(() => {
    if (kickStart !== null) {
      kickTimer.current = setInterval(() => setKickElapsed(Date.now() - kickStart), 500);
    } else {
      if (kickTimer.current) clearInterval(kickTimer.current);
      setKickElapsed(0);
    }
    return () => { if (kickTimer.current) clearInterval(kickTimer.current); };
  }, [kickStart]);

  function persistKicks(count: number, startedAt: number | null) {
    AsyncStorage.setItem(KICK_STORAGE_KEY, JSON.stringify({ count, startedAt }));
  }

  function startKickSession() {
    const now = Date.now();
    setKickStart(now);
    setKickCount(0);
    persistKicks(0, now);
  }

  function recordKick() {
    if (kickStart === null) startKickSession();
    const newCount = kickCount + 1;
    setKickCount(newCount);
    persistKicks(newCount, kickStart ?? Date.now());
  }

  async function finishKickSession() {
    if (!household || kickStart === null) return;
    setKickSaving(true);
    try {
      const duration = Math.round((Date.now() - kickStart) / 1000);
      await supabase.from('kick_sessions').insert({
        household_id:  household.id,
        started_at:    new Date(kickStart).toISOString(),
        ended_at:      new Date().toISOString(),
        kick_count:    kickCount,
        duration_secs: duration,
      });
      setKickCount(0);
      setKickStart(null);
      AsyncStorage.removeItem(KICK_STORAGE_KEY);
      Alert.alert('Session saved ✓', `${kickCount} kicks logged.`);
    } catch {
      Alert.alert('Could not save', 'Saved locally — will sync when connected.');
    } finally {
      setKickSaving(false);
    }
  }

  function formatElapsed(ms: number) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  }

  // Health logs
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
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  }, [fetchLogs]);

  useRealtimeSync<Record<string, unknown>>({
    table: 'health_logs', householdId: household?.id ?? null,
    onInsert: (p) => setLogs(prev => [p as unknown as HealthLog, ...prev].slice(0, 10)),
  });

  const isActive = kickStart !== null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Health</Text>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => router.push('/(modals)/log-symptom')}
          activeOpacity={0.8}
        >
          <Text style={styles.logBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      {/* Kick counter */}
      {isPregnant && (
        <Card style={styles.kickCard}>
          <Text style={styles.sectionTitle}>Kick Counter</Text>
          <View style={styles.kickMain}>
            <TouchableOpacity
              style={[styles.kickBtn, isActive && styles.kickBtnActive]}
              onPress={recordKick}
              activeOpacity={0.7}
            >
              <Text style={styles.kickBtnEmoji}>👟</Text>
              <Text style={styles.kickBtnCount}>{kickCount}</Text>
              <Text style={styles.kickBtnLabel}>{isActive ? 'Tap to count' : 'Start counting'}</Text>
            </TouchableOpacity>
            <View style={styles.kickInfo}>
              {isActive && (
                <>
                  <Text style={styles.kickStatLabel}>Session time</Text>
                  <Text style={styles.kickStatValue}>{formatElapsed(kickElapsed)}</Text>
                </>
              )}
              {!isActive && kickCount === 0 && (
                <Text style={styles.kickHint}>
                  Count kicks for 2 hours, or until you reach 10. Aim for at least 10 kicks per session.
                </Text>
              )}
              {kickCount >= 10 && (
                <View style={styles.kickGoal}>
                  <Text style={styles.kickGoalText}>🎉 10 kicks reached</Text>
                </View>
              )}
            </View>
          </View>
          {isActive && (
            <Button
              label={kickSaving ? 'Saving…' : 'Finish session'}
              onPress={finishKickSession}
              variant="secondary"
              loading={kickSaving}
              style={styles.kickFinish}
            />
          )}
        </Card>
      )}

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
                        {Array.from({length:5}).map((_,j) => (
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
                {log.notes && (
                  <Text style={styles.logNotes} numberOfLines={2}>{log.notes}</Text>
                )}
                {log.weight_kg && (
                  <Text style={styles.logWeight}>{log.weight_kg} kg</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: colors.background },
  scroll:   { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  headerTitle: { fontFamily: fonts.heading.bold, fontSize: 26, color: colors.text },
  logBtn:   { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 16, paddingVertical: 8 },
  logBtnText:{ fontFamily: fonts.body.semibold, fontSize: 14, color: '#FFFFFF' },
  sectionTitle: { fontFamily: fonts.heading.semibold, fontSize: 17, color: colors.text, marginBottom: spacing.md },
  // Kick counter
  kickCard: { backgroundColor: '#F5F0FF' },
  kickMain: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  kickBtn:  { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 2, shadowColor: colors.primary, shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width:0, height:4 }, elevation: 4 },
  kickBtnActive: { backgroundColor: colors.primary },
  kickBtnEmoji: { fontSize: 24 },
  kickBtnCount: { fontFamily: fonts.heading.bold, fontSize: 24, color: colors.primary },
  kickBtnLabel: { fontFamily: fonts.body.regular, fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  kickInfo: { flex: 1, gap: spacing.xs },
  kickStatLabel: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  kickStatValue: { fontFamily: fonts.heading.semibold, fontSize: 20, color: colors.primary },
  kickHint: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  kickGoal: { backgroundColor: '#E8F8ED', borderRadius: radii.md, padding: spacing.sm },
  kickGoalText: { fontFamily: fonts.body.semibold, fontSize: 13, color: colors.success },
  kickFinish: { marginTop: spacing.md },
  // Logs
  loadingText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted },
  empty:    { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  emptyEmoji: { fontSize: 28 },
  emptyText: { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted },
  emptyLink: { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.primary },
  logList:  { gap: 0 },
  logItem:  { paddingVertical: spacing.md },
  logItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  logHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  logHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logHeaderRight:{ alignItems: 'flex-end' },
  logMoodEmoji: { fontSize: 22 },
  energyDots: { flexDirection: 'row', gap: 3 },
  dot:       { width: 7, height: 7, borderRadius: 4 },
  dotOn:     { backgroundColor: colors.primary },
  dotOff:    { backgroundColor: colors.border },
  logDate:   { fontFamily: fonts.body.medium, fontSize: 12, color: colors.text },
  logTime:   { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  symptomPills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  logNotes:  { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted, fontStyle: 'italic', lineHeight: 18 },
  logWeight: { fontFamily: fonts.body.medium, fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
