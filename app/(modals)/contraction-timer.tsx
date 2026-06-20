import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../hooks/useHousehold';
import { Button }     from '../../components/ui/Button';
import { ModalSheet } from '../../components/ui/ModalSheet';
import { colors, fonts, spacing } from '../../constants/theme';

const STORAGE_KEY = 'blueberry-contractions';

interface Contraction {
  startedAt:  number;
  endedAt:    number | null;
  duration:   number | null; // seconds
  gap:        number | null; // seconds since previous ended
}

export default function ContractionTimerModal() {
  const { household } = useHousehold();
  const [contractions, setContractions]   = useState<Contraction[]>([]);
  const [sessionStart, setSessionStart]   = useState<number | null>(null);
  const [activeStart,  setActiveStart]    = useState<number | null>(null);
  const [elapsed,      setElapsed]        = useState(0);
  const [saving,       setSaving]         = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw);
        setContractions(saved.contractions ?? []);
        setSessionStart(saved.sessionStart ?? null);
        setActiveStart(saved.activeStart ?? null);
      } catch {}
    });
  }, []);

  useEffect(() => {
    if (activeStart !== null) {
      timer.current = setInterval(() => setElapsed(Date.now() - activeStart), 200);
    } else {
      if (timer.current) clearInterval(timer.current);
      setElapsed(0);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [activeStart]);

  function persist(c: Contraction[], sStart: number | null, aStart: number | null) {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ contractions: c, sessionStart: sStart, activeStart: aStart }));
  }

  function startContraction() {
    const now = Date.now();
    const start = sessionStart ?? now;
    setSessionStart(start);
    setActiveStart(now);
    persist(contractions, start, now);
  }

  function stopContraction() {
    if (activeStart === null) return;
    const now = Date.now();
    const duration = Math.round((now - activeStart) / 1000);
    const prev = contractions[contractions.length - 1];
    const gap = prev?.endedAt !== null && prev?.endedAt !== undefined
      ? Math.round((activeStart - (prev.endedAt as number)) / 1000)
      : null;

    const updated: Contraction = { startedAt: activeStart, endedAt: now, duration, gap };
    const newList = [...contractions, updated];
    setContractions(newList);
    setActiveStart(null);
    persist(newList, sessionStart, null);
    check511(newList);
  }

  function check511(list: Contraction[]) {
    const last5 = list.slice(-5);
    if (last5.length < 5) return;
    const allLong  = last5.every(c => (c.duration ?? 0) >= 60);
    const allClose = last5.slice(1).every(c => (c.gap ?? Infinity) <= 300);
    if (allLong && allClose) {
      Alert.alert(
        '5-1-1 Rule',
        'Contractions are 5 minutes apart, lasting 1 minute, for the past hour. Time to call your provider.',
        [{ text: 'Got it' }]
      );
    }
  }

  async function saveSession() {
    if (!household || contractions.length === 0) return;
    if (activeStart !== null) return; // PS-53: guard against saving while contraction is in progress
    setSaving(true);
    try {
      await supabase.from('contraction_sessions').insert({
        household_id: household.id,
        started_at:   sessionStart ? new Date(sessionStart).toISOString() : new Date().toISOString(),
        contractions: contractions as object[],
      });
      setContractions([]);
      setSessionStart(null);
      setActiveStart(null);
      AsyncStorage.removeItem(STORAGE_KEY);
      Alert.alert('Session saved ✓', `${contractions.length} contractions logged.`);
      router.back();
    } catch {
      Alert.alert('Could not save', 'Your session is saved locally.');
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    Alert.alert('Reset session?', 'All recorded contractions will be cleared.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => {
        setContractions([]); setSessionStart(null); setActiveStart(null);
        AsyncStorage.removeItem(STORAGE_KEY);
      }},
    ]);
  }

  function formatSecs(s: number) {
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  }

  const isActive = activeStart !== null;
  const lastContraction = contractions[contractions.length - 1];

  return (
    <ModalSheet title="Contraction Timer" onClose={() => router.back()} scroll={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Main button */}
        <TouchableOpacity
          style={[styles.mainBtn, isActive && styles.mainBtnActive]}
          onPress={isActive ? stopContraction : startContraction}
          activeOpacity={0.85}
        >
          <Text style={styles.mainBtnEmoji}>{isActive ? '⏹' : '▶'}</Text>
          <Text style={[styles.mainBtnLabel, isActive && styles.mainBtnLabelActive]}>{isActive ? 'Stop' : 'Start'}</Text>
          {isActive && <Text style={styles.mainBtnElapsed}>{formatSecs(Math.floor(elapsed / 1000))}</Text>}
        </TouchableOpacity>

        {/* Stats */}
        {contractions.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statVal}>{contractions.length}</Text>
              <Text style={styles.statLabel}>Contractions</Text>
            </View>
            {lastContraction?.duration && (
              <View style={styles.stat}>
                <Text style={styles.statVal}>{formatSecs(lastContraction.duration)}</Text>
                <Text style={styles.statLabel}>Last duration</Text>
              </View>
            )}
            {lastContraction?.gap && (
              <View style={styles.stat}>
                <Text style={styles.statVal}>{formatSecs(lastContraction.gap)}</Text>
                <Text style={styles.statLabel}>Last gap</Text>
              </View>
            )}
          </View>
        )}

        {/* 5-1-1 rule hint */}
        <Text style={styles.hint}>
          Call your provider when contractions are 5 minutes apart, lasting 1 minute, for 1 hour (5-1-1 rule).
        </Text>

        {/* History */}
        {contractions.length > 0 && (
          <View style={styles.history}>
            <Text style={styles.historyTitle}>Session history</Text>
            {[...contractions].reverse().map((c, i) => (
              <View key={i} style={styles.historyRow}>
                <Text style={styles.historyNum}>#{contractions.length - i}</Text>
                <Text style={styles.historyDuration}>{c.duration ? formatSecs(c.duration) : '—'}</Text>
                {c.gap !== null && <Text style={styles.historyGap}>Gap: {formatSecs(c.gap)}</Text>}
                <Text style={styles.historyTime}>{new Date(c.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            ))}
          </View>
        )}

        {contractions.length > 0 && (
          <View style={styles.actions}>
            <Button label={saving ? 'Saving…' : 'Save session'} onPress={saveSession} loading={saving} disabled={isActive || saving} />
            <Button label="Reset" onPress={reset} variant="ghost" />
          </View>
        )}
      </ScrollView>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  scroll:      { padding: spacing.lg, gap: spacing.lg, paddingBottom: 80, alignItems: 'center' },
  mainBtn:     {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 4,
    shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  mainBtnActive: { backgroundColor: colors.primary },
  mainBtnEmoji:  { fontSize: 32 },
  mainBtnLabel:        { fontFamily: fonts.heading.semibold, fontSize: 20, color: colors.primary },
  mainBtnLabelActive:  { color: colors.surface },
  mainBtnElapsed:{ fontFamily: fonts.heading.bold, fontSize: 28, color: '#FFF' },
  statsRow:    { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center' },
  stat:        { alignItems: 'center', gap: 2 },
  statVal:     { fontFamily: fonts.heading.bold, fontSize: 24, color: colors.primary },
  statLabel:   { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  hint:        { fontFamily: fonts.body.regular, fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  history:     { width: '100%', gap: spacing.sm },
  historyTitle:{ fontFamily: fonts.body.semibold, fontSize: 13, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  historyRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  historyNum:  { fontFamily: fonts.body.semibold, fontSize: 12, color: colors.textMuted, width: 28 },
  historyDuration: { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.text, flex: 1 },
  historyGap:  { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted, flex: 1 },
  historyTime: { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted },
  actions:     { width: '100%', gap: spacing.sm },
});
