import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
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
import { colors, fonts, radii, spacing, typography } from '../../constants/theme';
import { useHousehold } from '../../hooks/useHousehold';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { supabase } from '../../lib/supabase';
import type { JournalEntry } from '../../types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MemoriesScreen() {
  const { household, currentWeek } = useHousehold();
  const [entries,    setEntries]    = useState<JournalEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!household) return;
    setLoading(true);
    const { data } = await supabase
      .from('journal_entries').select('*')
      .eq('household_id', household.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setEntries(data ?? []);
    setLoading(false);
  }, [household]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEntries();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchEntries]);

  useRealtimeSync<Record<string, unknown>>({
    table: 'journal_entries', householdId: household?.id ?? null,
    onInsert: (p) => setEntries(prev => [p as unknown as JournalEntry, ...prev].slice(0, 20)),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchEntries(); setRefreshing(false);
  }, [fetchEntries]);

  const milestones = entries.filter(e => e.milestone_tag);

  function openEntry(entry: JournalEntry) {
    const title = entry.milestone_tag ?? `Week ${entry.week_number}`;
    Alert.alert(title, entry.content);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="Memories"
        subtitle="Notes, photos, and milestones"
        action={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/(tabs)/journal' as never)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Open journal"
          >
            <Text style={styles.addBtnText}>Open journal</Text>
          </TouchableOpacity>
        }
      />

      {/* Milestone strip */}
      {milestones.length > 0 && (
        <View style={styles.milestoneSection}>
          <Text style={styles.sectionLabel}>Milestones</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.milestoneStrip}>
            {milestones.map(m => (
              <TouchableOpacity
                key={m.id}
                style={styles.milestoneCard}
                onPress={() => openEntry(m)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`${m.milestone_tag ?? 'Milestone'}, week ${m.week_number}`}
              >
                <Text style={styles.milestoneTag} numberOfLines={1}>{m.milestone_tag}</Text>
                <Text style={styles.milestoneWeek}>Week {m.week_number}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent moments */}
      <Text style={styles.sectionLabel}>Recent moments</Text>
      {loading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState
            emoji="📓"
            title="No memories yet"
            body={`Capture little moments as they happen.${currentWeek > 0 ? ` Week ${currentWeek} is a good place to start.` : ''}`}
            action={{ label: 'Open journal', onPress: () => router.push('/(tabs)/journal' as never) }}
          />
        </Card>
      ) : (
        <View style={styles.entriesList}>
          {entries.map(e => (
            <Card key={e.id}>
              <View style={styles.entryHeader}>
                <Badge label={`Week ${e.week_number}`} variant="accent" />
                <Text style={styles.entryDate}>{formatDate(e.created_at)}</Text>
              </View>
              {e.milestone_tag && (
                <Text style={styles.entryMilestone}>✨ {e.milestone_tag}</Text>
              )}
              <Text style={styles.entryContent}>{e.content}</Text>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.background },
  scroll:       { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  addBtn:       { backgroundColor: colors.primary, borderRadius: radii.full, paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  addBtnText:   { ...typography.label, fontSize: 14, fontFamily: fonts.body.semibold, color: colors.surface },
  sectionLabel: { ...typography.label, fontSize: 12, fontFamily: fonts.body.semibold, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  muted:        { ...typography.body, fontSize: 14, lineHeight: 22, color: colors.textMuted },

  milestoneSection: { gap: spacing.sm },
  milestoneStrip:   { gap: spacing.sm, paddingVertical: spacing.xs },
  milestoneCard:    { backgroundColor: colors.primaryTint, borderRadius: radii.md, padding: spacing.md, minWidth: 140, borderWidth: 1, borderColor: colors.accent },
  milestoneTag:     { ...typography.subheading, fontSize: 14, lineHeight: 20, color: colors.primary },
  milestoneWeek:    { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  entriesList:   { gap: spacing.md },
  entryHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  entryDate:     { ...typography.caption, fontSize: 12, color: colors.textMuted },
  entryMilestone:{ ...typography.subheading, fontSize: 15, lineHeight: 22, color: colors.primary, marginBottom: spacing.xs },
  entryContent:  { ...typography.body, fontSize: 14, lineHeight: 22, color: colors.text },

});
