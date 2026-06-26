import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ModalSheet } from '../../components/ui/ModalSheet';
import { colors, fonts, spacing, typography } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import { supabase } from '../../lib/supabase';

const STORAGE_KEY = 'blueberry-kick-session';

export default function KickCounterModal() {
  const { household } = useHousehold();
  const [count,    setCount]    = useState(0);
  const [start,    setStart]    = useState<number | null>(null);
  const [elapsed,  setElapsed]  = useState(0);
  const [saving,   setSaving]   = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore session
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const { count: c, startedAt } = JSON.parse(raw);
        setCount(c ?? 0);
        setStart(startedAt ?? null);
      } catch {}
    });
  }, []);

  // Tick
  useEffect(() => {
    if (start !== null) {
      timer.current = setInterval(() => setElapsed(Date.now() - start), 500);
    } else {
      if (timer.current) clearInterval(timer.current);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [start]);

  function persist(c: number, s: number | null) {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ count: c, startedAt: s }));
  }

  function recordKick() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const now = Date.now();
    const startedAt = start ?? now;
    const newCount = count + 1;
    if (start === null) {
      setStart(now);
      setElapsed(0);
    }
    setCount(newCount);
    persist(newCount, startedAt);
  }

  async function finish() {
    if (!household || start === null) return;
    setSaving(true);
    try {
      const duration = Math.round((Date.now() - start) / 1000);
      await supabase.from('kick_sessions').insert({
        household_id:  household.id,
        started_at:    new Date(start).toISOString(),
        ended_at:      new Date().toISOString(),
        kick_count:    count,
        duration_secs: duration,
      });
      AsyncStorage.removeItem(STORAGE_KEY);
      setCount(0);
      setStart(null);
      Alert.alert('Session saved ✓', `${count} kicks logged.`, [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Could not save', 'Saved locally — will sync when connected.');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    Alert.alert('Reset session?', 'Clears the current count.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => {
        setCount(0); setStart(null);
        AsyncStorage.removeItem(STORAGE_KEY);
      }},
    ]);
  }

  function formatElapsed(ms: number) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  }

  const isActive = start !== null;

  return (
    <ModalSheet title="Kick Counter" onClose={() => router.back()} scroll={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.kickBtn, isActive && styles.kickBtnActive]}
          onPress={recordKick}
          activeOpacity={0.7}
        >
          <Text style={styles.kickEmoji}>👟</Text>
          <Text style={[styles.kickCount, isActive && styles.kickCountActive]}>{count}</Text>
          <Text style={[styles.kickLabel, isActive && styles.kickLabelActive]}>
            {isActive ? 'Tap to count' : 'Tap to start'}
          </Text>
        </TouchableOpacity>

        {isActive && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{formatElapsed(elapsed)}</Text>
              <Text style={styles.statLabel}>Session time</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{count}</Text>
              <Text style={styles.statLabel}>Kicks</Text>
            </View>
          </View>
        )}

        {count >= 10 && (
          <Card style={styles.goal}>
            <Text style={styles.goalText}>🎉  10 kicks reached</Text>
          </Card>
        )}

        <Text style={styles.hint}>
          Count for 2 hours, or until you reach 10. Aim for at least 10 kicks per session.
        </Text>

        {(isActive || count > 0) && (
          <View style={styles.actions}>
            <Button
              label={saving ? 'Saving…' : 'Finish session'}
              onPress={finish}
              loading={saving}
              disabled={!isActive || saving}
            />
            <Button label="Reset" onPress={reset} variant="ghost" />
          </View>
        )}
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  scroll:    { padding: spacing.lg, gap: spacing.lg, paddingBottom: 80, alignItems: 'center' },
  kickBtn:   {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 4,
    shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  kickBtnActive: { backgroundColor: colors.primary },
  kickEmoji:    { fontSize: 32 },
  kickCount:    { ...typography.display, fontSize: 48, lineHeight: 52, color: colors.primary },
  kickCountActive: { color: colors.surface },
  kickLabel:    { ...typography.caption, fontSize: 12, color: colors.textMuted },
  kickLabelActive: { color: 'rgba(255,255,255,0.85)' },
  statsRow:  { flexDirection: 'row', gap: spacing.xl, justifyContent: 'center' },
  stat:      { alignItems: 'center', gap: 2 },
  statVal:   { ...typography.heading, fontSize: 22, lineHeight: 28, color: colors.primary },
  statLabel: { ...typography.caption, color: colors.textMuted },
  goal:      { backgroundColor: colors.successTint, borderColor: colors.success, borderWidth: 1, alignSelf: 'stretch' },
  goalText:  { ...typography.label, fontSize: 14, fontFamily: fonts.body.semibold, color: colors.success, textAlign: 'center' },
  hint:      { ...typography.label, color: colors.textMuted, textAlign: 'center', maxWidth: 280 },
  actions:   { width: '100%', gap: spacing.sm },
});
