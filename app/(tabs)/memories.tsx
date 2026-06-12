import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity,
  StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useHousehold } from '../../hooks/useHousehold';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { colors, fonts, radii, spacing } from '../../constants/theme';
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

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useRealtimeSync<Record<string, unknown>>({
    table: 'journal_entries', householdId: household?.id ?? null,
    onInsert: (p) => setEntries(prev => [p as unknown as JournalEntry, ...prev].slice(0, 20)),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchEntries(); setRefreshing(false);
  }, [fetchEntries]);

  const milestones = entries.filter(e => e.milestone_tag);

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
            onPress={() => Alert.alert('Coming soon', 'Compose a journal entry — landing in the next phase.')}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        }
      />

      {/* Milestone strip */}
      {milestones.length > 0 && (
        <View style={styles.milestoneSection}>
          <Text style={styles.sectionLabel}>Milestones</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.milestoneStrip}>
            {milestones.map(m => (
              <View key={m.id} style={styles.milestoneCard}>
                <Text style={styles.milestoneTag} numberOfLines={1}>{m.milestone_tag}</Text>
                <Text style={styles.milestoneWeek}>Week {m.week_number}</Text>
              </View>
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
            action={{ label: 'Write your first note', onPress: () => Alert.alert('Coming soon', 'Journal compose lands in the next phase.') }}
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
              <Text style={styles.entryContent} numberOfLines={5}>{e.content}</Text>
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
  addBtnText:   { fontFamily: fonts.body.semibold, fontSize: 14, color: colors.surface },
  sectionLabel: { fontFamily: fonts.body.semibold, fontSize: 12, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  muted:        { fontFamily: fonts.body.regular, fontSize: 14, color: colors.textMuted },

  milestoneSection: { gap: spacing.sm },
  milestoneStrip:   { gap: spacing.sm, paddingVertical: spacing.xs },
  milestoneCard:    { backgroundColor: '#F5F0FF', borderRadius: radii.md, padding: spacing.md, minWidth: 140, borderWidth: 1, borderColor: colors.accent },
  milestoneTag:     { fontFamily: fonts.heading.semibold, fontSize: 14, color: colors.primary },
  milestoneWeek:    { fontFamily: fonts.body.regular, fontSize: 11, color: colors.textMuted, marginTop: 2 },

  entriesList:   { gap: spacing.md },
  entryHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  entryDate:     { fontFamily: fonts.body.regular, fontSize: 12, color: colors.textMuted },
  entryMilestone:{ fontFamily: fonts.heading.semibold, fontSize: 15, color: colors.primary, marginBottom: spacing.xs },
  entryContent:  { fontFamily: fonts.body.regular, fontSize: 14, color: colors.text, lineHeight: 22 },

});

